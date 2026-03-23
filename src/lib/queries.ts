// ===== データ取得関数群 =====
// Supabase 接続時は DB から、未接続時は mock-data にフォールバック

import { getSupabaseServer } from './supabase';
import {
  mockUsers,
  mockDeals,
  mockCtaHistory,
  mockTimeline,
  mockStumbles,
  mockFunnelKpi,
  mockExitMetrics,
} from './mock-data';
import { mockMessages } from './mock-messages';
import type {
  User,
  Deal,
  CtaHistory,
  TimelineEvent,
  StumbleRecord,
  FunnelKpi,
  ExitMetrics,
  CustomerStatus,
} from './types';
import type {
  ChatMessageRow,
  SaveMessageParams,
  ChatMessage,
} from './chat-types';
import { toClientMessage } from './chat-types';

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/** 全ユーザー取得（スコア降順） */
export async function getUsers(): Promise<User[]> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return [...mockUsers].sort((a, b) => b.score - a.score);
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('score', { ascending: false });

  if (error) {
    console.error('[getUsers] Supabase error:', error.message);
    return [...mockUsers].sort((a, b) => b.score - a.score);
  }

  return (data ?? []) as unknown as User[];
}

/** ユーザー詳細取得 */
export async function getUserById(id: string): Promise<User | null> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return mockUsers.find((u) => u.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[getUserById] Supabase error:', error.message);
    return mockUsers.find((u) => u.id === id) ?? null;
  }

  return (data ?? null) as unknown as User | null;
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

/** 全成約取得 */
export async function getDeals(): Promise<Deal[]> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return mockDeals;
  }

  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .order('started_at', { ascending: false });

  if (error) {
    console.error('[getDeals] Supabase error:', error.message);
    return mockDeals;
  }

  return (data ?? []) as unknown as Deal[];
}

/** ユーザーの成約履歴 */
export async function getDealsByUserId(userId: string): Promise<Deal[]> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return mockDeals.filter((d) => d.user_id === userId);
  }

  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  if (error) {
    console.error('[getDealsByUserId] Supabase error:', error.message);
    return mockDeals.filter((d) => d.user_id === userId);
  }

  return (data ?? []) as unknown as Deal[];
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

/** ユーザーのタイムライン */
export async function getTimelineByUserId(userId: string): Promise<TimelineEvent[]> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return mockTimeline.filter((t) => t.user_id === userId);
  }

  const { data, error } = await supabase
    .from('user_timeline')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getTimelineByUserId] Supabase error:', error.message);
    return mockTimeline.filter((t) => t.user_id === userId);
  }

  return (data ?? []) as unknown as TimelineEvent[];
}

// ---------------------------------------------------------------------------
// Stumbles
// ---------------------------------------------------------------------------

/** ユーザーのstumble履歴 */
export async function getStumblesByUserId(userId: string): Promise<StumbleRecord[]> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return mockStumbles.filter((s) => s.user_id === userId);
  }

  const { data, error } = await supabase
    .from('user_steps')
    .select('id, user_id, step_id, step_name, stumble_type, created_at')
    .eq('user_id', userId)
    .not('stumble_type', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getStumblesByUserId] Supabase error:', error.message);
    return mockStumbles.filter((s) => s.user_id === userId);
  }

  return (data ?? []) as unknown as StumbleRecord[];
}

// ---------------------------------------------------------------------------
// CTA History
// ---------------------------------------------------------------------------

/** CTA履歴全件 */
export async function getCtaHistory(): Promise<CtaHistory[]> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return mockCtaHistory;
  }

  const { data, error } = await supabase
    .from('cta_history')
    .select('*')
    .order('fired_at', { ascending: false });

  if (error) {
    console.error('[getCtaHistory] Supabase error:', error.message);
    return mockCtaHistory;
  }

  return (data ?? []) as unknown as CtaHistory[];
}

// ---------------------------------------------------------------------------
// KPI
// ---------------------------------------------------------------------------

/** ファネルKPI */
export async function getFunnelKpi(): Promise<FunnelKpi[]> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return mockFunnelKpi;
  }

  const { data, error } = await supabase
    .from('weekly_kpi_view')
    .select('*');

  if (error) {
    console.error('[getFunnelKpi] Supabase error:', error.message);
    return mockFunnelKpi;
  }

  return (data ?? []) as unknown as FunnelKpi[];
}

