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
  mockTags,
} from './mock-data';
import { mockMessages } from './mock-messages';
import type {
  User,
  UserTag,
  Deal,
  CtaHistory,
  TimelineEvent,
  StumbleRecord,
  StumbleType,
  FunnelKpi,
  ExitMetrics,
  CustomerStatus,
  TrackingPerformance,
  TrackingClickDetail,
} from './types';
import type {
  ChatMessageRow,
  SaveMessageParams,
  ChatMessage,
} from './chat-types';
import { toClientMessage } from './chat-types';

// ---------------------------------------------------------------------------
// App Settings
// ---------------------------------------------------------------------------

/** 単一の設定値を取得 */
export async function getAppSetting<T>(key: string): Promise<T | null> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      // PGRST116 = 行が見つからない（正常系）
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('[getAppSetting] Supabase error:', error.message);
      return null;
    }

    return (data?.value ?? null) as T | null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '設定値取得中にエラーが発生しました';
    console.error('[getAppSetting] エラー:', msg);
    return null;
  }
}

/** 設定値をupsert（なければINSERT、あればUPDATE） */
export async function setAppSetting(
  key: string,
  value: Record<string, unknown> | unknown[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { success: false, error: 'データベース未接続です' };
  }

  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key,
          value: value as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('[setAppSetting] Supabase error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '設定値保存中にエラーが発生しました';
    console.error('[setAppSetting] エラー:', msg);
    return { success: false, error: msg };
  }
}

/** 全設定値を取得 */
export async function getAllAppSettings(): Promise<Record<string, unknown>> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return {};
  }

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value');

    if (error) {
      console.error('[getAllAppSettings] Supabase error:', error.message);
      return {};
    }

    const result: Record<string, unknown> = {};
    for (const row of data ?? []) {
      result[row.key] = row.value;
    }
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '全設定値取得中にエラーが発生しました';
    console.error('[getAllAppSettings] エラー:', msg);
    return {};
  }
}

