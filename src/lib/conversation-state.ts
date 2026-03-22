// ===== 会話状態管理 =====

import type { AxisScores } from './types';
import type { LineProfile } from './line-types';

/** 会話フェーズ */
export type ConversationState =
  | { phase: 'idle' }
  | { phase: 'welcome_sent' }
  | { phase: 'consent_pending' }
  | { phase: 'industry_select' }
  | { phase: 'diagnosis'; questionIndex: number; scores: Partial<AxisScores> }
  | { phase: 'diagnosis_complete'; scores: AxisScores }
  | { phase: 'step_active'; currentStep: number };

/** ユーザーごとの会話データ */
export interface UserConversation {
  lineUserId: string;
  state: ConversationState;
  preferredName: string | null;
  industry: string | null;
  leadSource: string | null;
  createdAt: string;
}

/**
 * インメモリの会話状態ストア（将来的にはSupabase移行）
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
 * ユーザーの会話状態を取得
 */
export function getState(lineUserId: string): UserConversation | null {
  return conversationStore.get(lineUserId) ?? null;
}

/**
 * ユーザーの会話状態を更新
 */
export function setState(lineUserId: string, update: Partial<UserConversation>): void {
  const existing = conversationStore.get(lineUserId);
  if (!existing) {
    console.warn(`[ConversationState] ユーザー未作成: ${lineUserId}`);
    return;
  }

  // Mapの順序を更新するため一度削除して再挿入
  conversationStore.delete(lineUserId);
  conversationStore.set(lineUserId, { ...existing, ...update });
}

/**
 * 新しいユーザーを作成
 */
export function createUser(lineUserId: string, profile: LineProfile): UserConversation {
  const conversation: UserConversation = {
    lineUserId,
    state: { phase: 'idle' },
    preferredName: profile.displayName || null,
    industry: null,
    leadSource: null,
    createdAt: new Date().toISOString(),
  };

  conversationStore.set(lineUserId, conversation);
  enforceMaxSize();

  return conversation;
}

/**
 * ストアをクリア（テスト用）
 */
export function clearStore(): void {
  conversationStore.clear();
}
