// GET /api/tags - タグマスター一覧取得

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getAllTags } from '@/lib/queries';

export async function GET(): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const tags = await getAllTags();
    return NextResponse.json({ data: tags });
  } catch (err: unknown) {
    console.error('[API /tags GET]', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'タグの取得に失敗しました' },
      { status: 500 }
    );
  }
}
