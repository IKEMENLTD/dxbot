// ===== LINE接続テスト API Route =====

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getChannelAccessTokenAsync } from '@/lib/line-client';
import { getAppSetting, setAppSetting } from '@/lib/queries';

interface LineBotInfo {
  userId: string;
  basicId: string;
  displayName: string;
  pictureUrl?: string;
  chatMode: string;
  markAsReadMode: string;
}

/** DB上の暗号化済みLINE設定の型 */
interface EncryptedLineConfig {
  encryptedAccessToken?: string;
  encryptedSecret?: string;
  webhookUrl?: string;
  botName?: string | null;
  verified?: boolean;
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
 * DB設定のアクセストークンでBot情報を取得し接続テスト。
 * リクエストボディにトークンが含まれていればそちらを優先（新規入力時用）。
 */
export async function POST(request: NextRequest): Promise<NextResponse<TestResponse>> {
  const authError = await requireAuth();
  if (authError) return authError as NextResponse<TestResponse>;

  try {
    const body: unknown = await request.json();

    // リクエストボディにトークンがあればそちらを使用（新規入力のテスト時）
    let tokenToTest: string | null = null;

    if (
      typeof body === 'object' &&
      body !== null &&
      'channelAccessToken' in body &&
      typeof (body as Record<string, unknown>).channelAccessToken === 'string' &&
      ((body as Record<string, unknown>).channelAccessToken as string).trim().length > 0
    ) {
      tokenToTest = ((body as Record<string, unknown>).channelAccessToken as string).trim();
    }

    // リクエストにトークンがない場合はDB設定を使用
    if (!tokenToTest) {
      tokenToTest = await getChannelAccessTokenAsync();
    }

    if (!tokenToTest) {
      return NextResponse.json(
        { success: false, error: 'アクセストークンが設定されていません。先にStep 3で認証情報を保存してください。' },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('https://api.line.me/v2/bot/info', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenToTest}`,
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

      // テスト成功時、DB上のline_configのverifiedとbotNameを更新
      try {
        const existing = await getAppSetting<EncryptedLineConfig>('line_config');
        if (existing && typeof existing === 'object') {
          const updated: Record<string, unknown> = {
            ...existing,
            verified: true,
            botName: data.displayName,
          };
          await setAppSetting('line_config', updated);
        }
      } catch (updateErr) {
        console.error('[LINE Test] DB更新エラー（テスト結果は返す）:', updateErr);
      }

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
