// ===== 会話状態管理 =====
// Supabase接続時はDBに永続化、未接続時はインメモリfallback

import type { AxisScores, LevelBand } from './types';
import type { LineProfile } from './line-types';
import { getSupabaseServer } from './supabase';

/** 会話フェーズ */
export type ConversationState =
  | { phase: 'idle' }
  | { phase: 'welcome_sent' }
  | { phase: 'source_question' }
  | { phase: 'consent_pending' }
  | { phase: 'industry_select' }
  | { phase: 'diagnosis'; questionIndex: number; scores: Partial<AxisScores> }
  | { phase: 'diagnosis_complete'; scores: AxisScores }
  // Stage 2: バンドサーベイ（15問・3択、~5分）→ Lv.10刻みバンドを判定
  | { phase: 'band_survey'; questionIndex: number; answers: number[] }
  // Stage 3: 精密ヒアリング（30問・5択、~15分）→ 1単位でレベルを確定
  | { phase: 'precision_interview'; questionIndex: number; answers: number[]; targetBand: LevelBand }
  | { phase: 'step_ready'; weakAxis: keyof AxisScores; completedStepIds: string[]; stumbleCount: number; stumbleHowCount: number }
  | { phase: 'step_active'; currentStepId: string; weakAxis: keyof AxisScores; completedStepIds: string[]; stumbleCount: number; stumbleHowCount: number };

/** ユーザーごとの会話データ */
export interface UserConversation {
  lineUserId: string;
  userId: string | null;
  state: ConversationState;
  preferredName: string | null;
  industry: string | null;
  leadSource: string | null;
  createdAt: string;
}

/** Supabase conversation_states テーブルの行型 */
interface ConversationStateRow {
  line_user_id: string;
  user_id: string | null;
  state: ConversationState;
  preferred_name: string | null;
  industry: string | null;
  lead_source: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * インメモリの会話状態ストア（Supabase未接続時のfallback + キャッシュ）
 * LRU的に500件上限
 */
const MAX_STORE_SIZE = 500;
const conversationStore = new Map<string, UserConversation>();

/**
 * ストアサイズを上限以下に保つ
 */
function enforceMaxSize(): void {
  if (conversationStore.size <= MAX_STORE_SIZE) return;

  // 最も古いエントリを削除（MapはinsertionOrder）
  const keysToDelete: string[] = [];
  const deleteCount = conversationStore.size - MAX_STORE_SIZE;
  let count = 0;

  for (const key of conversationStore.keys()) {
    if (count >= deleteCount) break;
    keysToDelete.push(key);
    count++;
  }

  for (const key of keysToDelete) {
    conversationStore.delete(key);
  }
}

/**
 * DBの行をUserConversationに変換
 */
function mapRowToConversation(row: ConversationStateRow): UserConversation {
  return {
    lineUserId: row.line_user_id,
    userId: row.user_id,
    state: row.state,
    preferredName: row.preferred_name,
    industry: row.industry,
    leadSource: row.lead_source,
    createdAt: row.created_at,
  };
}

/**
 * ユーザーの会話状態を取得
 */
export async function getState(lineUserId: string): Promise<UserConversation | null> {
  // まずインメモリキャッシュを確認
  const cached = conversationStore.get(lineUserId);

  const supabase = getSupabaseServer();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('conversation_states')
        .select('*')
        .eq('line_user_id', lineUserId)
        .single();

      if (error || !data) {
        // DBにない場合はキャッシュを返す
        return cached ?? null;
      }

      const conversation = mapRowToConversation(data as unknown as ConversationStateRow);
      // キャッシュも更新
      conversationStore.delete(lineUserId);
      conversationStore.set(lineUserId, conversation);
      return conversation;
    } catch (err) {
      console.error('[ConversationState] Supabase getState エラー:', err);
      return cached ?? null;
    }
  }

  // Supabase未接続: インメモリのみ
  return cached ?? null;
}

/**
 * ユーザーの会話状態を更新
 */
export async function setState(lineUserId: string, update: Partial<UserConversation>): Promise<void> {
  const existing = conversationStore.get(lineUserId);
  if (!existing) {
    console.warn(`[ConversationState] ユーザー未作成: ${lineUserId}`);
    return;
  }

  const updated: UserConversation = { ...existing, ...update };

  // インメモリ更新（Mapの順序を更新するため一度削除して再挿入）
  conversationStore.delete(lineUserId);
  conversationStore.set(lineUserId, updated);

  // Supabase永続化
  const supabase = getSupabaseServer();
  if (supabase) {
    try {
      await supabase
        .from('conversation_states')
        .upsert({
          line_user_id: lineUserId,
          user_id: updated.userId,
          state: updated.state,
          preferred_name: updated.preferredName,
          industry: updated.industry,
          lead_source: updated.leadSource,
          created_at: updated.createdAt,
          updated_at: new Date().toISOString(),
        });
    } catch (err) {
      console.error('[ConversationState] Supabase setState エラー:', err);
    }
  }
}

/**
 * 新しいユーザーを作成
 */
export async function createUser(lineUserId: string, profile: LineProfile): Promise<UserConversation> {
  const now = new Date().toISOString();
  const displayName = profile.displayName || 'LINE User';

  const conversation: UserConversation = {
    lineUserId,
    userId: lineUserId,
    state: { phase: 'idle' },
    preferredName: displayName,
    industry: null,
    leadSource: null,
    createdAt: now,
  };

  conversationStore.set(lineUserId, conversation);
  enforceMaxSize();

  // Supabase永続化
  const supabase = getSupabaseServer();
  if (supabase) {
    try {
      // usersテーブルにレコードを作成（chat_messagesの外部キー制約を満たすため必須）
      await supabase
        .from('users')
        .upsert(
          {
            id: lineUserId,
            preferred_name: displayName,
            company_name: '',
            industry: '',
            line_user_id: lineUserId,
            profile_picture_url: profile.pictureUrl ?? null,
            status_message: profile.statusMessage ?? null,
            created_at: now,
            updated_at: now,
          },
          { onConflict: 'id' }
        );
    } catch (err) {
      console.error('[ConversationState] Supabase createUser usersテーブル作成エラー:', err);
    }

    try {
      await supabase
        .from('conversation_states')
        .upsert({
          line_user_id: lineUserId,
          user_id: lineUserId,
          state: conversation.state,
          preferred_name: conversation.preferredName,
          industry: conversation.industry,
          lead_source: conversation.leadSource,
          created_at: conversation.createdAt,
          updated_at: now,
        });
    } catch (err) {
      console.error('[ConversationState] Supabase createUser conversation_statesエラー:', err);
    }
  }

  return conversation;
}

/**
 * ストアをクリア（テスト用）
 */
export function clearStore(): void {
  conversationStore.clear();
}
