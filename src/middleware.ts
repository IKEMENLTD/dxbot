import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "dxbot_session";

/**
 * Middleware: API routeの認証のみ担当
 * ページの認証チェックはlayout.tsxのサーバーサイドで行う
 * （Next.js 16 + Netlify でmiddleware redirectがダブルスラッシュになる問題の回避）
 */
export function middleware(request: NextRequest): NextResponse | undefined {
  const { pathname } = request.nextUrl;

  // 公開APIはスキップ
  if (
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/webhook" ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/track/") ||
    pathname.startsWith("/track/")
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

  return undefined;
}

export const config = {
  matcher: [
    "/api/((?!auth/|webhook|cron/|track/).*)",
  ],
};
