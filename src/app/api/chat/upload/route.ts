// ===== Chat Media Upload API =====
// POST /api/chat/upload
// FormDataで画像を受信 → Supabase Storageにアップロード → 公開URLを返す

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getSupabaseServer } from '@/lib/supabase';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);
const BUCKET_NAME = 'chat-media';

/** MIMEタイプから拡張子を取得 */
function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return map[mimeType] ?? 'bin';
}

/** バケットが存在しなければ作成する（既存なら無視） */
async function ensureBucket(supabase: ReturnType<typeof getSupabaseServer>): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: Array.from(ALLOWED_MIME_TYPES),
  });

  // バケットが既に存在する場合のエラーは無視
  if (error && !error.message.includes('already exists')) {
    console.error('[Upload] バケット作成エラー:', error.message);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      // mock: ダミーURLを返す
      return NextResponse.json({
        url: `https://mock.supabase.co/storage/v1/object/public/${BUCKET_NAME}/mock-${randomUUID()}.png`,
      });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'ファイルが添付されていません。' },
        { status: 400 }
      );
    }

    // MIMEタイプチェック
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `対応していないファイル形式です: ${file.type}。PNG, JPEG, GIF, WebPのみ対応しています。` },
        { status: 400 }
      );
    }

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `ファイルサイズが上限(10MB)を超えています: ${(file.size / (1024 * 1024)).toFixed(1)}MB` },
        { status: 400 }
      );
    }

    // バケット確保
    await ensureBucket(supabase);

    // ファイルをBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // UUIDファイル名で保存
    const ext = getExtension(file.type);
    const fileName = `${randomUUID()}.${ext}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Upload] アップロードエラー:', uploadError.message);
      return NextResponse.json(
        { error: `アップロードに失敗しました: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 公開URLを取得
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return NextResponse.json({
      url: publicUrlData.publicUrl,
    });
  } catch (error: unknown) {
    console.error('[API /chat/upload POST]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'ファイルアップロード中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
