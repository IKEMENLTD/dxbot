import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "dxbot_session";

/**
 * Edge Runtime対応: Web Crypto APIでSHA-256ハッシュを生成し、
 * cookieのトークン値が正当かを検証する
 */
async function verifyTokenInMiddleware(
  cookieValue: string,
  adminPassword: string
): Promise<boolean> {
  const secret = `dxbot_${adminPassword}_session_token`;
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedToken = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return cookieValue === expectedToken;
}

/**
 * Middleware: API routeの認証のみ担当
 * ページの認証チェックはlayout.tsxのサーバーサイドで行う
 * （Next.js 16 + Netlify でmiddleware redirectがダブルスラッシュになる問題の回避）
 */
export async function middleware(
  request: NextRequest
): Promise<NextResponse | undefined> {
  const { pathname } = request.nextUrl;

  // 公開APIはスキップ
  if (
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/webhook" ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/track/") ||
    pathname.startsWith("/track/") ||
    pathname === "/api/assessment" ||
    pathname === "/api/assessment/config"
  ) {
    return undefined;
  }

  // ADMIN_PASSWORD 未設定時
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "ADMIN_PASSWORD が未設定です" },
        { status: 503 }
      );
    }
    return undefined;
  }

  // セッションcookieチェック
  const sessionCookie = request.cookies.get(COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json(
      { error: "認証が必要です" },
      { status: 401 }
    );
  }

  // トークン値の検証（cookie値の正当性を確認）
  const isValid = await verifyTokenInMiddleware(
    sessionCookie.value,
    adminPassword
  );
  if (!isValid) {
    return NextResponse.json(
      { error: "セッションが無効です" },
      { status: 401 }
    );
  }

  return undefined;
}

export const config = {
  matcher: [
    "/api/:path*",
  ],
};
