// GET  /api/track/[code] - フォールバックリダイレクト（JS無効時用）
// POST /api/track/[code] - クリックデータ受信 + click_count++

import { NextRequest, NextResponse } from 'next/server';
import {
  incrementClickCount,
  getTrackingLinkByCode,
  saveTrackingClick,
} from '@/lib/queries';

interface RouteContext {
  params: Promise<{ code: string }>;
}

/** クリックデータのリクエストボディ型 */
interface ClickDataBody {
  deviceType?: unknown;
  os?: unknown;
  browser?: unknown;
  referer?: unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  utmContent?: unknown;
  language?: unknown;
  country?: unknown;
}

function toStringOrNull(val: unknown): string | null {
  if (typeof val === 'string' && val.length > 0) return val;
  return null;
}

/**
 * GET: JS無効時のフォールバックリダイレクト
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { code } = await context.params;

    if (!code || typeof code !== 'string') {
      return NextResponse.redirect(new URL('/', request.url), 307);
    }

    const destinationUrl = await incrementClickCount(code);

    if (!destinationUrl) {
      return NextResponse.redirect(new URL('/', request.url), 307);
    }

    return NextResponse.redirect(destinationUrl, 307);
  } catch (err: unknown) {
    console.error('[api/track/[code] GET] エラー:', err instanceof Error ? err.message : err);
    return NextResponse.redirect(new URL('/', request.url), 307);
  }
}

/**
 * POST: クリックデータ受信 + click_count インクリメント
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { code } = await context.params;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    // リンクを取得
    const link = await getTrackingLinkByCode(code);
    if (!link) {
      return NextResponse.json({ error: 'link not found' }, { status: 404 });
    }

    // click_count をインクリメント
    await incrementClickCount(code);

    // リクエストボディをパース
    let body: ClickDataBody = {};
    try {
      body = (await request.json()) as ClickDataBody;
    } catch {
      // ボディなしでもOK
    }

    // クリックデータを保存
    await saveTrackingClick({
      trackingLinkId: link.id,
      deviceType: toStringOrNull(body.deviceType),
      os: toStringOrNull(body.os),
      browser: toStringOrNull(body.browser),
      referer: toStringOrNull(body.referer),
      utmSource: toStringOrNull(body.utmSource),
      utmMedium: toStringOrNull(body.utmMedium),
      utmCampaign: toStringOrNull(body.utmCampaign),
      utmContent: toStringOrNull(body.utmContent),
      language: toStringOrNull(body.language),
      country: toStringOrNull(body.country),
    });

    return NextResponse.json({
      ok: true,
      destinationUrl: link.destination_url,
    });
  } catch (err: unknown) {
    console.error('[api/track/[code] POST] エラー:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
