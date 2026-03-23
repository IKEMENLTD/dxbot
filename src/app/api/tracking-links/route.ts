// GET  /api/tracking-links - 全トラッキングリンク取得
// POST /api/tracking-links - 新規作成

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getTrackingLinks, createTrackingLink } from '@/lib/queries';

export async function GET(): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const links = await getTrackingLinks();
    return NextResponse.json({ data: links });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'トラッキングリンクの取得に失敗しました';
    console.error('[API /tracking-links GET]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

interface CreateBody {
  label?: unknown;
  lead_source?: unknown;
  destination_url?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'リクエストボディが不正です' },
        { status: 400 }
      );
    }

    const { label, lead_source, destination_url } = body as CreateBody;

    if (typeof label !== 'string' || !label.trim()) {
      return NextResponse.json(
        { error: 'label は必須です' },
        { status: 400 }
      );
    }

    if (typeof lead_source !== 'string' || !lead_source.trim()) {
      return NextResponse.json(
        { error: 'lead_source は必須です' },
        { status: 400 }
      );
    }

    if (typeof destination_url !== 'string' || !destination_url.trim()) {
      return NextResponse.json(
        { error: 'destination_url は必須です' },
        { status: 400 }
      );
    }

    const link = await createTrackingLink(label.trim(), lead_source.trim(), destination_url.trim());

    if (!link) {
      return NextResponse.json(
        { error: 'トラッキングリンクの作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: link }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'トラッキングリンクの作成に失敗しました';
    console.error('[API /tracking-links POST]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
