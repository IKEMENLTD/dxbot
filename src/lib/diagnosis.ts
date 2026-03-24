// ===== 診断ロジック =====

import type { AxisScores, DiagnosisConfig } from './types';
import { getSetting } from './app-settings';

/** 業種リスト */
export const INDUSTRIES = ['建設', '製造', '飲食', '小売', 'サービス', 'その他'] as const;
export type Industry = (typeof INDUSTRIES)[number];

/** 診断の質問定義 */
export interface DiagnosisQuestion {
  index: number;
  axis: 'industry' | keyof AxisScores;
  question: string;
  options: { label: string; value: number | string }[];
}

/** 5段階選択肢（Q2〜Q6共通） */
const FIVE_SCALE_OPTIONS: { label: string; value: number }[] = [
  { label: '1: 全くできていない', value: 1 },
  { label: '2: ほとんどできていない', value: 2 },
  { label: '3: 一部できている', value: 3 },
  { label: '4: おおむねできている', value: 4 },
  { label: '5: 完全にできている', value: 5 },
];

/** 6問の質問定義 */
const QUESTIONS: DiagnosisQuestion[] = [
  {
    index: 0,
    axis: 'industry',
    question: '御社の業種を教えてください',
    options: INDUSTRIES.map((ind) => ({ label: ind, value: ind })),
  },
  {
    index: 1,
    axis: 'a1',
    question: '売上管理・請求管理はどの程度できていますか？',
    options: FIVE_SCALE_OPTIONS,
  },
  {
    index: 2,
    axis: 'a2',
    question: '顧客との連絡・記録管理はどうですか？',
    options: FIVE_SCALE_OPTIONS,
  },
  {
    index: 3,
    axis: 'b',
    question: '繰り返し作業の自動化はどの程度ですか？',
    options: FIVE_SCALE_OPTIONS,
  },
  {
    index: 4,
    axis: 'c',
    question: 'データに基づく経営判断をしていますか？',
    options: FIVE_SCALE_OPTIONS,
  },
  {
    index: 5,
    axis: 'd',
    question: 'ITツールの活用度はどうですか？',
    options: FIVE_SCALE_OPTIONS,
  },
];

/**
 * 質問を取得（0-indexed）
 */
export function getQuestion(index: number): DiagnosisQuestion | null {
  if (index < 0 || index >= QUESTIONS.length) return null;
  return QUESTIONS[index];
}

/**
 * 質問の総数
 */
export function getQuestionCount(): number {
  return QUESTIONS.length;
}

/**
 * 回答値からスコアを算出（回答値 x 3）
 */
export function calculateScores(answers: Record<string, number>): AxisScores {
  return {
    a1: (answers['a1'] ?? 0) * 3,
    a2: (answers['a2'] ?? 0) * 3,
    b: (answers['b'] ?? 0) * 3,
    c: (answers['c'] ?? 0) * 3,
    d: (answers['d'] ?? 0) * 3,
  };
}

/**
 * 合計スコアからバンドを判定
 */
export function determineBand(totalScore: number): 1 | 2 | 3 | 4 {
  if (totalScore <= 30) return 1;
  if (totalScore <= 45) return 2;
  if (totalScore <= 60) return 3;
  return 4;
}

/**
 * 最もスコアが低い軸を判定
 */
export function determineWeakAxis(scores: AxisScores): keyof AxisScores {
  // ビジネス優先度順: d(ITリテラシー) → b(繰り返し) → a1 → a2 → c
  // 同点の場合、優先度が高い軸を弱軸として選択する
  // d: ツールが使えないと他が始まらない
  // b: 自動化は即効性がある
  const priorityOrder: (keyof AxisScores)[] = ['d', 'b', 'a1', 'a2', 'c'];

  let weakest: keyof AxisScores = priorityOrder[0];
  let minScore = scores[priorityOrder[0]];

  for (const axis of priorityOrder) {
    const score = scores[axis];
    if (score < minScore) {
      minScore = score;
      weakest = axis;
    }
  }

  return weakest;
}

/** 軸名の日本語ラベル */
const AXIS_LABELS: Record<keyof AxisScores, string> = {
  a1: '売上・請求管理',
  a2: '連絡・記録管理',
  b: '繰り返し作業の自動化',
  c: 'データ経営',
  d: 'ITツール活用',
};

/** バンド名 */
const BAND_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'DX未着手',
  2: '部分的にDX',
  3: 'DX進行中',
  4: 'DX成熟',
};

/**
 * 結果メッセージを生成
 */
