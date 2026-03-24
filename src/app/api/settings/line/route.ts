// ===== LINE認証情報 暗号化保存/取得 API Route =====

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getAppSetting, setAppSetting, deleteAppSetting } from '@/lib/queries';
import { encrypt, decrypt } from '@/lib/crypto';

/** DB上の暗号化済みLINE設定の型 */
interface EncryptedLineConfig {
  encryptedAccessToken?: string;
  encryptedSecret?: string;
  webhookUrl?: string;
  botName?: string | null;
  botBasicId?: string | null;
  verified?: boolean;
}

/** POST リクエストボディの型（片方だけの更新もサポート） */
interface SaveLineConfigBody {
  channelAccessToken?: string;
  channelSecret?: string;
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
  friendUrl: string | null;
}

/** botBasicIdからLINE友だち追加URLを生成する */
function buildFriendUrl(botBasicId: string | null | undefined): string | null {
  if (!botBasicId) return null;
  // basicIdが @ 付きならそのまま、付いていなければ @ を付与
  const normalizedId = botBasicId.startsWith('@') ? botBasicId : `@${botBasicId}`;
  return `https://line.me/R/ti/p/${normalizedId}`;
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
        friendUrl: null,
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
      friendUrl: buildFriendUrl(config.botBasicId),
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

    // バリデーション: bodyがオブジェクトであること
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { success: false, error: 'リクエストボディが不正です' },
        { status: 400 }
      );
    }

    const rawBody = body as Record<string, unknown>;
    const channelAccessToken = typeof rawBody.channelAccessToken === 'string'
      ? rawBody.channelAccessToken.trim()
      : undefined;
    const channelSecret = typeof rawBody.channelSecret === 'string'
      ? rawBody.channelSecret.trim()
      : undefined;
    const webhookUrl = typeof rawBody.webhookUrl === 'string'
      ? rawBody.webhookUrl
      : undefined;

    // 既存設定を取得
    const existing = await getAppSetting<EncryptedLineConfig>('line_config');
    const existingConfig: EncryptedLineConfig = (existing && typeof existing === 'object') ? existing : {};
    const isNewSetup = !existingConfig.encryptedAccessToken && !existingConfig.encryptedSecret;

    // 新規設定時は両方必須
    if (isNewSetup) {
      if (!channelAccessToken || !channelSecret) {
        return NextResponse.json(
          { success: false, error: 'チャネルアクセストークンとチャネルシークレットが必要です' },
          { status: 400 }
        );
      }
    } else {
      // 設定済み時は少なくとも片方必要
      if (!channelAccessToken && !channelSecret) {
        return NextResponse.json(
          { success: false, error: 'トークンまたはシークレットのいずれかを入力してください' },
          { status: 400 }
        );
      }
    }

    // 暗号化（送信された値のみ更新、送信されなかった方は既存値を維持）
    const encryptedAccessToken = channelAccessToken
      ? encrypt(channelAccessToken)
      : existingConfig.encryptedAccessToken;
    const encryptedSecret = channelSecret
      ? encrypt(channelSecret)
      : existingConfig.encryptedSecret;

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

    // マスク値を返す（更新された方は新しい値、維持された方は復号してマスク）
    let maskedAccessTokenResult: string | undefined;
    let maskedSecretResult: string | undefined;

    if (channelAccessToken) {
      maskedAccessTokenResult = maskValue(channelAccessToken);
    } else if (existingConfig.encryptedAccessToken) {
      try {
        maskedAccessTokenResult = maskValue(decrypt(existingConfig.encryptedAccessToken));
      } catch {
        maskedAccessTokenResult = '****（既存値）';
      }
    }

    if (channelSecret) {
      maskedSecretResult = maskValue(channelSecret);
    } else if (existingConfig.encryptedSecret) {
      try {
        maskedSecretResult = maskValue(decrypt(existingConfig.encryptedSecret));
      } catch {
        maskedSecretResult = '****（既存値）';
      }
    }

    return NextResponse.json({
      success: true,
      maskedAccessToken: maskedAccessTokenResult,
      maskedSecret: maskedSecretResult,
    });
  } catch (err) {
    console.error('[API settings/line POST] エラー:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: 'LINE設定の保存に失敗しました' },
      { status: 500 }
    );
  }
}

/** DELETE レスポンスの型 */
interface DeleteLineConfigResponse {
  success: boolean;
  error?: string;
}

/**
 * DELETE /api/settings/line
 * LINE連携を解除する（app_settings の line_config を削除）
 */
export async function DELETE(): Promise<NextResponse<DeleteLineConfigResponse>> {
  const authError = await requireAuth();
  if (authError) return authError as NextResponse<DeleteLineConfigResponse>;

  try {
    const result = await deleteAppSetting('line_config');

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? 'LINE設定の削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API settings/line DELETE] エラー:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: 'LINE連携の解除に失敗しました' },
      { status: 500 }
    );
  }
}
