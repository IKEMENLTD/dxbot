// GET /api/tracking-links/performance - 流入元別パフォーマンス分析

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getTrackingPerformance } from '@/lib/queries';

export async function GET(): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const data = await getTrackingPerformance();
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'パフォーマンスデータの取得に失敗しました';
    console.error('[API /tracking-links/performance GET]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
