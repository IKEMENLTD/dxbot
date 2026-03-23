// ===== LINE認証情報 暗号化保存/取得 API Route =====

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getAppSetting, setAppSetting } from '@/lib/queries';
import { encrypt, decrypt } from '@/lib/crypto';

/** DB上の暗号化済みLINE設定の型 */
interface EncryptedLineConfig {
  encryptedAccessToken?: string;
  encryptedSecret?: string;
  webhookUrl?: string;
  botName?: string | null;
  verified?: boolean;
}

/** POST リクエストボディの型 */
interface SaveLineConfigBody {
  channelAccessToken: string;
  channelSecret: string;
  webhookUrl?: string;
}

/** GET レスポンスの型 */
interface LineConfigGetResponse {
  configured: boolean;
  maskedAccessToken: string | null;
  maskedSecret: string | null;
  webhookUrl: string | null;
  botName: string | null;
  verified: boolean;
}

/** 末尾4文字をマスク表示する（短すぎる場合は全マスク） */
function maskValue(value: string): string {
  if (value.length <= 4) {
    return '****';
  }
  return `****${value.slice(-4)}`;
}

/**
 * GET /api/settings/line
 * 設定済みかどうかとマスク値を返す（暗号化された値はクライアントに返さない）
 */
export async function GET(): Promise<NextResponse<LineConfigGetResponse | { error: string }>> {
  const authError = await requireAuth();
  if (authError) return authError as NextResponse<{ error: string }>;

  try {
    const config = await getAppSetting<EncryptedLineConfig>('line_config');

    if (!config || typeof config !== 'object') {
      return NextResponse.json({
        configured: false,
        maskedAccessToken: null,
        maskedSecret: null,
        webhookUrl: null,
        botName: null,
        verified: false,
      });
    }

    let maskedAccessToken: string | null = null;
    let maskedSecret: string | null = null;

    // 暗号化されたトークンを復号してマスク
    if (config.encryptedAccessToken) {
      try {
        const token = decrypt(config.encryptedAccessToken);
        maskedAccessToken = maskValue(token);
      } catch {
        maskedAccessToken = '****（復号エラー）';
      }
    }

    if (config.encryptedSecret) {
      try {
        const secret = decrypt(config.encryptedSecret);
        maskedSecret = maskValue(secret);
      } catch {
        maskedSecret = '****（復号エラー）';
      }
    }

    return NextResponse.json({
      configured: !!(config.encryptedAccessToken && config.encryptedSecret),
      maskedAccessToken,
      maskedSecret,
      webhookUrl: config.webhookUrl ?? null,
      botName: config.botName ?? null,
      verified: config.verified ?? false,
    });
  } catch (err) {
    console.error('[API settings/line GET] エラー:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'LINE設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/line
 * トークン+シークレットを受け取り、暗号化してapp_settingsに保存
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body: unknown = await request.json();

    // バリデーション
    if (
      typeof body !== 'object' ||
      body === null ||
      !('channelAccessToken' in body) ||
      !('channelSecret' in body) ||
      typeof (body as Record<string, unknown>).channelAccessToken !== 'string' ||
      typeof (body as Record<string, unknown>).channelSecret !== 'string'
    ) {
      return NextResponse.json(
        { success: false, error: 'チャネルアクセストークンとチャネルシークレットが必要です' },
        { status: 400 }
      );
    }

    const { channelAccessToken, channelSecret } = body as SaveLineConfigBody;
    const webhookUrl = typeof (body as Record<string, unknown>).webhookUrl === 'string'
      ? (body as SaveLineConfigBody).webhookUrl
      : undefined;

    if (!channelAccessToken.trim() || !channelSecret.trim()) {
      return NextResponse.json(
        { success: false, error: 'トークンとシークレットは空にできません' },
        { status: 400 }
      );
    }

    // 暗号化
    const encryptedAccessToken = encrypt(channelAccessToken.trim());
    const encryptedSecret = encrypt(channelSecret.trim());

    // 既存の設定を取得してマージ（botName, verifiedを保持）
    const existing = await getAppSetting<EncryptedLineConfig>('line_config');
    const existingConfig: EncryptedLineConfig = (existing && typeof existing === 'object') ? existing : {};

    const newConfig: Record<string, unknown> = {
      ...existingConfig,
      encryptedAccessToken,
      encryptedSecret,
      // 新しいトークンを保存したので検証状態をリセット
      verified: false,
      botName: null,
    };

    if (webhookUrl) {
      newConfig.webhookUrl = webhookUrl;
    }

    // 旧形式のプレーンテキストフィールドを除去
    delete newConfig.channelAccessToken;
    delete newConfig.channelSecret;

    const result = await setAppSetting('line_config', newConfig);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? '保存に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      maskedAccessToken: maskValue(channelAccessToken.trim()),
      maskedSecret: maskValue(channelSecret.trim()),
    });
  } catch (err) {
    console.error('[API settings/line POST] エラー:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: 'LINE設定の保存に失敗しました' },
      { status: 500 }
    );
  }
}