export function generateResultMessage(
  scores: AxisScores,
  band: 1 | 2 | 3 | 4,
  weakAxis: keyof AxisScores,
  industry: string | null
): string {
  const total = scores.a1 + scores.a2 + scores.b + scores.c + scores.d;
  const industryText = industry ? `[業種: ${industry}]` : '';

  return [
    `--- DX診断結果 ---`,
    industryText,
    ``,
    `合計スコア: ${total}/75点`,
    `DXレベル: Band${band}（${BAND_LABELS[band]}）`,
    ``,
    `[各軸スコア]`,
    `  売上・請求管理: ${scores.a1}/15`,
    `  連絡・記録管理: ${scores.a2}/15`,
    `  繰り返し作業: ${scores.b}/15`,
    `  データ経営: ${scores.c}/15`,
    `  ITツール活用: ${scores.d}/15`,
    ``,
    `弱点: ${AXIS_LABELS[weakAxis]}`,
    ``,
    `これから${AXIS_LABELS[weakAxis]}を中心に、`,
    `ステップ形式でDX改善をサポートしていきます！`,
    `まずはLv.1からスタートしましょう。`,
  ].join('\n');
}

// ===== DB優先の非同期版（Phase D） =====

/** デフォルト診断設定 */
export const DEFAULT_DIAGNOSIS_CONFIG: DiagnosisConfig = {
  bandThresholds: [30, 45, 60],
  bandLabels: ['DX未着手', '部分的にDX', 'DX進行中', 'DX成熟'],
  questions: [
    { axis: 'industry', question: '御社の業種を教えてください' },
    { axis: 'a1', question: '売上管理・請求管理はどの程度できていますか？' },
    { axis: 'a2', question: '顧客との連絡・記録管理はどうですか？' },
    { axis: 'b', question: '繰り返し作業の自動化はどの程度ですか？' },
    { axis: 'c', question: 'データに基づく経営判断をしていますか？' },
    { axis: 'd', question: 'ITツールの活用度はどうですか？' },
  ],
  industries: ['建設', '製造', '飲食', '小売', 'サービス', 'その他'],
  scoreMultiplier: 3,
};

/**
 * DB設定を読み込む
 */
export async function getDiagnosisConfig(): Promise<DiagnosisConfig> {
  return getSetting<DiagnosisConfig>('diagnosis_config', DEFAULT_DIAGNOSIS_CONFIG);
}

/**
 * DB優先: 合計スコアからバンドを判定（非同期版）
 */
export async function determineBandAsync(totalScore: number): Promise<1 | 2 | 3 | 4> {
  const cfg = await getDiagnosisConfig();
  const [b1, b2, b3] = cfg.bandThresholds;
  if (totalScore <= b1) return 1;
  if (totalScore <= b2) return 2;
  if (totalScore <= b3) return 3;
  return 4;
}

/**
 * DB優先: 質問を取得（非同期版）
 * DB設定の質問テキストでオーバーライドし、optionsはコードデフォルトを維持
 */
export async function getQuestionAsync(index: number): Promise<DiagnosisQuestion | null> {
  const cfg = await getDiagnosisConfig();
  if (index < 0 || index >= cfg.questions.length) return null;

  const qConfig = cfg.questions[index];
  const axis = qConfig.axis;

  // 業種質問はDB設定の業種リストからoptionsを構築
  if (axis === 'industry') {
    return {
      index,
      axis,
      question: qConfig.question,
      options: cfg.industries.map((ind) => ({ label: ind, value: ind })),
    };
  }

  // スコア質問は5段階選択肢を使用
  return {
    index,
    axis,
    question: qConfig.question,
    options: FIVE_SCALE_OPTIONS,
  };
}

/**
 * DB優先: 質問の総数（非同期版）
 */
export async function getQuestionCountAsync(): Promise<number> {
  const cfg = await getDiagnosisConfig();
  return cfg.questions.length;
}

/**
 * DB優先: 回答値からスコアを算出（非同期版）
 * スコア倍率をDB設定から取得
 */
export async function calculateScoresAsync(answers: Record<string, number>): Promise<AxisScores> {
  const cfg = await getDiagnosisConfig();
  const multiplier = cfg.scoreMultiplier;
  return {
    a1: (answers['a1'] ?? 0) * multiplier,
    a2: (answers['a2'] ?? 0) * multiplier,
    b: (answers['b'] ?? 0) * multiplier,
    c: (answers['c'] ?? 0) * multiplier,
    d: (answers['d'] ?? 0) * multiplier,
  };
}