/** 設定値を削除 */
export async function deleteAppSetting(
  key: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { success: false, error: 'データベース未接続です' };
  }

  try {
    const { error } = await supabase
      .from('app_settings')
      .delete()
      .eq('key', key);

    if (error) {
      console.error('[deleteAppSetting] Supabase error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '設定値削除中にエラーが発生しました';
    console.error('[deleteAppSetting] エラー:', msg);
    return { success: false, error: msg };
  }
}

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

/** TECHSTARS修了登録（customer_status + techstars_completed_at 同時更新） */
export async function completeTechstars(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();
  const supabase = getSupabaseServer();
  if (!supabase) {
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: 'ユーザーが見つかりません' };
    }
    user.customer_status = 'techstars_grad';
    user.techstars_completed_at = now;
    return { success: true };
  }

  const { error } = await supabase
    .from('users')
    .update({
      customer_status: 'techstars_grad',
      techstars_completed_at: now,
    })
    .eq('id', userId);

  if (error) {
    console.error('[completeTechstars] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/** 再診断のためconversation_statesのフェーズをリセット */
export async function resetConversationForRediagnosis(
  lineUserId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    // mock: 何もしない（conversation_stateはインメモリ管理）
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('conversation_states')
      .update({
        state: { phase: 'consent_pending' },
        updated_at: new Date().toISOString(),
      })
      .eq('line_user_id', lineUserId);

    if (error) {
      console.error('[resetConversationForRediagnosis] Supabase error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '会話状態リセット中に不明なエラーが発生しました';
    console.error('[resetConversationForRediagnosis] エラー:', msg);
    return { success: false, error: msg };
  }
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
): Promise<{ success: boolean; id?: string; sentAt?: string; error?: string }> {
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
    // media_attachmentsをRecord<string, unknown>[]に変換（DB型に合わせる）
    const mediaForDb: Record<string, unknown>[] | undefined =
      params.mediaAttachments && params.mediaAttachments.length > 0
        ? params.mediaAttachments.map((m) => ({
            id: m.id,
            type: m.type,
            url: m.url,
            name: m.name,
            size: m.size,
            mimeType: m.mimeType,
          }))
        : undefined;

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
        ...(mediaForDb ? { media_attachments: mediaForDb } : {}),
      })
      .select('id, sent_at')
      .single();

    if (error) {
      console.error('[saveMessage] Supabase error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id, sentAt: data?.sent_at };
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
      .update({ read_at: now })
      .eq('user_id', userId)
      .eq('sender', 'user')
      .is('read_at', null);

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
      .is('read_at', null);

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

/** usersテーブルのプロフィール画像URLとステータスメッセージを更新 */
export async function updateUserProfile(
  userId: string,
  pictureUrl: string | null,
  statusMessage: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({
        profile_picture_url: pictureUrl ?? null,
        status_message: statusMessage ?? null,
      })
      .eq('line_user_id', userId);

    if (error) {
      console.error('[updateUserProfile] Supabase error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'プロフィール更新中に不明なエラーが発生しました';
    console.error('[updateUserProfile] エラー:', msg);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Reminder (リマインダー)
// ---------------------------------------------------------------------------

/** リマインダー対象ユーザーの型 */
export interface ReminderTargetUser {
  id: string;
  line_user_id: string;
  last_action_at: string;
  customer_status: CustomerStatus;
  last_completed_step: string | null;
  paused_until: string | null;
}

/**
 * リマインダー対象ユーザーを取得
 * - last_action_at が minDaysAgo 日以上前
 * - paused_until が null または過去
 * - customer_status が active/prospect のみ
 * - line_user_id が設定されている
 */
export async function getReminderTargetUsers(
  minDaysAgo: number
): Promise<ReminderTargetUser[]> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return [];
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - minDaysAgo);
    const cutoffIso = cutoffDate.toISOString();
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .select('id, line_user_id, last_action_at, customer_status, last_completed_step, paused_until')
      .lt('last_action_at', cutoffIso)
      .in('customer_status', ['prospect', 'contacted'])
      .not('line_user_id', 'is', null);

    if (error) {
      console.error('[getReminderTargetUsers] Supabase error:', error.message);
      return [];
    }

    // paused_until が未来のユーザーをフィルタリング
    const filtered = (data ?? []).filter((user) => {
      if (user.paused_until && new Date(user.paused_until as string) > new Date(nowIso)) {
        return false;
      }
      return true;
    });

    return filtered as unknown as ReminderTargetUser[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'リマインダー対象ユーザー取得中にエラーが発生しました';
    console.error('[getReminderTargetUsers] エラー:', msg);
    return [];
  }
}

/**
 * 本日すでにリマインダーを送信済みかチェック
 */
export async function hasReminderSentToday(userId: string): Promise<boolean> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return false;
  }

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('user_timeline')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'reminder_sent')
      .gte('created_at', todayStart.toISOString());

    if (error) {
      console.error('[hasReminderSentToday] Supabase error:', error.message);
      return false;
    }

    return (count ?? 0) > 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'リマインダー送信チェック中にエラーが発生しました';
    console.error('[hasReminderSentToday] エラー:', msg);
    return false;
  }
}

/**
 * リマインダー送信をタイムラインに記録
 */
export async function recordReminderSent(
  userId: string,
  reminderLevel: string
): Promise<void> {
  const supabase = getSupabaseServer();
  if (!supabase) return;

  try {
    await supabase
      .from('user_timeline')
      .insert({
        id: `${userId}_reminder_${Date.now()}`,
        user_id: userId,
        type: 'reminder_sent',
        description: `リマインダー送信（${reminderLevel}）`,
        metadata: { reminder_level: reminderLevel },
      });
  } catch (err) {
    console.error('[recordReminderSent] エラー:', err);
  }
}

/**
 * paused_until を更新（一時停止設定）
 */
export async function updatePausedUntil(
  userId: string,
  pausedUntil: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ paused_until: pausedUntil })
      .eq('id', userId);

    if (error) {
      console.error('[updatePausedUntil] Supabase error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'paused_until更新中にエラーが発生しました';
    console.error('[updatePausedUntil] エラー:', msg);
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
      .is('read_at', null);

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

// ---------------------------------------------------------------------------
// Recent Stumbles (CTA・レコメンド用)
// ---------------------------------------------------------------------------

/** ユーザーの最近のstumble履歴を取得（stepId + type） */
export async function getRecentStumbles(
  userId: string
): Promise<Array<{ stepId: string; type: StumbleType }>> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    // mock: mockStumblesから取得
    return mockStumbles
      .filter((s) => s.user_id === userId)
      .map((s) => ({ stepId: s.step_id, type: s.stumble_type }));
  }

  try {
    const { data, error } = await supabase
      .from('user_steps')
      .select('step_id, stumble_type')
      .eq('user_id', userId)
      .not('stumble_type', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getRecentStumbles] Supabase error:', error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      stepId: (row as { step_id: string; stumble_type: StumbleType }).step_id,
      type: (row as { step_id: string; stumble_type: StumbleType }).stumble_type,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'stumble履歴取得中にエラーが発生しました';
    console.error('[getRecentStumbles] エラー:', msg);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Recent Completed Steps (CTA用)
// ---------------------------------------------------------------------------

/** 指定期間内に完了したステップ数を取得 */
export async function getRecentCompletedStepCount(
  userId: string,
  days: number
): Promise<number> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return 0;
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffIso = cutoffDate.toISOString();

    const { count, error } = await supabase
      .from('user_steps')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', cutoffIso);

    if (error) {
      console.error('[getRecentCompletedStepCount] Supabase error:', error.message);
      return 0;
    }

    return count ?? 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '最近の完了ステップ数取得中にエラーが発生しました';
    console.error('[getRecentCompletedStepCount] エラー:', msg);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Tracking Links（流入元管理）
// ---------------------------------------------------------------------------

import type { TrackingLink } from './types';

/** モックトラッキングリンク */
const mockTrackingLinks: TrackingLink[] = [
  {
    id: 'tl-001',
    code: 'abc12345',
    label: 'LINE広告（3月）',
    lead_source: 'x',
    destination_url: 'https://lin.ee/example',
    click_count: 42,
    is_active: true,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-20T00:00:00Z',
  },
  {
    id: 'tl-002',
    code: 'def67890',
    label: 'Threads投稿リンク',
    lead_source: 'threads',
    destination_url: 'https://lin.ee/example',
    click_count: 18,
    is_active: true,
    created_at: '2026-03-05T00:00:00Z',
    updated_at: '2026-03-18T00:00:00Z',
  },
];

/** ランダムコード生成（8文字の英小文字+数字） */
function generateTrackingCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** 全トラッキングリンク取得 */
export async function getTrackingLinks(): Promise<TrackingLink[]> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return [...mockTrackingLinks];
  }

  try {
    const { data, error } = await supabase
      .from('tracking_links')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getTrackingLinks] Supabase error:', error.message);
      return [...mockTrackingLinks];
    }

    return (data ?? []) as unknown as TrackingLink[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'トラッキングリンク取得中にエラーが発生しました';
    console.error('[getTrackingLinks] エラー:', msg);
    return [...mockTrackingLinks];
  }
}

