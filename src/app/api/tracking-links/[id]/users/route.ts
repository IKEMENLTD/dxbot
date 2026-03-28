// GET /api/tracking-links/[id]/users - トラッキングリンク経由の友だち追加ユーザー一覧

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getUsersByTrackingLinkId } from '@/lib/queries';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { id } = await context.params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'id は必須です' },
        { status: 400 }
      );
    }

    const data = await getUsersByTrackingLinkId(id);
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ユーザー一覧の取得に失敗しました';
    console.error('[API /tracking-links/[id]/users GET]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
