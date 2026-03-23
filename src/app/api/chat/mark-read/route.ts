// ===== Mark As Read API Route =====
// POST: 特定ユーザーの未読メッセージを既読にする

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { markAsRead } from '@/lib/queries';

interface MarkReadRequest {
  userId: string;
}

// ---------------------------------------------------------------------------
// POST /api/chat/mark-read
// Body: { userId: string }
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = (await request.json()) as MarkReadRequest;
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です。' },
        { status: 400 }
      );
    }

    if (userId.length > 100) {
      return NextResponse.json(
        { error: 'ユーザーIDが長すぎます（100文字以内）。' },
        { status: 400 }
      );
    }

    const result = await markAsRead(userId);

    if (!result.success) {
      return NextResponse.json(
        { error: `既読更新に失敗しました: ${result.error ?? '不明'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[API /chat/mark-read POST]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: '既読更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
