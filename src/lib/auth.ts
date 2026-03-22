import { cookies } from "next/headers";
import { createHash } from "crypto";

const COOKIE_NAME = "dxbot_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7日

/**
 * パスワードとタイムスタンプからセッショントークンを生成
 */
function generateToken(password: string): string {
  const secret = `dxbot_${password}_session_token`;
  return createHash("sha256").update(secret).digest("hex");
}

/**
 * セッションcookieの有効性を検証
 * @returns true: 有効なセッション / false: 無効またはcookieなし
 */
export async function verifySession(): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;

  // 環境変数未設定時の処理
  if (!adminPassword) {
    // 本番環境では認証必須 - パスワード未設定はアクセス拒否
    if (process.env.NODE_ENV === "production") {
      console.error("[Auth] ADMIN_PASSWORD 未設定。本番環境のため認証拒否");
      return false;
    }
    // 開発時のみ認証スキップ
    return true;
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);

  if (!sessionCookie) {
    return false;
  }

  const expectedToken = generateToken(adminPassword);
  return sessionCookie.value === expectedToken;
}

/**
 * セッションcookieを作成
 * @param password - 入力されたパスワード
 * @returns true: 認証成功 / false: パスワード不一致
 */
export async function createSession(password: string): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Auth] ADMIN_PASSWORD 未設定。本番環境のためセッション作成拒否");
      return false;
    }
    return true;
  }

  if (password !== adminPassword) {
    return false;
  }

  const token = generateToken(adminPassword);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return true;
}

/**
 * セッションcookieを削除（ログアウト）
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
