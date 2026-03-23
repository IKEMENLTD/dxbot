// ===== LINE Messaging API クライアント =====

import { createHmac, timingSafeEqual } from 'crypto';
import type { LineMessage, LineProfile } from './line-types';
import { getAppSetting } from './queries';
import { decrypt } from './crypto';

const LINE_API_BASE = 'https://api.line.me/v2';

/** DB上の line_config の暗号化フィールド型 */
interface EncryptedLineConfig {
  encryptedAccessToken?: string;
  encryptedSecret?: string;
  webhookUrl?: string;
  botName?: string | null;
  verified?: boolean;
}

/**
 * DB（app_settings.line_config）から暗号化されたアクセストークンを取得し復号する。
 * 取得できない場合は環境変数にフォールバック。
 */
export async function getChannelAccessTokenAsync(): Promise<string | null> {
  try {
    const config = await getAppSetting<EncryptedLineConfig>('line_config');
    if (config && typeof config === 'object' && config.encryptedAccessToken) {
      return decrypt(config.encryptedAccessToken);
    }
  } catch (err) {
    console.error('[LINE] DB からアクセストークン取得失敗。環境変数にフォールバック:', err instanceof Error ? err.message : err);
  }
  return process.env.LINE_CHANNEL_ACCESS_TOKEN || null;
}

/**
 * DB（app_settings.line_config）から暗号化されたチャネルシークレットを取得し復号する。
 * 取得できない場合は環境変数にフォールバック。
 */
export async function getChannelSecretAsync(): Promise<string | null> {
  try {
    const config = await getAppSetting<EncryptedLineConfig>('line_config');
    if (config && typeof config === 'object' && config.encryptedSecret) {
      return decrypt(config.encryptedSecret);
    }
  } catch (err) {
    console.error('[LINE] DB からチャネルシークレット取得失敗。環境変数にフォールバック:', err instanceof Error ? err.message : err);
  }
  return process.env.LINE_CHANNEL_SECRET || null;
}

/**
 * LINE署名を検証する（キーを引数で受け取る同期版）
 * webhookハンドラで事前にgetChannelSecretAsync()で取得したキーを渡す。
 */
export function verifySignatureWithKey(body: string, signature: string, secret: string | null): boolean {
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[LINE] チャネルシークレット未設定。署名検証不可');
      return false;
    }
    console.log('[LINE Mock] 署名検証スキップ（開発モード）');
    return true;
  }

  const hash = createHmac('SHA256', secret)
    .update(body)
    .digest('base64');

  const hashBuf = Buffer.from(hash, 'base64');
  const sigBuf = Buffer.from(signature, 'base64');
  if (hashBuf.length !== sigBuf.length) return false;
  return timingSafeEqual(hashBuf, sigBuf);
}

/**
 * LINE Reply Message API
 */
export async function replyMessage(
  replyToken: string,
  messages: LineMessage[]
): Promise<void> {
  const token = await getChannelAccessTokenAsync();
  if (!token) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[LINE] アクセストークン未設定。replyMessage 送信不可');
    } else {
      console.log('[LINE Mock] replyMessage:', JSON.stringify({ replyToken, messages }, null, 2));
    }
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${LINE_API_BASE}/bot/message/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ replyToken, messages }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('[LINE] replyMessage エラー:', res.status, errorBody);
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('[LINE] replyMessage タイムアウト（30秒）');
    } else {
      console.error('[LINE] replyMessage 例外:', err instanceof Error ? err.message : err);
    }
    // fire-and-forget: エラーは吸収する
  } finally {
    clearTimeout(timeoutId);
  }
}

/** pushMessage の結果型 */
export interface PushMessageResult {
  success: boolean;
  /** mockモードで送信された場合 true */
  mock: boolean;
  /** エラー時のメッセージ */
  error?: string;
  /** LINE API の HTTP ステータスコード */
  statusCode?: number;
}

/**
 * LINE Push Message API
 * 成功/失敗を判定できるよう PushMessageResult を返す
 */
/** LINE User ID の形式チェック: U + 32桁の16進数 */
const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

export async function pushMessage(
  lineUserId: string,
  messages: LineMessage[]
): Promise<PushMessageResult> {
  if (!LINE_USER_ID_PATTERN.test(lineUserId)) {
    console.error(`[LINE] 不正な LINE User ID 形式: ${lineUserId}`);
    return { success: false, mock: false, error: 'LINE User IDの形式が不正です' };
  }

  const token = await getChannelAccessTokenAsync();
  if (!token) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[LINE] アクセストークン未設定。pushMessage 送信不可');
      return { success: false, mock: false, error: 'アクセストークンが未設定です' };
    }
    console.log('[LINE Mock] pushMessage:', JSON.stringify({ to: lineUserId, messages }, null, 2));
    return { success: true, mock: true };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${LINE_API_BASE}/bot/message/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to: lineUserId, messages }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('[LINE] pushMessage エラー:', res.status, errorBody);

      if (res.status === 429) {
        return { success: false, mock: false, error: 'LINE APIのレート制限に達しました。しばらく待ってから再送信してください。', statusCode: 429 };
      }
      if (res.status === 401) {
        return { success: false, mock: false, error: 'LINE APIの認証に失敗しました。アクセストークンを確認してください。', statusCode: 401 };
      }
      if (res.status === 400) {
        return { success: false, mock: false, error: `LINE APIリクエストが不正です: ${errorBody}`, statusCode: 400 };
      }

      return { success: false, mock: false, error: `LINE API エラー (HTTP ${res.status}): ${errorBody}`, statusCode: res.status };
    }

    return { success: true, mock: false };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('[LINE] pushMessage タイムアウト（30秒）');
      return { success: false, mock: false, error: 'LINE APIへのリクエストがタイムアウトしました（30秒）' };
    }
    const errorMessage = err instanceof Error ? err.message : 'pushMessage送信中に不明なエラーが発生しました';
    console.error('[LINE] pushMessage 例外:', errorMessage);
    return { success: false, mock: false, error: errorMessage };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * LINE プロフィール取得
 */
export async function getProfile(userId: string): Promise<LineProfile | null> {
  const token = await getChannelAccessTokenAsync();
  if (!token) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[LINE] アクセストークン未設定。getProfile 取得不可');
      return null;
    }
    console.log('[LINE Mock] getProfile:', userId);
    return {
      displayName: 'テストユーザー',
      userId,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${LINE_API_BASE}/bot/profile/${userId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error('[LINE] getProfile エラー:', res.status);
      return null;
    }

    const data: unknown = await res.json();
    return data as LineProfile;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('[LINE] getProfile タイムアウト（15秒）');
    } else {
      console.error('[LINE] getProfile 例外:', err instanceof Error ? err.message : err);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
