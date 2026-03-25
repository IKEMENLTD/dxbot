// ===== リマインダー Cron API Route =====
// GET or POST /api/cron/reminders
// 外部Cronサービス（cron-job.org等）から毎日朝10時(JST)に実行される
// Authorization: Bearer <CRON_SECRET> ヘッダーが必要

import { NextRequest, NextResponse } from 'next/server';
import { pushMessage } from '@/lib/line-client';
import {
  getReminderTargetUsers,
  hasReminderSentToday,
  recordReminderSent,
} from '@/lib/queries';
import type { ReminderTargetUser } from '@/lib/queries';
import type { ReminderLevel } from '@/lib/line-messages';
import {
  reminderLightMessage,
  reminderMediumMessage,
  reminderFinalMessage,
} from '@/lib/line-messages';
import type { LineMessage } from '@/lib/line-types';
import { findStepByIdAsync } from '@/lib/step-master';
import type { ReminderConfig } from '@/lib/types';
import { getSetting } from '@/lib/app-settings';

/** デフォルトリマインダー設定 */
const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  lightDays: 3,
  mediumDays: 7,
  finalDays: 14,
  stopDays: 21,
  lightMessage: '',
  mediumMessage: '',
  finalMessage: '',
};

/** リマインダー処理結果 */
interface ReminderResult {
  userId: string;
  level: ReminderLevel;
  success: boolean;
  error?: string;
  mock?: boolean;
}

/** バッチ処理結果 */
interface BatchResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  results: ReminderResult[];
}

/** LINE APIレート制限: 50ms間隔（1000msg/min = ~16.7msg/sec） */
const RATE_LIMIT_DELAY_MS = 60;

/** リマインダー全体のタイムアウト: 5分 */
const BATCH_TIMEOUT_MS = 300000;

/**
 * 認証チェック: CRON_SECRET の Bearer トークンのみ許可
 */
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') ?? '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const cronSecret = process.env.CRON_SECRET ?? '';
  if (cronSecret && bearerToken === cronSecret) return true;
  return false;
}

/**
 * ユーザーの放置日数を計算
 */
