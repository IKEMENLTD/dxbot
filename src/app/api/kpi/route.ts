// GET /api/kpi - ファネルKPI取得

import { NextResponse } from 'next/server';
import { getFunnelKpi, getExitMetrics } from '@/lib/queries';

export async function GET(): Promise<NextResponse> {
  try {
    const [funnel, exitMetrics] = await Promise.all([
      getFunnelKpi(),
      getExitMetrics(),
    ]);

    return NextResponse.json({
      data: {
        funnel,
        exitMetrics,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'KPIデータの取得に失敗しました';
    console.error('[API /kpi GET]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
