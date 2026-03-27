// ===== バンドサーベイ（Stage 2レベリング） =====
// 15問・3択（0=まだ/1=少しだけ/2=やっている）でLv.10刻みバンドを判定
// 所要時間: 約5分

import type { LevelBand } from './types';
import { LEVEL_BAND_CONFIG } from './types';
import type { AxisScores } from './types';

// ---------------------------------------------------------------------------
// 設問定義
// ---------------------------------------------------------------------------

export interface BandSurveyQuestion {
  index: number;
  axis: keyof AxisScores;
  question: string;
}

/** 3択選択肢 */
export const BAND_SURVEY_OPTIONS = [
  { label: 'やっている', value: 2 },
  { label: '少しだけ',   value: 1 },
  { label: 'まだ',       value: 0 },
] as const;

export type BandSurveyAnswer = 0 | 1 | 2;

/** 15問（軸ごと3問 × 5軸） */
export const BAND_SURVEY_QUESTIONS: BandSurveyQuestion[] = [
  // === Axis A1: 売上・請求管理 ===
  { index: 0,  axis: 'a1', question: '請求書の作成・送付をデジタルツールで行っていますか？' },
  { index: 1,  axis: 'a1', question: '月次の売上・入金状況を自動集計・可視化していますか？' },
  { index: 2,  axis: 'a1', question: '見積→受注→請求→入金の流れが一貫してシステム管理されていますか？' },
  // === Axis A2: 連絡・記録管理 ===
  { index: 3,  axis: 'a2', question: '顧客との連絡履歴をデジタルで一元管理していますか？' },
  { index: 4,  axis: 'a2', question: '業務書類・契約書などをクラウドで整理・共有していますか？' },
  { index: 5,  axis: 'a2', question: '社内連絡にSlack・Teamsなどのツールを使っていますか？' },
  // === Axis B: 繰り返し作業の自動化 ===
  { index: 6,  axis: 'b',  question: '定期的な業務（リマインド・報告書等）を自動化していますか？' },
  { index: 7,  axis: 'b',  question: 'Excelやスプレッドシートの集計・グラフ更新を自動化していますか？' },
  { index: 8,  axis: 'b',  question: 'Zapier・Make・Power Automateなどの自動化ツールを使っていますか？' },
  // === Axis C: データ経営 ===
  { index: 9,  axis: 'c',  question: '売上・KPIをダッシュボードで日常的に確認していますか？' },
  { index: 10, axis: 'c',  question: 'データに基づいて月次・週次の経営判断をしていますか？' },
  { index: 11, axis: 'c',  question: '顧客データを分析してマーケティングに活用していますか？' },
  // === Axis D: ITツール活用 ===
  { index: 12, axis: 'd',  question: 'Google WorkspaceやMicrosoft 365を業務の中心で使いこなしていますか？' },
  { index: 13, axis: 'd',  question: '複数のシステム間でデータが自動連携される仕組みがありますか？' },
  { index: 14, axis: 'd',  question: 'ChatGPTなどの生成AIを業務効率化に活用していますか？' },
];

/** 設問の総数 */
export const BAND_SURVEY_QUESTION_COUNT = BAND_SURVEY_QUESTIONS.length; // 15

// ---------------------------------------------------------------------------
// スコアリング
// ---------------------------------------------------------------------------

/** 各軸の設問インデックス（軸→インデックス配列） */
const AXIS_QUESTION_MAP: Record<keyof AxisScores, number[]> = {
  a1: [0, 1, 2],
  a2: [3, 4, 5],
  b:  [6, 7, 8],
  c:  [9, 10, 11],
  d:  [12, 13, 14],
};

/**
 * 回答配列（15要素, 各0-2）から各軸スコアを計算
 * 軸ごと最大6点（3問 × 2点）
 */
export function calculateBandSurveyAxisScores(answers: number[]): Record<keyof AxisScores, number> {
  const result: Record<keyof AxisScores, number> = { a1: 0, a2: 0, b: 0, c: 0, d: 0 };
  for (const axis of Object.keys(AXIS_QUESTION_MAP) as (keyof AxisScores)[]) {
    for (const idx of AXIS_QUESTION_MAP[axis]) {
      result[axis] += answers[idx] ?? 0;
    }
  }
  return result;
}

/**
 * 合計スコア（0-30）からLevelBandを判定
 *
 * スコア範囲:
 *  0- 5 → lv_01_10
 *  6-11 → lv_11_20
 * 12-17 → lv_21_30
 * 18-23 → lv_31_40
 * 24-30 → lv_41_50
 */
export function determineLevelBandFromSurvey(totalScore: number): LevelBand {
  if (totalScore <= 5)  return 'lv_01_10';
  if (totalScore <= 11) return 'lv_11_20';
  if (totalScore <= 17) return 'lv_21_30';
  if (totalScore <= 23) return 'lv_31_40';
  return 'lv_41_50';
}

/**
 * バンドの初期レベル（バンド中央値）
 * バンドサーベイ後に仮設定するlevel
 */
export function getBandInitialLevel(band: LevelBand): number {
  const config = LEVEL_BAND_CONFIG[band];
  return Math.round((config.start + config.end) / 2);
}

/**
 * 次の設問を取得（0-indexed）
 */
export function getBandSurveyQuestion(index: number): BandSurveyQuestion | null {
  if (index < 0 || index >= BAND_SURVEY_QUESTION_COUNT) return null;
  return BAND_SURVEY_QUESTIONS[index];
}

/**
 * バンドサーベイ結果サマリ
 */
export interface BandSurveyResult {
  band: LevelBand;
  bandLabel: string;
  totalScore: number;
  axisScores: Record<keyof AxisScores, number>;
  initialLevel: number;
}

export function computeBandSurveyResult(answers: number[]): BandSurveyResult {
  const axisScores = calculateBandSurveyAxisScores(answers);
  const totalScore = Object.values(axisScores).reduce((s, v) => s + v, 0);
  const band = determineLevelBandFromSurvey(totalScore);
  const config = LEVEL_BAND_CONFIG[band];
  return {
    band,
    bandLabel: config.label,
    totalScore,
    axisScores,
    initialLevel: getBandInitialLevel(band),
  };
}
