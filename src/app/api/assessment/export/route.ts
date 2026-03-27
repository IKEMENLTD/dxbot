// ===== GET /api/assessment/export =====
// アセスメント回答一覧をCSV形式でダウンロード（管理者認証必須）

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getSupabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/database';

type AssessmentRow = Database['public']['Tables']['assessment_responses']['Row'];

function escapeCsv(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const BAND_LABELS: Record<string, string> = {
  lv_01_10: 'Lv.1-10',
  lv_11_20: 'Lv.11-20',
  lv_21_30: 'Lv.21-30',
  lv_31_40: 'Lv.31-40',
  lv_41_50: 'Lv.41-50',
};

export async function GET(): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'DB未接続' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('assessment_responses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Assessment Export] DBエラー:', error);
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
  }

  const rows = (data ?? []) as AssessmentRow[];

  const header = [
    'ID', '診断日時', '氏名', '会社名', '業種',
    'DXレベル', 'バンド', '合計スコア',
    'A1:売上管理', 'A2:連絡管理', 'B:自動化', 'C:データ経営', 'D:ITツール活用',
    'LINE ID',
  ].join(',');

  const csvRows = rows.map((r) => {
    const rawScores = r.axis_scores;
    const axisScores: { a1: number; a2: number; b: number; c: number; d: number } =
      rawScores !== null && typeof rawScores === 'object' && !Array.isArray(rawScores)
        ? (rawScores as { a1: number; a2: number; b: number; c: number; d: number })
        : { a1: 0, a2: 0, b: 0, c: 0, d: 0 };
    return [
      escapeCsv(r.id),
      escapeCsv(new Date(r.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })),
      escapeCsv(r.name),
      escapeCsv(r.company_name),
      escapeCsv(r.industry),
      escapeCsv(r.exact_level),
      escapeCsv(BAND_LABELS[r.level_band] ?? r.level_band),
      escapeCsv(r.precision_score),
      escapeCsv(axisScores?.a1 ?? ''),
      escapeCsv(axisScores?.a2 ?? ''),
      escapeCsv(axisScores?.b ?? ''),
      escapeCsv(axisScores?.c ?? ''),
      escapeCsv(axisScores?.d ?? ''),
      escapeCsv(r.line_user_id),
    ].join(',');
  });

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const bom = '\uFEFF'; // Excel文字化け防止
  const csv = bom + [header, ...csvRows].join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="assessment_${dateStr}.csv"`,
    },
  });
}
