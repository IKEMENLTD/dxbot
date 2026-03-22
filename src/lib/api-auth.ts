// ===== API Route 認証ヘルパー =====
// 全API Routeの先頭で呼び出し、未認証なら401を返す。

import { NextResponse } from 'next/server';
import { verifySession } from './auth';

/**
 * API Route の認証チェック。
 * @returns null なら認証OK。NextResponse なら認証NG（そのままreturnすること）。
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const isValid = await verifySession();
  if (!isValid) {
    return NextResponse.json(
      { error: '認証が必要です' },
      { status: 401 }
    );
  }
  return null;
}
