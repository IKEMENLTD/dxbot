// ===== ステップ配信 DB永続化ロジック =====

import type { StumbleType } from './types';
import { getSupabaseServer } from './supabase';

/**
 * user_stepsテーブルにステップ開始を記録
 */
export async function recordStepStarted(
  userId: string,
  stepId: string,
  stepName: string
): Promise<void> {
  const supabase = getSupabaseServer();
  if (!supabase) return;

  try {
    await supabase
      .from('user_steps')
      .upsert({
        id: `${userId}_${stepId}`,
        user_id: userId,
        step_id: stepId,
        step_name: stepName,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      });
  } catch (err) {
    console.error('[StepDelivery] recordStepStarted エラー:', err);
  }
}

/**
 * user_stepsテーブルにステップ完了を記録
 */
export async function recordStepCompleted(
  userId: string,
  stepId: string,
  stepName: string
): Promise<void> {
  const supabase = getSupabaseServer();
  if (!supabase) return;

  try {
    await supabase
      .from('user_steps')
      .upsert({
        id: `${userId}_${stepId}`,
        user_id: userId,
        step_id: stepId,
        step_name: stepName,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
  } catch (err) {
    console.error('[StepDelivery] recordStepCompleted エラー:', err);
  }
}

/**
 * user_stepsテーブルにつまずきを記録
 */
export async function recordStepStumble(
  userId: string,
  stepId: string,
  stepName: string,
  stumbleType: StumbleType
): Promise<void> {
  const supabase = getSupabaseServer();
  if (!supabase) return;

  try {
    await supabase
      .from('user_steps')
      .upsert({
        id: `${userId}_${stepId}`,
        user_id: userId,
        step_id: stepId,
        step_name: stepName,
        status: 'in_progress',
        stumble_type: stumbleType,
      });
  } catch (err) {
    console.error('[StepDelivery] recordStepStumble エラー:', err);
  }
}

/**
 * user_stepsテーブルにスキップを記録
 */
export async function recordStepSkipped(
  userId: string,
  stepId: string,
  stepName: string
): Promise<void> {
  const supabase = getSupabaseServer();
  if (!supabase) return;

  try {
    await supabase
      .from('user_steps')
      .upsert({
        id: `${userId}_${stepId}`,
        user_id: userId,
        step_id: stepId,
        step_name: stepName,
        status: 'skipped',
        completed_at: new Date().toISOString(),
      });
  } catch (err) {
    console.error('[StepDelivery] recordStepSkipped エラー:', err);
  }
}

/**
 * user_timelineにイベントを記録
 */
export async function recordTimelineEvent(
  userId: string,
  type: 'step_completed' | 'stumble' | 'step_skipped' | 'cta_fired',
  description: string,
  metadata: Record<string, string>
): Promise<void> {
  const supabase = getSupabaseServer();
  if (!supabase) return;

  try {
    await supabase
      .from('user_timeline')
      .insert({
        id: `${userId}_${type}_${Date.now()}`,
        user_id: userId,
        type,
        description,
        metadata,
      });
  } catch (err) {
    console.error('[StepDelivery] recordTimelineEvent エラー:', err);
  }
}

/**
 * usersテーブルのステップ関連カウンタを更新
 */
export async function updateUserStepCounters(
  userId: string,
  updates: {
    stepsCompleted?: number;
    stumbleCount?: number;
    stumbleHowCount?: number;
    lastCompletedStep?: string;
    level?: number;
    score?: number;
  }
): Promise<void> {
  const supabase = getSupabaseServer();
  if (!supabase) return;

  try {
    const updateData: Record<string, unknown> = {
      last_action_at: new Date().toISOString(),
    };

    if (updates.stepsCompleted !== undefined) {
      updateData['steps_completed'] = updates.stepsCompleted;
    }
    if (updates.stumbleCount !== undefined) {
      updateData['stumble_count'] = updates.stumbleCount;
    }
    if (updates.stumbleHowCount !== undefined) {
      updateData['stumble_how_count'] = updates.stumbleHowCount;
    }
    if (updates.lastCompletedStep !== undefined) {
      updateData['last_completed_step'] = updates.lastCompletedStep;
    }
    if (updates.level !== undefined) {
      updateData['level'] = updates.level;
    }
    if (updates.score !== undefined) {
      updateData['score'] = updates.score;
    }

    await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);
  } catch (err) {
    console.error('[StepDelivery] updateUserStepCounters エラー:', err);
  }
}

/**
 * レベル計算: 完了ステップ数に基づく
 * 各ステップの難易度に応じてスコアを加算し、レベルを算出
 */
export function calculateLevel(stepsCompleted: number): number {
  // 1ステップ = 約Lv.1.5、最大Lv.45（30ステップ全完了時）
  return Math.floor(stepsCompleted * 1.5);
}

/**
 * スコア計算: 難易度に応じたポイント加算
 */
export function calculateScoreForStep(difficulty: 1 | 2 | 3): number {
  const scoreMap: Record<1 | 2 | 3, number> = {
    1: 10,
    2: 20,
    3: 30,
  };
  return scoreMap[difficulty];
}
