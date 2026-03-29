// ===== Mark As Read API Route =====
// POST: メッセージの既読/未読を切り替える

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import {
  markAsRead,
  markMessagesAsRead,
  markMessagesAsUnread,
  markAllAsUnread,
} from '@/lib/queries';

interface MarkReadBody {
  userId?: string;
  messageIds?: string[];
  action?: 'read' | 'unread';
}

// ---------------------------------------------------------------------------
// POST /api/chat/mark-read
// Body: { userId?: string, messageIds?: string[], action?: 'read' | 'unread' }
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = (await request.json()) as MarkReadBody;
    const { userId, messageIds, action } = body;

    // バリデーション: userId か messageIds のどちらかは必須
    if (!userId && (!messageIds || messageIds.length === 0)) {
      return NextResponse.json(
        { error: 'ユーザーIDまたはメッセージIDが必要です。' },
        { status: 400 }
      );
    }

    if (userId && typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'ユーザーIDの形式が不正です。' },
        { status: 400 }
      );
    }

    if (userId && userId.length > 100) {
      return NextResponse.json(
        { error: 'ユーザーIDが長すぎます（100文字以内）。' },
        { status: 400 }
      );
    }

    if (messageIds && !Array.isArray(messageIds)) {
      return NextResponse.json(
        { error: 'メッセージIDの形式が不正です。' },
        { status: 400 }
      );
    }

    if (messageIds && messageIds.length > 500) {
      return NextResponse.json(
        { error: 'メッセージIDが多すぎます（500件以内）。' },
        { status: 400 }
      );
    }

    if (action && action !== 'read' && action !== 'unread') {
      return NextResponse.json(
        { error: 'actionは "read" または "unread" を指定してください。' },
        { status: 400 }
      );
    }

    // 処理分岐
    if (action === 'unread' && userId) {
      // ユーザーの全メッセージを未読に戻す
      await markAllAsUnread(userId);
    } else if (action === 'unread' && messageIds) {
      // 個別メッセージを未読に戻す
      await markMessagesAsUnread(messageIds);
    } else if (messageIds && (!action || action === 'read')) {
      // 個別メッセージを既読にする
      await markMessagesAsRead(messageIds);
    } else if (userId && (!action || action === 'read')) {
      // ユーザーの全メッセージを既読にする（既存の全既読処理）
      const result = await markAsRead(userId);
      if (!result.success) {
        return NextResponse.json(
          { error: `既読更新に失敗しました: ${result.error ?? '不明'}` },
          { status: 500 }
        );
      }
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
