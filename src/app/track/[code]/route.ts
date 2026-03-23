// GET /track/[code] - トラッキングリダイレクト（公開エンドポイント）
// 認証不要。クリックカウント+1 → destination_url へ 307 リダイレクト

import { NextRequest, NextResponse } from 'next/server';
import { incrementClickCount } from '@/lib/queries';

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { code } = await context.params;

    if (!code || typeof code !== 'string') {
      return NextResponse.redirect(new URL('/', _request.url), 307);
    }

    const destinationUrl = await incrementClickCount(code);

    if (!destinationUrl) {
      // 無効または存在しないリンクはLPへリダイレクト
      return NextResponse.redirect(new URL('/', _request.url), 307);
    }

    return NextResponse.redirect(destinationUrl, 307);
  } catch (err: unknown) {
    console.error('[track/[code]] リダイレクトエラー:', err instanceof Error ? err.message : err);
    return NextResponse.redirect(new URL('/', _request.url), 307);
  }
}
