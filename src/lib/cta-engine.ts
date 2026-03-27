// ===== CTA発火判定エンジン（6トリガー） =====

import type { AxisScores, CustomerStatus, CtaConfig, CtaTrigger, ExitType, LeadSource } from './types';
import type { RecommendResult } from './recommend-engine';
import { getSetting } from './app-settings';
import { getLevelClassification } from './step-delivery';

// ---------------------------------------------------------------------------
// 入出力型定義
// ---------------------------------------------------------------------------

export interface CtaInput {
  user: {
    level: number;
    score: number;
    customerStatus: CustomerStatus;
    leadSource: LeadSource;
    leadNote: string | null;
    axisScores: AxisScores;
    stepsCompleted: number;
    stumbleHowCount: number;
    daysSinceStart: number;
    lastActionDaysAgo: number;
    recentCompletedSteps: number;
    recentCompletedDays: number;
  };
  recommendation: RecommendResult;
}

export interface CtaResult {
  shouldFire: boolean;
  trigger: CtaTrigger | null;
  exit: ExitType | null;
  message: string;
  priority: 'high' | 'medium';
}

// ---------------------------------------------------------------------------
// デフォルトCTA設定（ハードコード値をそのまま定数化）
// ---------------------------------------------------------------------------

export const DEFAULT_CTA_CONFIG: CtaConfig = {
  action_boost: {
    enabled: true,
    normalDays: 14,
    normalSteps: 3,
    techstarsGradDays: 7,
    techstarsGradSteps: 1,
  },
  apo_early: {
    enabled: true,
    days: 7,
    steps: 2,
  },
  subsidy_timing: {
    enabled: true,
    levelThreshold: 15,
    subsidyMonths: [1, 2, 3, 6, 7, 8],
  },
  lv40_reached: {
    enabled: true,
    levelThreshold: 40,
  },
  invoice_stumble: {
    enabled: true,
    axisA1Threshold: 5,
  },
  it_literacy: {
    enabled: true,
    stumbleHowCountThreshold: 3,
    axisDThreshold: 5,
    totalScoreThreshold: 24,
  },
};

// ---------------------------------------------------------------------------
// 補助金申請時期判定
// ---------------------------------------------------------------------------

function isSubsidyPeriodWithConfig(subsidyMonths: number[]): boolean {
  const month = new Date().getMonth() + 1;
  return subsidyMonths.includes(month);
}

// ---------------------------------------------------------------------------
// ITリテラシー不足テキストマッチ
// ---------------------------------------------------------------------------

const IT_LITERACY_PATTERN = /IT.*苦手|パソコン.*苦手|パソコン.*使えない|IT.*使えない|スマホしか/;

// ---------------------------------------------------------------------------
// 6トリガー判定（優先順位順）- 同期版（フォールバック用）
// ---------------------------------------------------------------------------

/** CTA発火判定（同期版 - デフォルト閾値使用） */
export function evaluateCta(input: CtaInput): CtaResult {
  return evaluateCtaWithConfig(input, DEFAULT_CTA_CONFIG);
}

// ---------------------------------------------------------------------------
// 6トリガー判定（設定値指定版）
// ---------------------------------------------------------------------------

