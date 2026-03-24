// GET  /api/users/[id] - ユーザー詳細
// PATCH /api/users/[id] - ステータス更新

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getUserById, updateUserStatus, updateUserTags, completeTechstars, updatePausedUntil, getDealsByUserId, getTimelineByUserId, getStumblesByUserId } from '@/lib/queries';
import type { CustomerStatus } from '@/lib/types';

/** TECHSTARS研修期間（3ヶ月） */
const TECHSTARS_DURATION_DAYS = 90;

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
  const authError = await requireAuth();
  if (authError) return authError;

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
    console.error('[API /users/[id] GET]', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'ユーザー詳細の取得に失敗しました' },
      { status: 500 }
    );
  }
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

    const bodyRecord = body as Record<string, unknown>;

    // TECHSTARS修了登録: { action: "techstars_complete" }
    if (bodyRecord.action === 'techstars_complete') {
      const result = await completeTechstars(id);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error ?? 'TECHSTARS修了登録に失敗しました' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        data: { userId: id, status: 'techstars_grad', techstars_completed_at: new Date().toISOString() },
      });
    }

    // タグ更新: { tags: ["tag-1", "tag-2"] }
    if ('tags' in bodyRecord) {
      if (!Array.isArray(bodyRecord.tags) || !bodyRecord.tags.every((t): t is string => typeof t === 'string')) {
        return NextResponse.json(
          { error: 'tags は文字列配列である必要があります' },
          { status: 400 }
        );
      }

      const tagsResult = await updateUserTags(id, bodyRecord.tags as string[]);

      if (!tagsResult.success) {
        return NextResponse.json(
          { error: tagsResult.error ?? 'タグ更新に失敗しました' },
          { status: 500 }
        );
      }

      // tags のみの更新の場合はここで返す
      if (!('status' in bodyRecord)) {
        return NextResponse.json({ data: { userId: id, tags: bodyRecord.tags } });
      }
    }

    // ステータス更新: { status: "..." }
    if (!('status' in bodyRecord) || typeof bodyRecord.status !== 'string') {
      return NextResponse.json(
        { error: 'status フィールドが必要です' },
        { status: 400 }
      );
    }

    const status = bodyRecord.status as CustomerStatus;

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

    // TECHSTARS成約時: ステップ配信を研修期間中一時停止
    if (status === 'techstars_active') {
      const pauseEnd = new Date();
      pauseEnd.setDate(pauseEnd.getDate() + TECHSTARS_DURATION_DAYS);
      await updatePausedUntil(id, pauseEnd.toISOString());
    }

    return NextResponse.json({ data: { userId: id, status } });
  } catch (err: unknown) {
    console.error('[API /users/[id] PATCH]', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'ステータス更新に失敗しました' },
      { status: 500 }
    );
  }
}
