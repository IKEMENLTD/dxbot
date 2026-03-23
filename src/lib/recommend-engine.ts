// ===== レコメンドエンジン（5軸→4出口自動判定） =====

import type { AxisScores, CustomerStatus, ExitType, LeadSource, StumbleType } from './types';

// ---------------------------------------------------------------------------
// 入出力型定義
// ---------------------------------------------------------------------------

export interface RecommendInput {
  axisScores: AxisScores;
  weakAxis: keyof AxisScores;
  customerStatus: CustomerStatus;
  leadSource: LeadSource;
  leadNote: string | null;
  stepsCompleted: number;
  stumbleCount: number;
  stumbleHowCount: number;
  recentStumbles: { stepId: string; type: StumbleType }[];
  daysSinceStart: number;
  recentStepDays: number;
  hasActiveOperation: boolean;
}

export interface RecommendResult {
  primaryExit: ExitType;
  primaryScore: number;
  secondaryExit: ExitType | null;
  secondaryScore: number;
  confidence: number;
  reasons: string[];
}

// ---------------------------------------------------------------------------
// 内部型
// ---------------------------------------------------------------------------

interface ExitScores {
  techstars: number;
  taskmate: number;
  veteran_ai: number;
  custom_dev: number;
}

const EXIT_TYPES: ExitType[] = ['techstars', 'taskmate', 'veteran_ai', 'custom_dev'];

// ---------------------------------------------------------------------------
// 弱点軸 → 基本スコアマッピング
// ---------------------------------------------------------------------------

function calculateBaseScores(input: RecommendInput): ExitScores {
  const scores: ExitScores = { techstars: 0, taskmate: 0, veteran_ai: 0, custom_dev: 0 };
  const { weakAxis, axisScores } = input;

  // 軸A1 (売上・請求) → ベテランAI第1候補 +30pt / 受託開発 第2候補 +10pt
  if (weakAxis === 'a1') {
    scores.veteran_ai += 30;
    scores.custom_dev += 10;
  }

  // 軸A2 (連絡・記録) → ベテランAI第1候補 +30pt / TaskMate 第2候補 +10pt
  if (weakAxis === 'a2') {
    scores.veteran_ai += 30;
    scores.taskmate += 10;
  }

  // 軸B (繰り返し作業) → TaskMate +20pt, 受託 +15pt / ベテランAI 第2候補 +5pt
  if (weakAxis === 'b') {
    scores.taskmate += 20;
    scores.custom_dev += 15;
    scores.veteran_ai += 5;
  }

  // 軸C (データなし経営) → ベテランAI +25pt / 受託(BI) 第2候補 +10pt
  if (weakAxis === 'c') {
    scores.veteran_ai += 25;
    scores.custom_dev += 10;
  }

  // 軸D: スコアで分岐
  if (weakAxis === 'd') {
    if (axisScores.d > 5) {
      // 軸D(5pt超) → TaskMate +20pt / ベテランAI 第2候補 +5pt
      scores.taskmate += 20;
      scores.veteran_ai += 5;
    } else {
      // 軸D(0-5pt) → TECHSTARS +30pt / TaskMate 第2候補 +10pt
      scores.techstars += 30;
      scores.taskmate += 10;
    }
  }

  return scores;
}

// ---------------------------------------------------------------------------
// 行動データ補正（10ルール）
// ---------------------------------------------------------------------------

