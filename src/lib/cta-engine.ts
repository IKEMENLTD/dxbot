// ===== CTA発火判定エンジン（6トリガー） =====

import type { AxisScores, CustomerStatus, CtaTrigger, ExitType, LeadSource } from './types';
import type { RecommendResult } from './recommend-engine';

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
// 補助金申請時期判定（簡易: 1月〜3月, 6月〜8月を申請時期とする）
// ---------------------------------------------------------------------------

function isSubsidyPeriod(): boolean {
  const month = new Date().getMonth() + 1;
  return (month >= 1 && month <= 3) || (month >= 6 && month <= 8);
}

// ---------------------------------------------------------------------------
// ITリテラシー不足テキストマッチ
// ---------------------------------------------------------------------------

const IT_LITERACY_PATTERN = /IT.*苦手|パソコン.*苦手|パソコン.*使えない|IT.*使えない|スマホしか/;

// ---------------------------------------------------------------------------
// 6トリガー判定（優先順位順）
// ---------------------------------------------------------------------------

/** CTA発火判定 */
export function evaluateCta(input: CtaInput): CtaResult {
  const { user, recommendation } = input;

  // トリガー5: インボイスstumble (高優先度: 具体的課題)
  // S11 stumble + 軸A1低 → ベテランAI固定
  if (user.axisScores.a1 <= 5) {
    // S11のstumbleはstumbleHowCountやrecentStumblesから間接判定
    // ここでは軸A1が低いことで近似判定
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
  // stumble(how)3回以上 OR 軸D=0〜5pt+全体24pt以下 → TECHSTARS固定
  const totalScore = user.axisScores.a1 + user.axisScores.a2 + user.axisScores.b + user.axisScores.c + user.axisScores.d;
  const isLowDAndTotal = user.axisScores.d <= 5 && totalScore <= 24;
  const hasLeadITNote = user.leadNote ? IT_LITERACY_PATTERN.test(user.leadNote) : false;
  if (user.stumbleHowCount >= 3 || isLowDAndTotal || hasLeadITNote) {
    // techstars_gradは除外
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

  // トリガー1: 行動加速
  // 通常: 14日以内に3ステップ完了
  // techstars_grad: 7日以内に1ステップ完了（信頼関係が既にある）
  const requiredSteps = user.customerStatus === 'techstars_grad' ? 1 : 3;
  const requiredDays = user.customerStatus === 'techstars_grad' ? 7 : 14;
  if (user.recentCompletedDays <= requiredDays && user.recentCompletedSteps >= requiredSteps) {
    // techstars_gradの場合は専用メッセージ
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

  // トリガー2: アポ早期 - apo+7日以内に2ステップ → note参照
  if (
    user.leadSource === 'apo' &&
    user.recentCompletedDays <= 7 &&
    user.recentCompletedSteps >= 2
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

  // トリガー3: 補助金タイミング - 申請時期+Lv.15以上 → 補助金適合出口
  if (isSubsidyPeriod() && user.level >= 15) {
    // 補助金が使える出口: veteran_ai, custom_dev
    const subsidyExit: ExitType =
      recommendation.primaryExit === 'veteran_ai' || recommendation.primaryExit === 'custom_dev'
        ? recommendation.primaryExit
        : 'veteran_ai';
    return {
      shouldFire: true,
      trigger: 'subsidy_timing',
      exit: subsidyExit,
      message: `補助金の申請時期です。${getExitLabel(subsidyExit)}で補助金活用をご提案`,
      priority: 'medium',
    };
  }

  // トリガー4: Lv.40到達 → 自動判定
  if (user.level >= 40) {
    return {
      shouldFire: true,
      trigger: 'lv40_reached',
      exit: recommendation.primaryExit,
      message: `Lv.40到達。${getExitLabel(recommendation.primaryExit)}への移行をご提案します`,
      priority: 'medium',
    };
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
