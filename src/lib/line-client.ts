// ===== LINE Messaging API クライアント =====

import * as crypto from 'crypto';
import type { LineMessage, LineProfile } from './line-types';

const LINE_API_BASE = 'https://api.line.me/v2';

function getChannelAccessToken(): string | null {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN || null;
}

function getChannelSecret(): string | null {
  return process.env.LINE_CHANNEL_SECRET || null;
}

/**
 * LINE署名を検証する
 */
export function verifySignature(body: string, signature: string): boolean {
  const secret = getChannelSecret();
  if (!secret) {
    console.log('[LINE Mock] 署名検証スキップ（LINE_CHANNEL_SECRET 未設定）');
    return true;
  }

  const hash = crypto
    .createHmac('SHA256', secret)
    .update(body)
    .digest('base64');

  return hash === signature;
}

/**
 * LINE Reply Message API
 */
export async function replyMessage(
  replyToken: string,
  messages: LineMessage[]
): Promise<void> {
  const token = getChannelAccessToken();
  if (!token) {
    console.log('[LINE Mock] replyMessage:', JSON.stringify({ replyToken, messages }, null, 2));
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
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * LINE Push Message API
 */
export async function pushMessage(
  userId: string,
  messages: LineMessage[]
): Promise<void> {
  const token = getChannelAccessToken();
  if (!token) {
    console.log('[LINE Mock] pushMessage:', JSON.stringify({ to: userId, messages }, null, 2));
    return;
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
      body: JSON.stringify({ to: userId, messages }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('[LINE] pushMessage エラー:', res.status, errorBody);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * LINE プロフィール取得
 */
export async function getProfile(userId: string): Promise<LineProfile | null> {
  const token = getChannelAccessToken();
  if (!token) {
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
  } finally {
    clearTimeout(timeoutId);
  }
}
