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

  // クライアント側で集計
  const metricsMap = new Map<string, { count: number; revenue: number; subsidy_total: number }>();

  for (const row of data ?? []) {
    const existing = metricsMap.get(row.exit_type);
    if (existing) {
      existing.count += 1;
      existing.revenue += row.deal_amount;
      existing.subsidy_total += row.subsidy_amount;
    } else {
      metricsMap.set(row.exit_type, {
        count: 1,
        revenue: row.deal_amount,
        subsidy_total: row.subsidy_amount,
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
