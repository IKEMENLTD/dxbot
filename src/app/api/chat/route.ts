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
  getLineUserIdByUserId,
} from '@/lib/queries';
import { pushMessage } from '@/lib/line-client';
import type { TextMessage, ImageMessage, LineMessage } from '@/lib/line-types';
import type { MediaAttachment } from '@/lib/chat-types';

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
  imageUrls?: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = (await request.json()) as ChatSendRequest;
    const { userId, message, imageUrls } = body;

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

    if (typeof message !== 'string') {
      return NextResponse.json(
        { error: 'メッセージの形式が不正です。' },
        { status: 400 }
      );
    }

    // テキストが空の場合は送信不可（画像のみの送信は現在未対応）
    if (!message.trim()) {
      return NextResponse.json(
        { error: 'テキストを入力してください。画像のみの送信は現在対応していません。' },
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

    // imageUrlsのバリデーション（最大4件: テキスト1件 + 画像4件 = LINE上限5件）
    const validImageUrls = Array.isArray(imageUrls)
      ? imageUrls.filter((u): u is string => typeof u === 'string' && u.startsWith('https://'))
      : [];
    const cappedImageUrls = validImageUrls.slice(0, 4);

    if (lineUserId) {
      // テキストメッセージ + ImageMessage(s) を組み立てる
      const lineMessages: LineMessage[] = [];
      const textMsg: TextMessage = { type: 'text', text: message };
      lineMessages.push(textMsg);

      for (const url of cappedImageUrls) {
        const imgMsg: ImageMessage = {
          type: 'image',
          originalContentUrl: url,
          previewImageUrl: url,
        };
        lineMessages.push(imgMsg);
      }

      // LINE push API は最大5件まで
      const pushResult = await pushMessage(lineUserId, lineMessages.slice(0, 5));

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

    // 画像URLからMediaAttachment配列を構築
    const mediaForDb: MediaAttachment[] = cappedImageUrls.map((url, idx) => ({
      id: `img-${Date.now()}-${idx}`,
      type: 'image' as const,
      url,
      name: `image-${idx + 1}`,
      size: 0,
      mimeType: 'image/unknown',
    }));

    // LINE送信成功（or LINE未接続）→ DBに保存
    const result = await saveMessage({
      userId,
      lineUserId: lineUserId,
      direction: 'outbound',
      content: message,
      messageType: 'text',
      mediaAttachments: mediaForDb.length > 0 ? mediaForDb : undefined,
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