/** 出口別メトリクス */
export async function getExitMetrics(): Promise<ExitMetrics[]> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return mockExitMetrics;
  }

  // 集計クエリ: deals テーブルから exit_type 別に集計
  const { data, error } = await supabase
    .from('deals')
    .select('exit_type, deal_amount, subsidy_amount');

  if (error) {
    console.error('[getExitMetrics] Supabase error:', error.message);
    return mockExitMetrics;
  }

  // クライアント側で集計（null/undefined安全）
  const metricsMap = new Map<string, { count: number; revenue: number; subsidy_total: number }>();

  for (const row of data ?? []) {
    // exit_type が null/undefined の行はスキップ
    if (row.exit_type == null) continue;

    const dealAmount = typeof row.deal_amount === 'number' ? row.deal_amount : 0;
    const subsidyAmount = typeof row.subsidy_amount === 'number' ? row.subsidy_amount : 0;

    const existing = metricsMap.get(row.exit_type);
    if (existing) {
      existing.count += 1;
      existing.revenue += dealAmount;
      existing.subsidy_total += subsidyAmount;
    } else {
      metricsMap.set(row.exit_type, {
        count: 1,
        revenue: dealAmount,
        subsidy_total: subsidyAmount,
      });
    }
  }

  const result: ExitMetrics[] = [];
  for (const [exitType, metrics] of metricsMap) {
    result.push({
      exit_type: exitType as ExitMetrics['exit_type'],
      ...metrics,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** ユーザーステータス更新 */
export async function updateUserStatus(
  userId: string,
  status: CustomerStatus
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    // mock: ローカル配列を更新
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: 'ユーザーが見つかりません' };
    }
    user.customer_status = status;
    return { success: true };
  }

  const { error } = await supabase
    .from('users')
    .update({ customer_status: status })
    .eq('id', userId);

  if (error) {
    console.error('[updateUserStatus] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/** メモ追加（タイムラインにnote_addedイベントを追加） */
export async function addUserNote(
  userId: string,
  note: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    // mock: タイムラインに追加
    const newEvent: TimelineEvent = {
      id: `t-mock-${Date.now()}`,
      user_id: userId,
      type: 'note_added',
      description: `営業メモ: ${note}`,
      metadata: {},
      created_at: new Date().toISOString(),
    };
    mockTimeline.unshift(newEvent);
    return { success: true };
  }

  const { error } = await supabase
    .from('user_timeline')
    .insert({
      user_id: userId,
      type: 'note_added' as const,
      description: `営業メモ: ${note}`,
      metadata: {},
    });

  if (error) {
    console.error('[addUserNote] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Chat Messages
// ---------------------------------------------------------------------------

const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LIMIT = 200;

/** メッセージを保存 */
export async function saveMessage(
  params: SaveMessageParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    // mock: ローカル配列に追加
    const mockMsg: ChatMessage = {
      id: `msg-mock-${Date.now()}`,
      userId: params.userId,
      sender: params.direction === 'inbound' ? 'user' : 'admin',
      content: params.content,
      timestamp: new Date().toISOString(),
      read: false,
    };
    mockMessages.push(mockMsg);
    return { success: true, id: mockMsg.id };
  }

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: params.userId,
        sender: params.direction === 'inbound' ? 'user' : 'admin',
        content: params.content,
        direction: params.direction,
        line_user_id: params.lineUserId ?? null,
        line_message_id: params.lineMessageId ?? null,
        message_type: params.messageType ?? 'text',
        sent_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[saveMessage] Supabase error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'メッセージ保存中に不明なエラーが発生しました';
    console.error('[saveMessage] エラー:', msg);
    return { success: false, error: msg };
  }
}

/** ユーザーのメッセージ一覧を取得 */
export async function getMessages(
  userId: string,
  limit?: number,
  offset?: number
): Promise<ChatMessage[]> {
  const safeLimit = Math.min(limit ?? DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LIMIT);
  const safeOffset = offset ?? 0;

  const supabase = getSupabaseServer();
  if (!supabase) {
    const userMsgs = mockMessages
      .filter((m) => m.userId === userId)
      .slice(safeOffset, safeOffset + safeLimit);
    return userMsgs;
  }

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: true })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (error) {
      console.error('[getMessages] Supabase error:', error.message);
      return mockMessages.filter((m) => m.userId === userId);
    }

    return (data ?? []).map((row) => toClientMessage(row as unknown as ChatMessageRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'メッセージ取得中に不明なエラーが発生しました';
    console.error('[getMessages] エラー:', msg);
    return [];
  }
}

/** since以降の新着メッセージ取得（ポーリング用） */
export async function getMessagesSince(
  userId: string,
  since: string,
  limit?: number
): Promise<ChatMessage[]> {
  const safeLimit = Math.min(limit ?? DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LIMIT);

  const supabase = getSupabaseServer();
  if (!supabase) {
    return mockMessages.filter(
      (m) => m.userId === userId && new Date(m.timestamp) > new Date(since)
    );
  }

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .gt('sent_at', since)
      .order('sent_at', { ascending: true })
      .limit(safeLimit);

    if (error) {
      console.error('[getMessagesSince] Supabase error:', error.message);
      return [];
    }

    return (data ?? []).map((row) => toClientMessage(row as unknown as ChatMessageRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : '新着メッセージ取得中に不明なエラーが発生しました';
    console.error('[getMessagesSince] エラー:', msg);
    return [];
  }
}

/** 複数ユーザーの最新メッセージ取得（コンタクトリスト用） */
export async function getLatestMessages(
  userIds: string[]
): Promise<Record<string, ChatMessage>> {
  if (userIds.length === 0) return {};

  const supabase = getSupabaseServer();
  if (!supabase) {
    const result: Record<string, ChatMessage> = {};
    for (const uid of userIds) {
      const msgs = mockMessages.filter((m) => m.userId === uid);
      if (msgs.length > 0) {
        result[uid] = msgs[msgs.length - 1];
      }
    }
    return result;
  }

  try {
    // 全件取得してクライアント側で各ユーザーの最新を抽出
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .in('user_id', userIds)
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('[getLatestMessages] Supabase error:', error.message);
      return {};
    }

    const result: Record<string, ChatMessage> = {};
    for (const row of data ?? []) {
      const converted = toClientMessage(row as unknown as ChatMessageRow);
      // 最初に見つかったものが最新（sent_at DESCでソート済み）
      if (!result[converted.userId]) {
        result[converted.userId] = converted;
      }
    }

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '最新メッセージ取得中に不明なエラーが発生しました';
    console.error('[getLatestMessages] エラー:', msg);
    return {};
  }
}

/** ユーザーの未読メッセージを既読にする */
export async function markAsRead(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    // mock: フラグを更新
    for (const msg of mockMessages) {
      if (msg.userId === userId && msg.sender === 'user' && !msg.read) {
        msg.read = true;
      }
    }
    return { success: true };
  }

  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('chat_messages')
      .update({ read: true, read_at: now })
      .eq('user_id', userId)
      .eq('sender', 'user')
      .eq('read', false);

    if (error) {
      console.error('[markAsRead] Supabase error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '既読更新中に不明なエラーが発生しました';
    console.error('[markAsRead] エラー:', msg);
    return { success: false, error: msg };
  }
}

/** 全ユーザー横断で since 以降の新着メッセージを取得（ポーリング用） */
export async function getAllMessagesSince(
  since: string,
  limit?: number
): Promise<ChatMessage[]> {
  const safeLimit = Math.min(limit ?? DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LIMIT);

  const supabase = getSupabaseServer();
  if (!supabase) {
    return mockMessages.filter(
      (m) => new Date(m.timestamp) > new Date(since)
    ).slice(0, safeLimit);
  }

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .gt('sent_at', since)
      .order('sent_at', { ascending: true })
      .limit(safeLimit);

    if (error) {
      console.error('[getAllMessagesSince] Supabase error:', error.message);
      return [];
    }

    return (data ?? []).map((row) => toClientMessage(row as unknown as ChatMessageRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : '全ユーザー新着メッセージ取得中に不明なエラーが発生しました';
    console.error('[getAllMessagesSince] エラー:', msg);
    return [];
  }
}

/** 全ユーザーの未読数を一括取得（コンタクトリスト用） */
export async function getUnreadCounts(
  userIds: string[]
): Promise<Record<string, number>> {
  if (userIds.length === 0) return {};

  const supabase = getSupabaseServer();
  if (!supabase) {
    const result: Record<string, number> = {};
    for (const uid of userIds) {
      result[uid] = mockMessages.filter(
        (m) => m.userId === uid && m.sender === 'user' && !m.read
      ).length;
    }
    return result;
  }

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('user_id')
      .in('user_id', userIds)
      .eq('sender', 'user')
      .eq('read', false);

    if (error) {
      console.error('[getUnreadCounts] Supabase error:', error.message);
      return {};
    }

    const result: Record<string, number> = {};
    for (const row of data ?? []) {
      const uid = (row as { user_id: string }).user_id;
      result[uid] = (result[uid] ?? 0) + 1;
    }
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未読数一括取得中に不明なエラーが発生しました';
    console.error('[getUnreadCounts] エラー:', msg);
    return {};
  }
}

// ---------------------------------------------------------------------------
// LINE User ID 取得
// ---------------------------------------------------------------------------

/** usersテーブルからline_user_idを取得 */
export async function getLineUserIdByUserId(
  userId: string
): Promise<string | null> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    // mock: mockUsersにline_user_idフィールドがないためnullを返す
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('line_user_id')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[getLineUserIdByUserId] Supabase error:', error.message);
      return null;
    }

    return (data as { line_user_id: string | null } | null)?.line_user_id ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'LINE User ID取得中に不明なエラーが発生しました';
    console.error('[getLineUserIdByUserId] エラー:', msg);
    return null;
  }
}

/** usersテーブルのline_user_idを更新（followイベント時に使用） */
export async function updateUserLineUserId(
  userId: string,
  lineUserId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    // mock: 何もしない
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ line_user_id: lineUserId })
      .eq('id', userId);

    if (error) {
      console.error('[updateUserLineUserId] Supabase error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'LINE User ID更新中に不明なエラーが発生しました';
    console.error('[updateUserLineUserId] エラー:', msg);
    return { success: false, error: msg };
  }
}

/** ユーザーの未読数を取得 */
export async function getUnreadCount(
  userId: string
): Promise<number> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return mockMessages.filter(
      (m) => m.userId === userId && m.sender === 'user' && !m.read
    ).length;
  }

  try {
    const { count, error } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('sender', 'user')
      .eq('read', false);

    if (error) {
      console.error('[getUnreadCount] Supabase error:', error.message);
      return 0;
    }

    return count ?? 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未読数取得中に不明なエラーが発生しました';
    console.error('[getUnreadCount] エラー:', msg);
    return 0;
  }
}
