// POST /api/users/[id]/notes - メモ追加

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { addUserNote } from '@/lib/queries';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== 'object' ||
      !('note' in body) ||
      typeof (body as Record<string, unknown>).note !== 'string'
    ) {
      return NextResponse.json(
        { error: 'note フィールドが必要です' },
        { status: 400 }
      );
    }

    const note = (body as Record<string, string>).note.trim();

    if (note.length === 0) {
      return NextResponse.json(
        { error: 'メモの内容が空です' },
        { status: 400 }
      );
    }

    if (note.length > 2000) {
      return NextResponse.json(
        { error: 'メモは2000文字以内で入力してください' },
        { status: 400 }
      );
    }

    const result = await addUserNote(id, note);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'メモの追加に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: { userId: id, note } },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'メモの追加に失敗しました';
    console.error('[API /users/[id]/notes POST]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
