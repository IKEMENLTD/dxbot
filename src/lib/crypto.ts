// ===== 設定値の暗号化/復号化 =====
// AES-256-GCM を使用してapp_settingsに保存する機密値を暗号化する

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * 暗号化キーを取得する。
 * 1. 環境変数 SETTINGS_ENCRYPTION_KEY（64文字のhex = 32バイト）
 * 2. フォールバック: ADMIN_PASSWORD の SHA256ハッシュ
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.SETTINGS_ENCRYPTION_KEY;
  if (envKey && envKey.length === 64) {
    return Buffer.from(envKey, 'hex');
  }
  // フォールバック: ADMIN_PASSWORDのSHA256
  const password = process.env.ADMIN_PASSWORD ?? 'dxbot-default-key';
  return createHash('sha256').update(password).digest();
}

/**
 * 平文を AES-256-GCM で暗号化する。
 * @returns "iv(hex):authTag(hex):ciphertext(hex)" 形式の文字列
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * AES-256-GCM で暗号化された文字列を復号する。
 * @param ciphertext "iv(hex):authTag(hex):ciphertext(hex)" 形式
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('不正な暗号文形式です');
  }
  const [ivHex, authTagHex, encrypted] = parts as [string, string, string];
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