/** トラッキングリンク作成 */
export async function createTrackingLink(
  label: string,
  leadSource: string,
  destinationUrl: string
): Promise<TrackingLink | null> {
  const code = generateTrackingCode();

  const supabase = getSupabaseServer();
  if (!supabase) {
    const newLink: TrackingLink = {
      id: `tl-mock-${Date.now()}`,
      code,
      label,
      lead_source: leadSource,
      destination_url: destinationUrl,
      click_count: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockTrackingLinks.unshift(newLink);
    return newLink;
  }

  try {
    const { data, error } = await supabase
      .from('tracking_links')
      .insert({
        code,
        label,
        lead_source: leadSource,
        destination_url: destinationUrl,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[createTrackingLink] Supabase error:', error.message);
      return null;
    }

    return (data ?? null) as unknown as TrackingLink | null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'トラッキングリンク作成中にエラーが発生しました';
    console.error('[createTrackingLink] エラー:', msg);
    return null;
  }
}

/** トラッキングリンク更新 */
export async function updateTrackingLink(
  id: string,
  updates: { label?: string; is_active?: boolean }
): Promise<boolean> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    const link = mockTrackingLinks.find((l) => l.id === id);
    if (!link) return false;
    if (updates.label !== undefined) link.label = updates.label;
    if (updates.is_active !== undefined) link.is_active = updates.is_active;
    link.updated_at = new Date().toISOString();
    return true;
  }

  try {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.label !== undefined) updateData.label = updates.label;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

    const { error } = await supabase
      .from('tracking_links')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('[updateTrackingLink] Supabase error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'トラッキングリンク更新中にエラーが発生しました';
    console.error('[updateTrackingLink] エラー:', msg);
    return false;
  }
}

