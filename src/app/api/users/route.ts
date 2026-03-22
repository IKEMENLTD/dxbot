// GET /api/users - 全ユーザー取得

import { NextResponse } from 'next/server';
import { getUsers } from '@/lib/queries';

export async function GET(): Promise<NextResponse> {
  try {
    const users = await getUsers();
    return NextResponse.json({ data: users });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ユーザー一覧の取得に失敗しました';
    console.error('[API /users GET]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
