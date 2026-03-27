// ===== POST /api/assessment =====
// DXレベル診断フォームの回答を受け取りSupabaseに保存する

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { computePrecisionResult } from '@/lib/precision-interview';
import type { LevelBand } from '@/lib/types';

const INDUSTRIES = [
  '製造業', '建設業', '卸売業・小売業', '飲食・宿泊業', '医療・福祉',
  '情報通信業', '不動産業', '運輸業', '教育・学習支援', 'サービス業（他に分類されないもの）', 'その他',
];

function getLevelBandFromLevel(level: number): LevelBand {
  if (level <= 10) return 'lv_01_10';
  if (level <= 20) return 'lv_11_20';
  if (level <= 30) return 'lv_21_30';
  if (level <= 40) return 'lv_31_40';
  return 'lv_41_50';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as {
      name?: unknown;
      company_name?: unknown;
      industry?: unknown;
      answers?: unknown;
      line_user_id?: unknown;
    };

    const { name, company_name, industry, answers, line_user_id } = body;

    // --- バリデーション ---
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 50) {
      return NextResponse.json({ error: '氏名を正しく入力してください（1〜50文字）' }, { status: 400 });
    }
    if (typeof company_name !== 'string' || company_name.trim().length === 0 || company_name.length > 100) {
      return NextResponse.json({ error: '会社名を正しく入力してください（1〜100文字）' }, { status: 400 });
    }
    if (typeof industry !== 'string' || !INDUSTRIES.includes(industry)) {
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

    // --- サーバーサイドでスコア計算（クライアント値は使用しない） ---
    const result = computePrecisionResult(answers as number[]);
    const levelBand = getLevelBandFromLevel(result.exactLevel);

    // --- Supabase保存 ---
    const supabase = getSupabaseServer();
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
          line_user_id: typeof line_user_id === 'string' ? line_user_id : null,
        });

      if (dbError) {
        console.error('[Assessment API] DB保存エラー:', dbError);
        // DB保存失敗でも結果は返す（ユーザー体験を優先）
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