function calculateInactiveDays(lastActionAt: string): number {
  const lastAction = new Date(lastActionAt);
  const now = new Date();
  const diffMs = now.getTime() - lastAction.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * 放置日数からリマインダーレベルを決定（DB設定対応）
 * デフォルト: 3-6日: light / 7-13日: medium / 14-20日: final / 21日以上: null
 */
function determineReminderLevel(inactiveDays: number, cfg: ReminderConfig): ReminderLevel | null {
  if (inactiveDays >= cfg.stopDays) return null;
  if (inactiveDays >= cfg.finalDays) return 'final';
  if (inactiveDays >= cfg.mediumDays) return 'medium';
  if (inactiveDays >= cfg.lightDays) return 'light';
  return null;
}

/**
 * リマインダーレベルに応じたメッセージを生成（カスタムメッセージ対応）
 */
function createReminderMessage(
  level: ReminderLevel,
  stepName: string | null,
  estimatedMinutes: number | undefined,
  cfg: ReminderConfig
): LineMessage {
  // カスタムメッセージが設定されている場合はそちらを使用
  const customMap: Record<ReminderLevel, string> = {
    light: cfg.lightMessage,
    medium: cfg.mediumMessage,
    final: cfg.finalMessage,
  };

  const customMsg = customMap[level];
  if (customMsg && customMsg.trim() !== '') {
    return { type: 'text', text: customMsg } as LineMessage;
  }

  // デフォルトメッセージ
  switch (level) {
    case 'light':
      return reminderLightMessage(stepName, estimatedMinutes);
    case 'medium':
      return reminderMediumMessage(stepName, estimatedMinutes);
    case 'final':
      return reminderFinalMessage(stepName, estimatedMinutes);
  }
}

/**
 * 1ユーザーへのリマインダー送信処理
 */
async function sendReminderToUser(
  user: ReminderTargetUser,
  level: ReminderLevel,
  cfg: ReminderConfig
): Promise<ReminderResult> {
  try {
    // 本日すでに送信済みかチェック
    const alreadySent = await hasReminderSentToday(user.id);
    if (alreadySent) {
      return {
        userId: user.id,
        level,
        success: true,
        error: '本日送信済み（スキップ）',
      };
    }

    // ステップID→ステップ名変換
    const stepDef = user.last_completed_step
      ? await findStepByIdAsync(user.last_completed_step)
      : null;
    const resolvedStepName = stepDef?.name ?? null;
    const estMinutes = stepDef?.estimatedMinutes ?? undefined;

    // メッセージ生成（カスタムメッセージ対応）
    const message = createReminderMessage(level, resolvedStepName, estMinutes, cfg);

    // pushMessage送信
    const result = await pushMessage(user.line_user_id, [message]);

    if (!result.success) {
      return {
        userId: user.id,
        level,
        success: false,
        error: result.error ?? 'pushMessage送信失敗',
      };
    }

    // 送信記録をタイムラインに保存
    await recordReminderSent(user.id, level);

    return {
      userId: user.id,
      level,
      success: true,
      mock: result.mock,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '不明なエラー';
    console.error(`[Reminder] ユーザー ${user.id} への送信エラー:`, errorMsg);
    return {
      userId: user.id,
      level,
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * レート制限を考慮した待機
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * リマインダーバッチ処理のメインロジック
 */
async function processReminders(signal: AbortSignal): Promise<BatchResult> {
  const result: BatchResult = {
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    results: [],
  };

  // DB設定を読み込み（フォールバック: デフォルト値）
  const cfg = await getSetting<ReminderConfig>('reminder_config', DEFAULT_REMINDER_CONFIG);

  // lightDays以上放置のユーザーを取得
  const users = await getReminderTargetUsers(cfg.lightDays);

  for (const user of users) {
    // タイムアウトチェック
    if (signal.aborted) {
      console.warn('[Reminder] バッチタイムアウト。残りのユーザーはスキップ');
      break;
    }

    result.processed++;

    // 放置日数とリマインダーレベルを決定
    const inactiveDays = calculateInactiveDays(user.last_action_at);
    const level = determineReminderLevel(inactiveDays, cfg);

    if (!level) {
      // 21日以上: リマインダー停止
      result.skipped++;
      continue;
    }

    // line_user_id 必須チェック
    if (!user.line_user_id) {
      result.skipped++;
      continue;
    }

    // 送信
    const sendResult = await sendReminderToUser(user, level, cfg);
    result.results.push(sendResult);

    if (sendResult.success) {
      if (sendResult.error?.includes('スキップ')) {
        result.skipped++;
      } else {
        result.sent++;
      }
    } else {
      result.failed++;
    }

    // レート制限: LINE API 1000msg/min を超えないよう間隔を空ける
    if (result.processed < users.length) {
      await delay(RATE_LIMIT_DELAY_MS);
    }
  }

  return result;
}

/**
 * GET /api/cron/reminders
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: '認証に失敗しました' },
      { status: 401 }
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BATCH_TIMEOUT_MS);

  try {
    const result = await processReminders(controller.signal);

    console.log(
      `[Reminder] バッチ完了: 処理=${result.processed}, 送信=${result.sent}, スキップ=${result.skipped}, 失敗=${result.failed}`
    );
    // 詳細はサーバーログにのみ出力（レスポンスにユーザー情報を含めない）
    console.log('[Reminder] 詳細結果:', JSON.stringify(result.results));

    return NextResponse.json({
      status: 'ok',
      summary: {
        processed: result.processed,
        sent: result.sent,
        skipped: result.skipped,
        failed: result.failed,
      },
    });
  } catch (err) {
    console.error('[Reminder] バッチ処理エラー:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'リマインダー処理中にエラーが発生しました' },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * POST /api/cron/reminders
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return GET(request);
}
