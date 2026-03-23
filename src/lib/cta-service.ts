// ===== CTA発火サービス =====
// CTAエンジンの判定結果に基づき、LINE pushMessageを送信し、
// cta_historyに発火記録を保存する。

import type { CtaTrigger, ExitType, StumbleType, User } from './types';
import type { RecommendInput } from './recommend-engine';
import { evaluateCta } from './cta-engine';
import type { CtaInput } from './cta-engine';
import { calculateRecommendation } from './recommend-engine';
import { pushMessage } from './line-client';
import { ctaProposalMessage } from './line-messages';
import { getSupabaseServer } from './supabase';
import { getUserById, getRecentCompletedStepCount, getRecentCompletedDays, getRecentStumbles } from './queries';
import { recordTimelineEvent } from './step-delivery';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** 同一トリガーの重複発火ガード（24時間） */
const CTA_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export interface CtaFireResult {
  fired: boolean;
  trigger: CtaTrigger | null;
  exit: ExitType | null;
  ctaId: string | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// メイン関数
// ---------------------------------------------------------------------------

/**
 * CTAチェック & 発火
 *
 * 1. ユーザー情報を取得
 * 2. レコメンドエンジンで出口判定
 * 3. CTAエンジンで発火判定
 * 4. 24時間以内の同一トリガー重複チェック
 * 5. pushMessageで送信
 * 6. cta_historyに記録
 * 7. badgesにcta_fired追加
 *
 * エラーが発生しても呼び出し元の処理（ステップ配信等）は止めない。
 */
export async function checkAndFireCta(
  lineUserId: string
): Promise<CtaFireResult> {
  try {
    // 1. ユーザー情報取得
    const user = await getUserById(lineUserId);
    if (!user) {
      return { fired: false, trigger: null, exit: null, ctaId: null };
    }

    // 2. stumble履歴をDBから取得
    const recentStumbles = await getRecentStumbles(lineUserId);

    // 3. レコメンド算出
    const recommendInput = buildRecommendInput(user, recentStumbles);
    const recommendation = calculateRecommendation(recommendInput);

    // 5. 最近14日間の完了ステップ数・日数をDBから正確に取得
    const recentDays = 14;
    const recentCompletedSteps = await getRecentCompletedStepCount(lineUserId, recentDays);
    const recentCompletedDays = await getRecentCompletedDays(lineUserId, recentDays);

    // 6. CTA判定
    const ctaInput: CtaInput = {
      user: {
        level: user.level,
        score: user.score,
        customerStatus: user.customer_status,
        leadSource: user.lead_source,
        leadNote: user.lead_note,
        axisScores: user.axis_scores,
        stepsCompleted: user.steps_completed,
        stumbleHowCount: user.stumble_how_count,
        daysSinceStart: daysBetween(new Date(user.created_at), new Date()),
        lastActionDaysAgo: daysBetween(new Date(user.last_action_at), new Date()),
        recentCompletedSteps,
        recentCompletedDays,
      },
      recommendation,
    };

    const ctaResult = evaluateCta(ctaInput);

    if (!ctaResult.shouldFire || !ctaResult.trigger || !ctaResult.exit) {
      return { fired: false, trigger: null, exit: null, ctaId: null };
    }

    // 5. 重複チェック（24時間ガード）
    const isDuplicate = await hasRecentCtaFire(lineUserId, ctaResult.trigger);
    if (isDuplicate) {
      console.log(`[CTA] 24h以内に同一トリガー発火済み: user=${lineUserId}, trigger=${ctaResult.trigger}`);
      return { fired: false, trigger: ctaResult.trigger, exit: ctaResult.exit, ctaId: null };
    }

    // 6. CTA ID生成 & pushMessage送信
    const ctaId = `cta_${lineUserId}_${ctaResult.trigger}_${Date.now()}`;
    const message = ctaProposalMessage(ctaResult.trigger, ctaResult.exit, ctaId);
    const pushResult = await pushMessage(lineUserId, [message]);

    if (!pushResult.success) {
      console.error(`[CTA] pushMessage失敗: user=${lineUserId}`, pushResult.error);
      return {
        fired: false,
        trigger: ctaResult.trigger,
        exit: ctaResult.exit,
        ctaId: null,
        error: pushResult.error,
      };
    }

    // 7. cta_historyに記録
    await recordCtaFire(ctaId, lineUserId, ctaResult.trigger, ctaResult.exit);

    // 8. タイムラインに記録
    await recordTimelineEvent(
      lineUserId,
      'cta_fired',
      `CTA発火: ${ctaResult.message}`,
      {
        trigger: ctaResult.trigger,
        exit: ctaResult.exit,
        cta_id: ctaId,
      }
    );

    // 9. badgesにcta_fired追加
    await addCtaFiredBadge(lineUserId, user);

    console.log(`[CTA] 発火成功: user=${lineUserId}, trigger=${ctaResult.trigger}, exit=${ctaResult.exit}`);

    return {
      fired: true,
      trigger: ctaResult.trigger,
      exit: ctaResult.exit,
      ctaId,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'CTA処理中に不明なエラーが発生しました';
    console.error('[CTA] checkAndFireCta エラー（処理は続行）:', errorMsg);
    return { fired: false, trigger: null, exit: null, ctaId: null, error: errorMsg };
  }
}

// ---------------------------------------------------------------------------
// CTA応答ハンドラ
// ---------------------------------------------------------------------------

/**
 * CTA「詳しく聞く」応答の処理
 * - cta_historyをclickedに更新
 * - 管理者に通知（chat_messagesにシステムメッセージ保存）
 */
export async function handleCtaInterested(
  lineUserId: string,
  ctaId: string
): Promise<void> {
  try {
    await updateCtaResult(ctaId, 'clicked');

    // 管理者通知: chat_messagesにシステムメッセージとして保存
    await saveCtaNotification(lineUserId, ctaId, 'interested');

    console.log(`[CTA] 興味あり応答: user=${lineUserId}, ctaId=${ctaId}`);
  } catch (err) {
    console.error('[CTA] handleCtaInterested エラー:', err);
  }
}

/**
 * CTA「今はいい」応答の処理
 * - cta_historyをignoredに更新
 */
export async function handleCtaDeclined(
  lineUserId: string,
  ctaId: string
): Promise<void> {
  try {
    await updateCtaResult(ctaId, 'ignored');

    console.log(`[CTA] 辞退応答: user=${lineUserId}, ctaId=${ctaId}`);
  } catch (err) {
    console.error('[CTA] handleCtaDeclined エラー:', err);
  }
}

// ---------------------------------------------------------------------------
// DB操作（内部関数）
// ---------------------------------------------------------------------------

/**
 * 24時間以内に同一ユーザー・同一トリガーでCTA発火済みか確認
 */
async function hasRecentCtaFire(
  userId: string,
  trigger: CtaTrigger
): Promise<boolean> {
  const supabase = getSupabaseServer();
  if (!supabase) return false;

  try {
    const cutoff = new Date(Date.now() - CTA_COOLDOWN_MS).toISOString();

    const { data, error } = await supabase
      .from('cta_history')
      .select('id')
      .eq('user_id', userId)
      .eq('trigger', trigger)
      .gte('fired_at', cutoff)
      .limit(1);

    if (error) {
      console.error('[CTA] hasRecentCtaFire クエリエラー:', error.message);
      return false;
    }

    return (data ?? []).length > 0;
  } catch (err) {
    console.error('[CTA] hasRecentCtaFire エラー:', err);
    return false;
  }
}

/**
 * cta_historyテーブルに発火記録を保存
 */
async function recordCtaFire(
  ctaId: string,
  userId: string,
  trigger: CtaTrigger,
  exit: ExitType
): Promise<void> {
  const supabase = getSupabaseServer();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('cta_history')
      .insert({
        id: ctaId,
        user_id: userId,
        trigger,
        recommended_exit: exit,
        fired_at: new Date().toISOString(),
        result: 'pending',
      });

    if (error) {
      console.error('[CTA] recordCtaFire エラー:', error.message);
    }
  } catch (err) {
    console.error('[CTA] recordCtaFire 例外:', err);
  }
}

/**
 * cta_historyのresultを更新
 */
async function updateCtaResult(
  ctaId: string,
  result: 'clicked' | 'converted' | 'ignored'
): Promise<void> {
  const supabase = getSupabaseServer();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('cta_history')
      .update({ result })
      .eq('id', ctaId);

    if (error) {
      console.error('[CTA] updateCtaResult エラー:', error.message);
    }
  } catch (err) {
    console.error('[CTA] updateCtaResult 例外:', err);
  }
}

