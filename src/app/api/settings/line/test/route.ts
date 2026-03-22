// ===== LINE接続テスト API Route =====

import { NextRequest, NextResponse } from 'next/server';

interface LineBotInfo {
  userId: string;
  basicId: string;
  displayName: string;
  pictureUrl?: string;
  chatMode: string;
  markAsReadMode: string;
}

interface TestSuccessResponse {
  success: true;
  botName: string;
  botId: string;
}

interface TestErrorResponse {
  success: false;
  error: string;
}

type TestResponse = TestSuccessResponse | TestErrorResponse;

/**
 * POST /api/settings/line/test
 * チャネルアクセストークンでBot情報を取得し接続テスト
 */
export async function POST(request: NextRequest): Promise<NextResponse<TestResponse>> {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== 'object' ||
      body === null ||
      !('channelAccessToken' in body) ||
      typeof (body as Record<string, unknown>).channelAccessToken !== 'string'
    ) {
      return NextResponse.json(
        { success: false, error: 'チャネルアクセストークンが指定されていません' },
        { status: 400 }
      );
    }

    const { channelAccessToken } = body as { channelAccessToken: string };

    if (!channelAccessToken.trim()) {
      return NextResponse.json(
        { success: false, error: 'チャネルアクセストークンが空です' },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('https://api.line.me/v2/bot/info', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${channelAccessToken}`,
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        const statusText = res.status === 401
          ? 'チャネルアクセストークンが無効です。正しいトークンを入力してください。'
          : `LINE APIエラー (${res.status}): ${res.statusText}`;

        return NextResponse.json(
          { success: false, error: statusText },
          { status: 200 }
        );
      }

      const data = (await res.json()) as LineBotInfo;

      return NextResponse.json({
        success: true,
        botName: data.displayName,
        botId: data.basicId,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? '接続がタイムアウトしました。ネットワークを確認してください。'
        : '接続テストに失敗しました。ネットワーク接続を確認してください。';

    return NextResponse.json(
      { success: false, error: message },
      { status: 200 }
    );
  }
}
