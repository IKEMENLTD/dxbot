// GET /api/deals - 全成約取得

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getDeals } from '@/lib/queries';

export async function GET(): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const deals = await getDeals();
    return NextResponse.json({ data: deals });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '成約データの取得に失敗しました';
    console.error('[API /deals GET]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