function applyBehaviorCorrections(
  scores: ExitScores,
  input: RecommendInput,
  reasons: string[]
): void {
  const { recentStumbles, recentStepDays, stepsCompleted, stumbleHowCount,
    hasActiveOperation, leadSource, leadNote, axisScores, customerStatus } = input;

  // ルール1: S11(会計=対応履歴記録)でstumble → ベテランAI +15pt
  const hasS11Stumble = recentStumbles.some((s) => s.stepId === 'S11');
  if (hasS11Stumble) {
    scores.veteran_ai += 15;
    reasons.push('S11(対応履歴記録)でつまずき: 会計・記録周りの支援が必要');
  }

  // ルール2: 7日以内に4ステップ完了 → 受託に格上げ +10pt
  if (recentStepDays <= 7 && stepsCompleted >= 4) {
    scores.custom_dev += 10;
    reasons.push('7日以内に4ステップ完了: 行動力が高く受託開発に適性あり');
  }

  // ルール3: 完了少+リマインド無反応 → TaskMate固定
  if (stepsCompleted <= 2 && input.daysSinceStart > 14) {
    scores.taskmate += 40;
    reasons.push('ステップ完了数が少なく長期間経過: TaskMateで伴走が必要');
  }

  // ルール4: 能動的操作あり → 出口単価UP +5pt
  if (hasActiveOperation) {
    scores.veteran_ai += 5;
    scores.custom_dev += 5;
    reasons.push('能動的な操作あり: 高単価出口への適性');
  }

  // ルール5: apo+断り理由「予算」→ 補助金出口優先 +10pt
  if (leadSource === 'apo' && leadNote && /予算/.test(leadNote)) {
    scores.veteran_ai += 10;
    scores.custom_dev += 10;
    reasons.push('予算を懸念: 補助金活用の出口を優先');
  }

  // ルール6: apo+断り理由「必要性」→ 閾値UP（高スコアでないと上位出口にならない）
  if (leadSource === 'apo' && leadNote && /必要性|必要ない|いらない/.test(leadNote)) {
    scores.veteran_ai -= 10;
    scores.custom_dev -= 10;
    reasons.push('必要性を疑問視: 上位出口の閾値を引き上げ');
  }

  // ルール7: stumble(how)3回以上累積 → TECHSTARS +20pt
  if (stumbleHowCount >= 3) {
    scores.techstars += 20;
    reasons.push(`howつまずき${stumbleHowCount}回: やり方が分からない → TECHSTARS研修推奨`);
  }

  // ルール8: apo+lead_note「社員がIT使えない」系 → TECHSTARS +15pt
  if (leadSource === 'apo' && leadNote && /IT.*苦手|パソコン.*苦手|パソコン.*使えない|IT.*使えない|スマホしか/.test(leadNote)) {
    scores.techstars += 15;
    reasons.push('社員のITリテラシー不足: TECHSTARS研修を推奨');
  }

  // ルール9: 軸D<=5pt+全体24点以下 → TECHSTARS最優先
  const totalScore = axisScores.a1 + axisScores.a2 + axisScores.b + axisScores.c + axisScores.d;
  if (axisScores.d <= 5 && totalScore <= 24) {
    scores.techstars += 50;
    reasons.push('ツール習熟5点以下 & 総合24点以下: TECHSTARS最優先');
  }

  // ルール10: customer_status=techstars_grad → TECHSTARS除外→ベテランAI/受託で再判定
  if (customerStatus === 'techstars_grad') {
    scores.techstars = -999;
    scores.veteran_ai += 15;
    scores.custom_dev += 10;
    reasons.push('TECHSTARS修了済: 研修除外し、ベテランAI/受託で再判定');
  }
}

// ---------------------------------------------------------------------------
// メインロジック
// ---------------------------------------------------------------------------

/** レコメンド計算 */
export function calculateRecommendation(input: RecommendInput): RecommendResult {
  const reasons: string[] = [];

  // 弱点軸の基本理由
  const axisLabels: Record<keyof AxisScores, string> = {
    a1: '売上・請求管理',
    a2: '連絡・記録管理',
    b: '繰り返し作業',
    c: 'データ経営',
    d: 'ツール習熟',
  };
  reasons.push(`弱点軸: ${axisLabels[input.weakAxis]}（スコア ${input.axisScores[input.weakAxis]}pt）`);

  // Step1: 基本スコア算出
  const scores = calculateBaseScores(input);

  // Step2: 行動データ補正
  applyBehaviorCorrections(scores, input, reasons);

  // Step3: スコア順にソートしてprimary/secondary決定
  const sorted = EXIT_TYPES
    .map((exit) => ({ exit, score: scores[exit] }))
    .sort((a, b) => b.score - a.score);

  const primary = sorted[0];
  const secondary = sorted[1];

  // confidence: primaryとsecondaryの差が大きいほど高い
  const scoreDiff = primary.score - (secondary.score > 0 ? secondary.score : 0);
  const maxPossibleDiff = 100;
  const confidence = Math.min(100, Math.max(10, Math.round((scoreDiff / maxPossibleDiff) * 100)));

  return {
    primaryExit: primary.exit,
    primaryScore: primary.score,
    secondaryExit: secondary.score > 0 ? secondary.exit : null,
    secondaryScore: Math.max(0, secondary.score),
    confidence,
    reasons,
  };
}
