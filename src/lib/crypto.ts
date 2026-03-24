// ===== 設定値の暗号化/復号化 =====
// AES-256-GCM を使用してapp_settingsに保存する機密値を暗号化する

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * 暗号化キーを取得する。
 * 1. 環境変数 SETTINGS_ENCRYPTION_KEY（64文字のhex = 32バイト）
 * 2. フォールバック: ADMIN_PASSWORD の SHA256ハッシュ
 * 3. どちらも未設定の場合はエラー（デフォルトキーは使用しない）
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.SETTINGS_ENCRYPTION_KEY;
  if (envKey && envKey.length === 64) {
    return Buffer.from(envKey, 'hex');
  }
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error('SETTINGS_ENCRYPTION_KEY または ADMIN_PASSWORD が必要です');
  }
  return createHash('sha256').update(password).digest();
}

/**
 * キーのフィンガープリント（SHA256ハッシュの先頭8文字）を取得する。
 * 暗号文にフィンガープリントを含めることで、キー変更時の検出が可能になる。
 */
function getKeyFingerprint(key: Buffer): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 8);
}

/**
 * 平文を AES-256-GCM で暗号化する。
 * @returns "keyFingerprint:iv(hex):authTag(hex):ciphertext(hex)" 形式の文字列
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const fingerprint = getKeyFingerprint(key);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${fingerprint}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * AES-256-GCM で暗号化された文字列を復号する。
 * 新形式 "keyFingerprint:iv:authTag:ciphertext" と旧形式 "iv:authTag:ciphertext" の両方に対応。
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(':');

  let ivHex: string;
  let authTagHex: string;
  let encrypted: string;

  if (parts.length === 4) {
    // 新形式: フィンガープリント付き
    const storedFingerprint = parts[0];
    const currentFingerprint = getKeyFingerprint(key);
    if (storedFingerprint !== currentFingerprint) {
      throw new Error('暗号化キーが変更されています。LINE設定を再保存してください');
    }
    ivHex = parts[1];
    authTagHex = parts[2];
    encrypted = parts[3];
  } else if (parts.length === 3) {
    // 旧形式: フィンガープリントなし（後方互換性）
    ivHex = parts[0];
    authTagHex = parts[1];
    encrypted = parts[2];
  } else {
    throw new Error('不正な暗号文形式です');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
