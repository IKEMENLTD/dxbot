import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "dxbot_session";

/**
 * 認証不要パスの判定
 */
function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/webhook" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  );
}

/**
 * 保護対象パスの判定
 * /dashboard 以下 + /api 以下（公開パス除く）
 */
function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/api/");
}

export function middleware(request: NextRequest): NextResponse | undefined {
  const { pathname } = request.nextUrl;

  // 公開パスはスキップ
  if (isPublicPath(pathname)) {
    return undefined;
  }

  // 保護対象外もスキップ
  if (!isProtectedPath(pathname)) {
    return undefined;
  }

  // ADMIN_PASSWORD 未設定時の処理
  // ※MiddlewareではNode.js APIが使えないためprocess.envで直接参照
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    // 本番環境ではパスワード未設定でもログインを強制
    if (process.env.NODE_ENV === "production") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "ADMIN_PASSWORD が未設定です" },
          { status: 503 }
        );
      }
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    // 開発時のみスキップ
    return undefined;
  }

  // セッションcookieの存在チェック
  const sessionCookie = request.cookies.get(COOKIE_NAME);
  if (!sessionCookie?.value) {
    // API Routeの場合は401を返す
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }
    // ダッシュボードの場合はログインページにリダイレクト
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // cookieが存在すればアクセス許可
  // (トークンの詳細検証はAPI側で行う)
  return undefined;
}

export const config = {
  matcher: [
    /*
     * /dashboard以下 + /api以下すべてにマッチ
     * _next, favicon.ico は除外
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