/** トラッキングリンク無効化（論理削除） */
export async function deactivateTrackingLink(id: string): Promise<boolean> {
  return updateTrackingLink(id, { is_active: false });
}

/** トラッキングリンク物理削除 */
export async function deleteTrackingLinkPermanently(id: string): Promise<boolean> {
  const supabase = getSupabaseServer();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('tracking_links')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[deleteTrackingLinkPermanently] Supabase error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'トラッキングリンク削除中にエラーが発生しました';
    console.error('[deleteTrackingLinkPermanently] エラー:', msg);
    return false;
  }
}

/** クリックカウント+1 → destination_url を返す */
export async function incrementClickCount(code: string): Promise<string | null> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    const link = mockTrackingLinks.find((l) => l.code === code && l.is_active);
    if (!link) return null;
    link.click_count += 1;
    return link.destination_url;
  }

  try {
    // まずリンクを取得
    const { data: linkData, error: selectError } = await supabase
      .from('tracking_links')
      .select('id, destination_url, click_count')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (selectError || !linkData) {
      return null;
    }

    const typedLink = linkData as unknown as { id: string; destination_url: string; click_count: number };

    // click_count を +1
    const { error: updateError } = await supabase
      .from('tracking_links')
      .update({
        click_count: typedLink.click_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', typedLink.id);

    if (updateError) {
      console.error('[incrementClickCount] update error:', updateError.message);
    }

    return typedLink.destination_url;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'クリックカウント更新中にエラーが発生しました';
    console.error('[incrementClickCount] エラー:', msg);
    return null;
  }
}

/** ユーザーのlead_sourceを更新 */
export async function updateUserLeadSource(
  userId: string,
  leadSource: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { success: true };
  }

  try {
    const validSources = ['apo', 'threads', 'x', 'instagram', 'referral', 'other'] as const;
    type ValidSource = typeof validSources[number];
    const source: ValidSource = validSources.includes(leadSource as ValidSource)
      ? (leadSource as ValidSource)
      : 'other';

    const { error } = await supabase
      .from('users')
      .update({ lead_source: source })
      .eq('id', userId);

    if (error) {
      console.error('[updateUserLeadSource] Supabase error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'lead_source更新中にエラーが発生しました';
    console.error('[updateUserLeadSource] エラー:', msg);
    return { success: false, error: msg };
  }
}

/** ユーザーのtracking_link_idを更新 */
export async function updateUserTrackingLinkId(
  userId: string,
  trackingLinkId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ tracking_link_id: trackingLinkId })
      .eq('id', userId);

    if (error) {
      console.error('[updateUserTrackingLinkId] Supabase error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'tracking_link_id更新中にエラーが発生しました';
    console.error('[updateUserTrackingLinkId] エラー:', msg);
    return { success: false, error: msg };
  }
}

/** トラッキングクリックデータを保存 */
export interface TrackingClickInput {
  trackingLinkId: string;
  deviceType: string | null;
  os: string | null;
  browser: string | null;
  referer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  language: string | null;
  country: string | null;
}

export async function saveTrackingClick(
  input: TrackingClickInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('tracking_clicks')
      .insert({
        tracking_link_id: input.trackingLinkId,
        device_type: input.deviceType,
        os: input.os,
        browser: input.browser,
        referer: input.referer,
        utm_source: input.utmSource,
        utm_medium: input.utmMedium,
        utm_campaign: input.utmCampaign,
        utm_content: input.utmContent,
        language: input.language,
        country: input.country,
      });

    if (error) {
      console.error('[saveTrackingClick] Supabase error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'クリックデータ保存中にエラーが発生しました';
    console.error('[saveTrackingClick] エラー:', msg);
    return { success: false, error: msg };
  }
}

/** トラッキングリンクIDをcodeから取得 */
export async function getTrackingLinkByCode(
  code: string
): Promise<{ id: string; destination_url: string } | null> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    const link = mockTrackingLinks.find((l) => l.code === code && l.is_active);
    if (!link) return null;
    return { id: link.id, destination_url: link.destination_url };
  }

  try {
    const { data, error } = await supabase
      .from('tracking_links')
      .select('id, destination_url')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    const typedData = data as unknown as { id: string; destination_url: string };
    return typedData;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'トラッキングリンク取得中にエラーが発生しました';
    console.error('[getTrackingLinkByCode] エラー:', msg);
    return null;
  }
}

