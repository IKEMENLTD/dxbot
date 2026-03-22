// GET  /api/users/[id] - ユーザー詳細
// PATCH /api/users/[id] - ステータス更新

import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUserStatus, getDealsByUserId, getTimelineByUserId, getStumblesByUserId } from '@/lib/queries';
import type { CustomerStatus } from '@/lib/types';

const VALID_STATUSES: CustomerStatus[] = [
  'prospect', 'contacted', 'meeting', 'customer', 'churned', 'techstars_active', 'techstars_grad',
];

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const user = await getUserById(id);

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 関連データも並列取得
    const [deals, timeline, stumbles] = await Promise.all([
      getDealsByUserId(id),
      getTimelineByUserId(id),
      getStumblesByUserId(id),
    ]);

    return NextResponse.json({
      data: {
        user,
        deals,
        timeline,
        stumbles,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ユーザー詳細の取得に失敗しました';
    console.error('[API /users/[id] GET]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== 'object' ||
      !('status' in body) ||
      typeof (body as Record<string, unknown>).status !== 'string'
    ) {
      return NextResponse.json(
        { error: 'status フィールドが必要です' },
        { status: 400 }
      );
    }

    const status = (body as Record<string, string>).status as CustomerStatus;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `無効なステータスです: ${status}` },
        { status: 400 }
      );
    }

    const result = await updateUserStatus(id, status);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'ステータス更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { userId: id, status } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ステータス更新に失敗しました';
    console.error('[API /users/[id] PATCH]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
