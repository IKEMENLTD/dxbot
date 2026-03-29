// ===== POST /api/assessment/company-info =====
// 診断回答に企業情報を後追いで保存する（公開エンドポイント）

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as {
      assessmentId?: unknown;
      companyInfo?: unknown;
    };

    const { assessmentId, companyInfo } = body;

    if (typeof assessmentId !== 'string' || !assessmentId) {
      return NextResponse.json({ error: '診断IDが不正です' }, { status: 400 });
    }

    if (!companyInfo || typeof companyInfo !== 'object') {
      return NextResponse.json({ error: '企業情報が不正です' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ error: 'DB未接続' }, { status: 503 });
    }

    await supabase
      .from('assessment_responses')
      .update({ company_info: companyInfo as { employeeCount: string; role: string; challenges: string[]; painDetail?: string; painAxis?: string; budget?: string; decisionAuthority?: string; email: string; freeText?: string } })
      .eq('id', assessmentId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Assessment CompanyInfo] エラー:', err);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
