// ===== ステップ配信 DB永続化ロジック =====

import type {
  StumbleType,
  TimelineEvent,
  LevelBand,
  LevelPhase,
  LevelStage,
  LevelClassification,
} from './types';
import {
  LEVEL_BAND_CONFIG,
  LEVEL_PHASE_CONFIG,
  LEVEL_STAGE_CONFIG,
} from './types';
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
  type: TimelineEvent['type'],
  description: string,
  metadata: Record<string, unknown>
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
 * 1ステップ = 約Lv.1.5、最大Lv.45（30ステップ全完了時）
 */
export function calculateLevel(stepsCompleted: number): number {
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

// ---------------------------------------------------------------------------
// レベル分類: 大分類 / 中分類 / 小分類
// ---------------------------------------------------------------------------

/**
 * 小分類: レベルからバンド（Lv.10刻み範囲）を返す
 * Lv.0はlv_01_10扱い
 */
export function getLevelBand(level: number): LevelBand {
  if (level <= 10) return 'lv_01_10';
  if (level <= 20) return 'lv_11_20';
  if (level <= 30) return 'lv_21_30';
  if (level <= 40) return 'lv_31_40';
  return 'lv_41_50';
}

/**
 * 中分類: レベルからフェーズを返す
 * 入門期(Lv.1-20) / 実践期(Lv.21-40) / 活用期(Lv.41-50)
 */
export function getLevelPhase(level: number): LevelPhase {
  return LEVEL_BAND_CONFIG[getLevelBand(level)].phase;
}

/**
 * 大分類: レベルからステージを返す
 * 育成段階(Lv.1-30) / 推進段階(Lv.31-50)
 */
export function getLevelStage(level: number): LevelStage {
  return LEVEL_BAND_CONFIG[getLevelBand(level)].stage;
}

/**
 * フル分類情報: CSV出力・UI表示・CTA判定に使用
 */
export function getLevelClassification(level: number): LevelClassification {
  const band = getLevelBand(level);
  const bandConfig = LEVEL_BAND_CONFIG[band];
  const phase = bandConfig.phase;
  const stage = bandConfig.stage;
  const phaseConfig = LEVEL_PHASE_CONFIG[phase];
  const stageConfig = LEVEL_STAGE_CONFIG[stage];

  return {
    stage,
    stageLabel: stageConfig.label,
    phase,
    phaseLabel: phaseConfig.label,
    band,
    bandLabel: bandConfig.label,
    bandRange: bandConfig.range,
    bandStart: bandConfig.start,
    bandEnd: bandConfig.end,
    axis: bandConfig.axis,
    axisLabel: bandConfig.axisLabel,
    description: bandConfig.description,
  };
}

/**
 * レベルアップ時にバンド移行があったか判定
 * バンド移行 = 小分類が変わった = 主要マイルストーン
 */
export function hasBandChanged(previousLevel: number, newLevel: number): boolean {
  return getLevelBand(previousLevel) !== getLevelBand(newLevel);
}

/**
 * フェーズ移行があったか判定（中分類）
 */
export function hasPhaseChanged(previousLevel: number, newLevel: number): boolean {
  return getLevelPhase(previousLevel) !== getLevelPhase(newLevel);
}
