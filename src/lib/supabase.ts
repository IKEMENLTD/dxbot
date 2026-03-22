// ===== Supabase クライアント初期化 =====

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database';

/**
 * Supabase クライアントを生成する。
 * 環境変数が未設定の場合は null を返し、mock-data にフォールバックする。
 */
function initSupabaseClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient<Database>(url, anonKey);
}

/**
 * サーバーサイド用 Supabase クライアント。
 * API Routes / Server Components から使用する。
 */
function initServerSupabaseClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
    },
  });
}

/** クライアントサイド用（シングルトン） */
export const supabase = initSupabaseClient();

/** サーバーサイド用（シングルトン） */
export const supabaseServer = initServerSupabaseClient();
