// GET  /api/track/[code] - フォールバックリダイレクト（JS無効時用）
// POST /api/track/[code] - クリックデータ受信 + click_count++

import { NextRequest, NextResponse } from 'next/server';
import {
  incrementClickCount,
  getTrackingLinkByCode,
  saveTrackingClick,
} from '@/lib/queries';
import { isBot } from '@/lib/bot-detect';

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
 * クエリパラメータからUTM情報を取得して保存する
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

    // ボット判定: ボットの場合はクリックカウントを増やさずリダイレクトのみ
    const userAgent = request.headers.get('user-agent') ?? '';
    const link = await getTrackingLinkByCode(code);

    if (!link) {
      return NextResponse.redirect(new URL('/', request.url), 307);
    }

    if (isBot(userAgent)) {
      return NextResponse.redirect(link.destination_url, 307);
    }

    // click_count をインクリメント
    await incrementClickCount(code);

    // クエリパラメータからUTM情報を取得
    const url = new URL(request.url);
    const utmSource = url.searchParams.get('utm_source');
    const utmMedium = url.searchParams.get('utm_medium');
    const utmCampaign = url.searchParams.get('utm_campaign');
    const utmContent = url.searchParams.get('utm_content');
    const referer = request.headers.get('referer');

    // UA解析（サーバー側で簡易判定）
    const deviceType = /Mobi|Android.*Mobile|iPhone|iPod/i.test(userAgent)
      ? 'mobile'
      : /Tablet|iPad|Android(?!.*Mobile)/i.test(userAgent)
        ? 'tablet'
        : 'desktop';

    let os = 'unknown';
    if (/iPhone|iPod/i.test(userAgent)) os = 'iOS';
    else if (/iPad/i.test(userAgent)) os = 'iPadOS';
    else if (/Android/i.test(userAgent)) os = 'Android';
    else if (/Windows/i.test(userAgent)) os = 'Windows';
    else if (/Mac OS X|Macintosh/i.test(userAgent)) os = 'macOS';
    else if (/Linux/i.test(userAgent)) os = 'Linux';

    let browser = 'unknown';
    if (/Line\//i.test(userAgent)) browser = 'LINE';
    else if (/Edg\//i.test(userAgent)) browser = 'Edge';
    else if (/Chrome\//i.test(userAgent) && !/Chromium/i.test(userAgent)) browser = 'Chrome';
    else if (/Safari\//i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari';
    else if (/Firefox\//i.test(userAgent)) browser = 'Firefox';
    else if (/MSIE|Trident/i.test(userAgent)) browser = 'IE';

    // クリックデータを保存
    await saveTrackingClick({
      trackingLinkId: link.id,
      deviceType,
      os,
      browser,
      referer: referer ?? null,
      utmSource: utmSource ?? null,
      utmMedium: utmMedium ?? null,
      utmCampaign: utmCampaign ?? null,
      utmContent: utmContent ?? null,
      language: null,
      country: null,
    });

    return NextResponse.redirect(link.destination_url, 307);
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

    // ボット判定: ボットの場合はクリックカウントを増やさずリダイレクトURLのみ返す
    const userAgent = request.headers.get('user-agent') ?? '';

    // リンクを取得
    const link = await getTrackingLinkByCode(code);
    if (!link) {
      return NextResponse.json({ error: 'link not found' }, { status: 404 });
    }

    if (isBot(userAgent)) {
      return NextResponse.json({
        ok: true,
        destinationUrl: link.destination_url,
      });
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

    // Referer: クライアント送信値が空の場合はHTTPヘッダーをフォールバック
    const clientReferer = toStringOrNull(body.referer);
    const headerReferer = request.headers.get('referer');
    const finalReferer = clientReferer ?? headerReferer ?? null;

    // クリックデータを保存
    await saveTrackingClick({
      trackingLinkId: link.id,
      deviceType: toStringOrNull(body.deviceType),
      os: toStringOrNull(body.os),
      browser: toStringOrNull(body.browser),
      referer: finalReferer,
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
