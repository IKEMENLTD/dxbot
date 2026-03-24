// ===== Chat API Route =====
// GET: メッセージ取得（ポーリング用）
// POST: メッセージ送信（outbound）+ DB保存

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import {
  getMessages,
  getMessagesSince,
  getAllMessagesSince,
  saveMessage,
  markAsRead,
  getLineUserIdByUserId,
} from '@/lib/queries';
import { pushMessage } from '@/lib/line-client';
import type { TextMessage } from '@/lib/line-types';

// ---------------------------------------------------------------------------
// GET /api/chat?userId=xxx&limit=50&since=2026-03-20T00:00:00Z
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limitParam = searchParams.get('limit');
    const since = searchParams.get('since');

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    // userIdなし + since指定: 全ユーザー横断のポーリング
    if (!userId && since) {
      const sinceDate = new Date(since);
      if (isNaN(sinceDate.getTime())) {
        return NextResponse.json(
          { error: 'sinceパラメータの日時形式が不正です。' },
          { status: 400 }
        );
      }

      const messages = await getAllMessagesSince(since, limit);
      return NextResponse.json({ messages });
    }

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

    // since指定がある場合はポーリング（特定ユーザーの新着のみ取得）
    if (since) {
      const sinceDate = new Date(since);
      if (isNaN(sinceDate.getTime())) {
        return NextResponse.json(
          { error: 'sinceパラメータの日時形式が不正です。' },
          { status: 400 }
        );
      }

      const messages = await getMessagesSince(userId, since, limit);
      return NextResponse.json({ messages });
    }

    // 通常のメッセージ取得
    const messages = await getMessages(userId, limit);

    // 取得時に未読を既読にする
    await markAsRead(userId);

    return NextResponse.json({ messages });
  } catch (error: unknown) {
    console.error('[API /chat GET]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'メッセージ取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/chat
// Body: { userId: string, message: string }
// ---------------------------------------------------------------------------

interface ChatSendRequest {
  userId: string;
  message: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = (await request.json()) as ChatSendRequest;
    const { userId, message } = body;

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

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'メッセージが空です。' },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'メッセージが長すぎます（5000文字以内）。' },
        { status: 400 }
      );
    }

    // usersテーブルからline_user_idを取得
    const lineUserId = await getLineUserIdByUserId(userId);

    // LINE送信: line_user_id がある場合のみ
    let lineSent = false;
    let lineMock = false;

    if (lineUserId) {
      const lineMsg: TextMessage = { type: 'text', text: message };
      const pushResult = await pushMessage(lineUserId, [lineMsg]);

      if (!pushResult.success) {
        // LINE送信失敗 → DBには保存しない（エラーを返す）
        const statusCode = pushResult.statusCode === 429 ? 429 : 502;
        return NextResponse.json(
          { error: `LINE送信に失敗しました: ${pushResult.error ?? '不明なエラー'}` },
          { status: statusCode }
        );
      }

      lineSent = true;
      lineMock = pushResult.mock;
    }

    // LINE送信成功（or LINE未接続）→ DBに保存
    const result = await saveMessage({
      userId,
      lineUserId: lineUserId,
      direction: 'outbound',
      content: message,
      messageType: 'text',
    });

    if (!result.success) {
      return NextResponse.json(
        { error: `メッセージ保存に失敗しました: ${result.error ?? '不明'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId,
      messageId: result.id ?? `msg-${Date.now()}`,
      timestamp: result.sentAt ?? new Date().toISOString(),
      lineSent,
      lineMock,
    });
  } catch (error: unknown) {
    console.error('[API /chat POST]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'メッセージ送信中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
