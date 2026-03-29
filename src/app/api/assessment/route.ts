// ===== POST /api/assessment =====
// DXレベル診断フォームの回答を受け取りSupabaseに保存する

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { computePrecisionResult } from '@/lib/precision-interview';
import { getLevelBand } from '@/lib/step-delivery';
import { INDUSTRIES } from '@/lib/assessment-constants';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as {
      name?: unknown;
      company_name?: unknown;
      industry?: unknown;
      answers?: unknown;
      line_user_id?: unknown;
      company_info?: unknown;
    };

    const { name, company_name, industry, answers, line_user_id, company_info } = body;

    // --- バリデーション ---
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 50) {
      return NextResponse.json({ error: '氏名を正しく入力してください（1〜50文字）' }, { status: 400 });
    }
    if (typeof company_name !== 'string' || company_name.trim().length === 0 || company_name.length > 100) {
      return NextResponse.json({ error: '会社名を正しく入力してください（1〜100文字）' }, { status: 400 });
    }
    if (typeof industry !== 'string' || !(INDUSTRIES as readonly string[]).includes(industry)) {
      return NextResponse.json({ error: '業種を選択してください' }, { status: 400 });
    }
    if (!Array.isArray(answers) || answers.length !== 30) {
      return NextResponse.json({ error: '回答データが不正です（30問すべて回答してください）' }, { status: 400 });
    }
    for (const a of answers) {
      if (typeof a !== 'number' || a < 1 || a > 5 || !Number.isInteger(a)) {
        return NextResponse.json({ error: '回答値が不正です（1〜5の整数）' }, { status: 400 });
      }
    }

    // company_info の軽いバリデーション（objectであればOK）
    let validCompanyInfo: { employeeCount: string; role: string; challenges: string[]; email: string } | null = null;
    if (company_info !== null && typeof company_info === 'object' && !Array.isArray(company_info)) {
      const ci = company_info as Record<string, unknown>;
      validCompanyInfo = {
        employeeCount: typeof ci.employeeCount === 'string' ? ci.employeeCount : '',
        role: typeof ci.role === 'string' ? ci.role : '',
        challenges: Array.isArray(ci.challenges) ? (ci.challenges as unknown[]).filter((c): c is string => typeof c === 'string') : [],
        email: typeof ci.email === 'string' ? ci.email : '',
      };
    }

    // --- サーバーサイドでスコア計算（クライアント値は使用しない） ---
    const result = computePrecisionResult(answers as number[]);
    const levelBand = getLevelBand(result.exactLevel);

    // --- Supabase保存 ---
    const supabase = getSupabaseServer();
    const lineUserIdStr = typeof line_user_id === 'string' && line_user_id.length > 0 ? line_user_id : null;

    if (supabase) {
      const { error: dbError } = await supabase
        .from('assessment_responses')
        .insert({
          name: name.trim(),
          company_name: company_name.trim(),
          industry,
          answers: answers as number[],
          axis_scores: result.axisScores,
          precision_score: result.totalScore,
          exact_level: result.exactLevel,
          level_band: levelBand,
          line_user_id: lineUserIdStr,
          company_info: validCompanyInfo,
        });

      if (dbError) {
        console.error('[Assessment API] DB保存エラー:', dbError);
        // DB保存失敗でも結果は返す（ユーザー体験を優先）
      }

      // --- LINE user_id がある場合、usersテーブルとconversation_statesを更新 ---
      if (lineUserIdStr) {
        try {
          // usersテーブルを検索・更新
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('line_user_id', lineUserIdStr)
            .maybeSingle();

          if (existingUser) {
            await supabase
              .from('users')
              .update({
                level: result.exactLevel,
                score: result.totalScore,
                precision_score: result.totalScore,
                level_source: 'precision' as const,
                axis_scores: result.axisScores,
              })
              .eq('id', existingUser.id);
          }

          // conversation_statesのstateをstep_readyに更新
          await supabase
            .from('conversation_states')
            .update({
              state: { step: 'step_ready' },
            })
            .eq('line_user_id', lineUserIdStr);
        } catch (linkErr) {
          console.error('[Assessment API] LINE連携更新エラー:', linkErr);
          // 連携失敗でも結果は返す
        }
      }
    }

    return NextResponse.json({
      ok: true,
      result: {
        exactLevel: result.exactLevel,
        axisScores: result.axisScores,
        totalScore: result.totalScore,
        levelBand,
      },
    });
  } catch (err) {
    console.error('[Assessment API] エラー:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
