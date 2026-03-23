// PATCH  /api/tracking-links/[id] - 更新
// DELETE /api/tracking-links/[id] - 論理削除

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { updateTrackingLink, deactivateTrackingLink } from '@/lib/queries';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface PatchBody {
  label?: unknown;
  is_active?: unknown;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const body: unknown = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'リクエストボディが不正です' },
        { status: 400 }
      );
    }

    const { label, is_active } = body as PatchBody;

    const updates: { label?: string; is_active?: boolean } = {};
    if (typeof label === 'string') updates.label = label.trim();
    if (typeof is_active === 'boolean') updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: '更新するフィールドがありません' },
        { status: 400 }
      );
    }

    const success = await updateTrackingLink(id, updates);

    if (!success) {
      return NextResponse.json(
        { error: 'トラッキングリンクの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { id, ...updates } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'トラッキングリンクの更新に失敗しました';
    console.error('[API /tracking-links/[id] PATCH]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const success = await deactivateTrackingLink(id);

    if (!success) {
      return NextResponse.json(
        { error: 'トラッキングリンクの無効化に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { id, is_active: false } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'トラッキングリンクの無効化に失敗しました';
    console.error('[API /tracking-links/[id] DELETE]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