/** CTA発火判定（設定値指定版） */
export function evaluateCtaWithConfig(input: CtaInput, config: CtaConfig): CtaResult {
  const { user, recommendation } = input;

  // トリガー5: インボイスstumble (高優先度: 具体的課題)
  if (config.invoice_stumble.enabled && user.axisScores.a1 <= config.invoice_stumble.axisA1Threshold) {
    const isInvoiceRelated = user.leadNote
      ? /請求|インボイス|会計/.test(user.leadNote)
      : false;
    if (isInvoiceRelated && user.stumbleHowCount >= 1) {
      return {
        shouldFire: true,
        trigger: 'invoice_stumble',
        exit: 'veteran_ai',
        message: '請求まわり、まとめて解決できます',
        priority: 'high',
      };
    }
  }

  // トリガー6: ITリテラシー不足
  if (config.it_literacy.enabled) {
    const totalScore = user.axisScores.a1 + user.axisScores.a2 + user.axisScores.b + user.axisScores.c + user.axisScores.d;
    const isLowDAndTotal = user.axisScores.d <= config.it_literacy.axisDThreshold && totalScore <= config.it_literacy.totalScoreThreshold;
    const hasLeadITNote = user.leadNote ? IT_LITERACY_PATTERN.test(user.leadNote) : false;
    if (user.stumbleHowCount >= config.it_literacy.stumbleHowCountThreshold || isLowDAndTotal || hasLeadITNote) {
      if (user.customerStatus !== 'techstars_grad') {
        return {
          shouldFire: true,
          trigger: 'it_literacy',
          exit: 'techstars',
          message: 'まずはITの基礎から。TECHSTARS研修で一緒に学びましょう',
          priority: 'high',
        };
      }
    }
  }

  // トリガー1: 行動加速
  if (config.action_boost.enabled) {
    const requiredSteps = user.customerStatus === 'techstars_grad'
      ? config.action_boost.techstarsGradSteps
      : config.action_boost.normalSteps;
    const requiredDays = user.customerStatus === 'techstars_grad'
      ? config.action_boost.techstarsGradDays
      : config.action_boost.normalDays;
    if (user.recentCompletedDays <= requiredDays && user.recentCompletedSteps >= requiredSteps) {
      const message = user.customerStatus === 'techstars_grad'
        ? `研修お疲れ様でした！次はツール導入で一気にDXを進めませんか`
        : `行動が加速しています。${getExitLabel(recommendation.primaryExit)}をご提案します`;
      return {
        shouldFire: true,
        trigger: 'action_boost',
        exit: recommendation.primaryExit,
        message,
        priority: 'medium',
      };
    }
  }

  // トリガー2: アポ早期
  if (config.apo_early.enabled) {
    if (
      user.leadSource === 'apo' &&
      user.recentCompletedDays <= config.apo_early.days &&
      user.recentCompletedSteps >= config.apo_early.steps
    ) {
      const noteRef = user.leadNote ? `（備考: ${user.leadNote}）` : '';
      return {
        shouldFire: true,
        trigger: 'apo_early',
        exit: recommendation.primaryExit,
        message: `アポ経由で早期行動中${noteRef}。${getExitLabel(recommendation.primaryExit)}を提案`,
        priority: 'high',
      };
    }
  }

  // トリガー3: 補助金タイミング
  if (config.subsidy_timing.enabled) {
    const inSubsidyPeriod = isSubsidyPeriodWithConfig(config.subsidy_timing.subsidyMonths);
    if (inSubsidyPeriod && user.level >= config.subsidy_timing.levelThreshold) {
      const subsidyExit: ExitType =
        recommendation.primaryExit === 'veteran_ai' || recommendation.primaryExit === 'custom_dev'
          ? recommendation.primaryExit
          : 'veteran_ai';
      const classification = getLevelClassification(user.level);
      return {
        shouldFire: true,
        trigger: 'subsidy_timing',
        exit: subsidyExit,
        message: `${classification.bandLabel}（${classification.phaseLabel}）の時期に補助金申請のチャンスです。${getExitLabel(subsidyExit)}で補助金活用をご提案`,
        priority: 'medium',
      };
    }
  }

  // トリガー4: 推進段階（Lv.31-40ゾーン）到達
  if (config.lv40_reached.enabled) {
    if (user.level >= config.lv40_reached.levelThreshold) {
      const classification = getLevelClassification(user.level);
      return {
        shouldFire: true,
        trigger: 'lv40_reached',
        exit: recommendation.primaryExit,
        message: `${classification.bandLabel}ゾーン（${classification.stageLabel}）に到達。${getExitLabel(recommendation.primaryExit)}への移行をご提案します`,
        priority: 'medium',
      };
    }
  }

  // いずれのトリガーにもマッチしない
  return {
    shouldFire: false,
    trigger: null,
    exit: null,
    message: '現在CTAの発火条件に該当しません',
    priority: 'medium',
  };
}

// ---------------------------------------------------------------------------
// 非同期版（DB設定優先）
// ---------------------------------------------------------------------------

/** CTA発火判定（非同期版 - DB設定優先、フォールバックでデフォルト値使用） */
export async function evaluateCtaAsync(input: CtaInput): Promise<CtaResult> {
  const config = await getSetting<CtaConfig>('cta_config', DEFAULT_CTA_CONFIG);
  return evaluateCtaWithConfig(input, config);
}

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function getExitLabel(exit: ExitType): string {
  const labels: Record<ExitType, string> = {
    techstars: 'TECHSTARS研修',
    taskmate: 'TaskMate',
    veteran_ai: 'ベテランAI',
    custom_dev: '受託開発',
  };
  return labels[exit];
}
