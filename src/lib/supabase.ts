// ===== Supabase クライアント初期化 =====
// サーバーサイド専用。クライアントサイドからのSupabase直接アクセスは禁止。

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database';

/**
 * サーバーサイド専用 Supabase クライアントを生成する。
 * service_role キーを使用し、RLS をバイパスする。
 * 環境変数が未設定の場合は null を返し、mock-data にフォールバックする。
 */
export function getSupabaseServer(): SupabaseClient<Database> | null {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