/**
 * 管理者通知用: chat_messagesにCTA応答のシステムメッセージを保存
 */
async function saveCtaNotification(
  userId: string,
  ctaId: string,
  response: 'interested' | 'declined'
): Promise<void> {
  const supabase = getSupabaseServer();
  if (!supabase) return;

  try {
    const content = response === 'interested'
      ? `[CTA通知] ユーザーが「詳しく聞く」を選択しました（CTA ID: ${ctaId}）。担当者からの連絡をお願いします。`
      : `[CTA通知] ユーザーが「今はいい」を選択しました（CTA ID: ${ctaId}）。`;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        sender: 'admin',
        content,
        direction: 'outbound',
        message_type: 'text',
        sent_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[CTA] saveCtaNotification エラー:', error.message);
    }
  } catch (err) {
    console.error('[CTA] saveCtaNotification 例外:', err);
  }
}

/**
 * ユーザーのbadgesにcta_firedを追加（重複防止）
 */
async function addCtaFiredBadge(userId: string, user: User): Promise<void> {
  if (user.badges.includes('cta_fired')) return;

  const supabase = getSupabaseServer();
  if (!supabase) return;

  try {
    const newBadges = [...user.badges, 'cta_fired' as const];
    const { error } = await supabase
      .from('users')
      .update({ badges: newBadges })
      .eq('id', userId);

    if (error) {
      console.error('[CTA] addCtaFiredBadge エラー:', error.message);
    }
  } catch (err) {
    console.error('[CTA] addCtaFiredBadge 例外:', err);
  }
}

// ---------------------------------------------------------------------------
// ヘルパー関数
// ---------------------------------------------------------------------------

/**
 * 2つのDate間の日数差を計算
 */
function daysBetween(from: Date, to: Date): number {
  const diff = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/**
 * User → RecommendInput 変換
 */
function buildRecommendInput(
  user: User,
  recentStumbles: Array<{ stepId: string; type: StumbleType }>
): RecommendInput {
  // weakAxisをkeyof AxisScoresに変換
  const validAxes = new Set(['a1', 'a2', 'b', 'c', 'd']);
  const weakAxis = validAxes.has(user.weak_axis)
    ? (user.weak_axis as keyof import('./types').AxisScores)
    : 'a1';

  return {
    axisScores: user.axis_scores,
    weakAxis,
    customerStatus: user.customer_status,
    leadSource: user.lead_source,
    leadNote: user.lead_note,
    stepsCompleted: user.steps_completed,
    stumbleCount: user.stumble_count,
    stumbleHowCount: user.stumble_how_count,
    recentStumbles,
    daysSinceStart: daysBetween(new Date(user.created_at), new Date()),
    recentStepDays: daysBetween(new Date(user.last_action_at), new Date()),
    hasActiveOperation: user.steps_completed > 0,
  };
}