/** トラッキングパフォーマンス取得 */
export async function getTrackingPerformance(): Promise<TrackingPerformance[]> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    // モックフォールバック
    return mockTrackingLinks.map((link) => ({
      linkId: link.id,
      label: link.label,
      leadSource: link.lead_source,
      clickCount: link.click_count,
      followCount: 0,
      diagnosedCount: 0,
      ctaFiredCount: 0,
      convertedCount: 0,
      diagnosisRate: 0,
      ctaRate: 0,
      conversionRate: 0,
    }));
  }

  try {
    // トラッキングリンク一覧取得
    const { data: links, error: linksErr } = await supabase
      .from('tracking_links')
      .select('id, label, lead_source, click_count')
      .order('created_at', { ascending: false });

    if (linksErr || !links) {
      console.error('[getTrackingPerformance] links error:', linksErr?.message);
      return [];
    }

    const typedLinks = links as unknown as Array<{
      id: string;
      label: string;
      lead_source: string;
      click_count: number;
    }>;

    // 全ユーザーのtracking_link_id別集計
    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('tracking_link_id, steps_completed, customer_status')
      .not('tracking_link_id', 'is', null);

    if (usersErr) {
      console.error('[getTrackingPerformance] users error:', usersErr.message);
    }

    const typedUsers = (users ?? []) as unknown as Array<{
      tracking_link_id: string | null;
      steps_completed: number;
      customer_status: string;
    }>;

    // CTA発火数取得
    const { data: ctaData, error: ctaErr } = await supabase
      .from('cta_history')
      .select('user_id');

    if (ctaErr) {
      console.error('[getTrackingPerformance] cta error:', ctaErr.message);
    }

    const ctaUserIds = new Set(
      ((ctaData ?? []) as unknown as Array<{ user_id: string }>).map((c) => c.user_id)
    );

    // ユーザーID→tracking_link_idのマップ
    const usersByLink = new Map<string, typeof typedUsers>();
    for (const u of typedUsers) {
      if (!u.tracking_link_id) continue;
      const existing = usersByLink.get(u.tracking_link_id) ?? [];
      existing.push(u);
      usersByLink.set(u.tracking_link_id, existing);
    }

    return typedLinks.map((link) => {
      const linkUsers = usersByLink.get(link.id) ?? [];
      const followCount = linkUsers.length;
      const diagnosedCount = linkUsers.filter((u) => u.steps_completed > 0).length;
      const ctaFiredCount = linkUsers.filter((u) => ctaUserIds.has(u.tracking_link_id ?? '')).length;
      const convertedCount = linkUsers.filter((u) => u.customer_status === 'customer').length;

      return {
        linkId: link.id,
        label: link.label,
        leadSource: link.lead_source,
        clickCount: link.click_count,
        followCount,
        diagnosedCount,
        ctaFiredCount,
        convertedCount,
        diagnosisRate: followCount > 0 ? Math.round((diagnosedCount / followCount) * 100) : 0,
        ctaRate: followCount > 0 ? Math.round((ctaFiredCount / followCount) * 100) : 0,
        conversionRate: followCount > 0 ? Math.round((convertedCount / followCount) * 100) : 0,
      };
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'パフォーマンスデータ取得中にエラーが発生しました';
    console.error('[getTrackingPerformance] エラー:', msg);
    return [];
  }
}

/** トラッキングリンクのクリック詳細取得 */
export async function getTrackingClickDetails(
  trackingLinkId: string
): Promise<TrackingClickDetail[]> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('tracking_clicks')
      .select('id, device_type, os, browser, referer, utm_source, utm_medium, utm_campaign, clicked_at')
      .eq('tracking_link_id', trackingLinkId)
      .order('clicked_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[getTrackingClickDetails] Supabase error:', error.message);
      return [];
    }

    const typedData = (data ?? []) as unknown as Array<{
      id: string;
      device_type: string | null;
      os: string | null;
      browser: string | null;
      referer: string | null;
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
      clicked_at: string;
    }>;

    return typedData.map((row) => ({
      id: row.id,
      deviceType: row.device_type,
      os: row.os,
      browser: row.browser,
      referer: row.referer,
      utmSource: row.utm_source,
      utmMedium: row.utm_medium,
      utmCampaign: row.utm_campaign,
      clickedAt: row.clicked_at,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'クリック詳細取得中にエラーが発生しました';
    console.error('[getTrackingClickDetails] エラー:', msg);
    return [];
  }
}

/** 指定期間内の最初と最後の完了ステップ間の日数を取得 */
export async function getRecentCompletedDays(
  userId: string,
  days: number
): Promise<number> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return 0;
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffIso = cutoffDate.toISOString();

    const { data, error } = await supabase
      .from('user_steps')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', cutoffIso)
      .order('completed_at', { ascending: true });

    if (error) {
      console.error('[getRecentCompletedDays] Supabase error:', error.message);
      return 0;
    }

    if (!data || data.length < 2) {
      return 0;
    }

    const first = new Date((data[0] as { completed_at: string }).completed_at);
    const last = new Date((data[data.length - 1] as { completed_at: string }).completed_at);
    const diffMs = last.getTime() - first.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  } catch (err) {
    const msg = err instanceof Error ? err.message : '最近の完了日数取得中にエラーが発生しました';
    console.error('[getRecentCompletedDays] エラー:', msg);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

/** タグマスター一覧を取得 */
export async function getAllTags(): Promise<UserTag[]> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return mockTags;
  }

  try {
    const { data, error } = await supabase
      .from('tags')
      .select('id, label, color')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[getAllTags] Supabase error:', error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      label: row.label as string,
      color: row.color as UserTag['color'],
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'タグ取得中にエラーが発生しました';
    console.error('[getAllTags] エラー:', msg);
    return [];
  }
}

/** ユーザーのタグ配列を更新 */
export async function updateUserTags(
  userId: string,
  tags: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: 'ユーザーが見つかりません' };
    }
    user.tags = tags;
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ tags })
      .eq('id', userId);

    if (error) {
      console.error('[updateUserTags] Supabase error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'タグ更新中にエラーが発生しました';
    console.error('[updateUserTags] エラー:', msg);
    return { success: false, error: msg };
  }
}
