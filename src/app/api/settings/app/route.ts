// GET /api/settings/app       - 全設定取得 or キー指定取得（?key=xxx）
// PUT /api/settings/app       - 設定値更新（body: { key, value }）

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getAllAppSettings, getAppSetting, setAppSetting } from '@/lib/queries';

/** リクエストボディの型 */
interface PutRequestBody {
  key: string;
  value: Record<string, unknown> | unknown[];
}

/** リクエストボディのバリデーション */
function validatePutBody(body: unknown): body is PutRequestBody {
  if (body === null || typeof body !== 'object') return false;
  const obj = body as Record<string, unknown>;
  if (typeof obj.key !== 'string' || obj.key.trim() === '') return false;
  if (obj.value === undefined || obj.value === null) return false;
  if (typeof obj.value !== 'object') return false;
  return true;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      // 単一キー取得
      const value = await getAppSetting<Record<string, unknown>>(key);
      if (value === null) {
        return NextResponse.json({ data: null });
      }
      return NextResponse.json({ data: value });
    }

    // 全設定取得
    const settings = await getAllAppSettings();
    return NextResponse.json({ data: settings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '設定の取得に失敗しました';
    console.error('[API /settings/app GET]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body: unknown = await request.json();

    if (!validatePutBody(body)) {
      return NextResponse.json(
        { error: 'リクエスト形式が不正です。key(文字列)とvalue(オブジェクト)が必要です。' },
        { status: 400 }
      );
    }

    const result = await setAppSetting(body.key, body.value);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? '設定の保存に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '設定の保存に失敗しました';
    console.error('[API /settings/app PUT]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
