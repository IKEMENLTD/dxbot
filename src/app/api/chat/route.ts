import { NextResponse } from 'next/server';

interface ChatSendRequest {
  userId: string;
  message: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ChatSendRequest;
    const { userId, message } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です。' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'メッセージが空です。' },
        { status: 400 }
      );
    }

    // モック: 将来的にLINE Messaging API Push Messageに接続
    // const lineResponse = await sendLinePushMessage(userId, message);

    return NextResponse.json({
      success: true,
      userId,
      messageId: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
    return NextResponse.json(
      { error: `メッセージ送信中にエラーが発生しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
