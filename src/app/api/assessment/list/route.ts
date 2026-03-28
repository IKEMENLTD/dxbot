// ===== GET /api/assessment/list =====
// アセスメント回答一覧を返す（管理者認証必須）

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getSupabaseServer } from '@/lib/supabase';

export async function GET(): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'DB未接続' }, { status: 503 });
  }

  try {
    const { data, error, count } = await supabase
      .from('assessment_responses')
      .select('id, created_at, name, company_name, industry, exact_level, level_band, precision_score, axis_scores, line_user_id', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      // テーブル未作成の場合は空データを返す（migration未適用時のフォールバック）
      const msg = typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: string }).message
        : String(error);
      if (msg.includes('does not exist') || msg.includes('schema cache')) {
        return NextResponse.json({ data: [], total: 0 });
      }
      console.error('[Assessment List] DBエラー:', error);
      return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [], total: count ?? 0 });
  } catch (err) {
    console.error('[Assessment List] エラー:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
