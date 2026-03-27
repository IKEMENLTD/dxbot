// ===== 精密ヒアリング（Stage 3レベリング） =====
// 30問・5択（1=全くない ～ 5=完全にできている）でレベルを1単位で測定
// 所要時間: 約15分

import type { AxisScores, LevelBand } from './types';
import { LEVEL_BAND_CONFIG } from './types';

// ---------------------------------------------------------------------------
// 設問定義
// ---------------------------------------------------------------------------

export interface PrecisionQuestion {
  index: number;
  axis: keyof AxisScores;
  question: string;
}

/** 5択選択肢（1-5） */
export const PRECISION_OPTIONS = [
  { label: '1: 全くできていない', value: 1 },
  { label: '2: ほとんどできていない', value: 2 },
  { label: '3: 半分くらいできている', value: 3 },
  { label: '4: ほぼできている', value: 4 },
  { label: '5: 完全にできている', value: 5 },
] as const;

/** 30問（軸ごと6問 × 5軸） */
export const PRECISION_QUESTIONS: PrecisionQuestion[] = [
  // === Axis A1: 売上・請求管理（Q1-Q6） ===
  { index: 0,  axis: 'a1', question: '請求書の作成から送付まで5分以内で完了できますか？' },
  { index: 1,  axis: 'a1', question: 'インボイス対応の電子請求書を毎回正しく発行できていますか？' },
  { index: 2,  axis: 'a1', question: '過去3か月の月次売上を今すぐ正確に答えられますか？' },
  { index: 3,  axis: 'a1', question: '売掛金（未入金）の一覧を自動でリスト化・アラートできますか？' },
  { index: 4,  axis: 'a1', question: '見積→受注→請求→入金を一つのシステムで一貫管理できていますか？' },
  { index: 5,  axis: 'a1', question: '請求漏れが月1件以下に抑えられていますか？' },

  // === Axis A2: 連絡・記録管理（Q7-Q12） ===
  { index: 6,  axis: 'a2', question: '顧客との全商談履歴を担当者不在でも即座に参照できますか？' },
  { index: 7,  axis: 'a2', question: '契約書・見積書などの重要書類を5分以内で検索・取得できますか？' },
  { index: 8,  axis: 'a2', question: '全社員の業務タスク・進捗をリアルタイムで把握できますか？' },
  { index: 9,  axis: 'a2', question: '新入社員が業務マニュアルを自力で見つけて読める環境がありますか？' },
  { index: 10, axis: 'a2', question: '社内への連絡事項が全員に即座に届く仕組みがありますか？' },
  { index: 11, axis: 'a2', question: '顧客へのフォローアップ（定期連絡・誕生日等）が自動化されていますか？' },

  // === Axis B: 繰り返し作業の自動化（Q13-Q18） ===
  { index: 12, axis: 'b',  question: '毎週・毎月発生する定型業務の50%以上が自動化されていますか？' },
  { index: 13, axis: 'b',  question: '経費精算・承認フローがシステムで自動化されていますか？' },
  { index: 14, axis: 'b',  question: '社内・社外への定期レポートが自動生成されていますか？' },
  { index: 15, axis: 'b',  question: 'エラーや異常値が発生したとき、自動アラートが届きますか？' },
  { index: 16, axis: 'b',  question: '同じ情報を複数システムに二重入力する作業が解消されていますか？' },
  { index: 17, axis: 'b',  question: '在庫補充・発注の処理が自動化またはシステム化されていますか？' },

  // === Axis C: データ経営（Q19-Q24） ===
  { index: 18, axis: 'c',  question: '月末を待たず週次で売上・利益の進捗を確認できますか？' },
  { index: 19, axis: 'c',  question: '製品・サービス別の採算性を数値で把握できていますか？' },
  { index: 20, axis: 'c',  question: '顧客ごとのLTV（生涯価値）や購買傾向を分析できていますか？' },
  { index: 21, axis: 'c',  question: '業績予測（売上・キャッシュフロー）を数値モデルで立てていますか？' },
  { index: 22, axis: 'c',  question: '競合分析や市場データを定量的に経営判断に活用していますか？' },
  { index: 23, axis: 'c',  question: '社員の生産性・稼働データをモニタリングして改善に活かしていますか？' },

  // === Axis D: ITツール活用（Q25-Q30） ===
  { index: 24, axis: 'd',  question: '全社員がクラウドツールを抵抗なく日常業務で使いこなしていますか？' },
  { index: 25, axis: 'd',  question: '新しいITツールの導入・設定を自社内で完結できますか？' },
  { index: 26, axis: 'd',  question: '社内システム間がAPIやツール連携で自動連携されていますか？' },
  { index: 27, axis: 'd',  question: 'セキュリティポリシー（パスワード管理・アクセス権限等）が整備されていますか？' },
  { index: 28, axis: 'd',  question: '生成AIを複数の業務プロセスに組み込んで活用していますか？' },
  { index: 29, axis: 'd',  question: 'ITシステムの運用・改善を継続的に行う担当者や仕組みがありますか？' },
];

/** 設問の総数 */
export const PRECISION_QUESTION_COUNT = PRECISION_QUESTIONS.length; // 30

// ---------------------------------------------------------------------------
// スコアリング
// ---------------------------------------------------------------------------

/** 軸ごとの設問インデックス */
const AXIS_QUESTION_MAP: Record<keyof AxisScores, number[]> = {
  a1: [0,  1,  2,  3,  4,  5],
  a2: [6,  7,  8,  9,  10, 11],
  b:  [12, 13, 14, 15, 16, 17],
  c:  [18, 19, 20, 21, 22, 23],
  d:  [24, 25, 26, 27, 28, 29],
};

/**
 * 各軸スコアを計算（軸ごと最大30点: 6問 × 5点）
 */
export function calculatePrecisionAxisScores(answers: number[]): Record<keyof AxisScores, number> {
  const result: Record<keyof AxisScores, number> = { a1: 0, a2: 0, b: 0, c: 0, d: 0 };
  for (const axis of Object.keys(AXIS_QUESTION_MAP) as (keyof AxisScores)[]) {
    for (const idx of AXIS_QUESTION_MAP[axis]) {
      result[axis] += answers[idx] ?? 1; // 未回答は最低値1
    }
  }
  return result;
}

/**
 * 精密ヒアリングから正確なレベルを算出
 *
 * 計算式:
 *   total: 30-150 (30問 × 1-5点)
 *   level = Math.round((total - 30) / 120 * 50)  → Lv.0-50
 *
 * targetBandを指定した場合、その範囲内に±5でソフトクランプ
 */
export function calculateExactLevel(answers: number[], targetBand?: LevelBand): number {
  const axisScores = calculatePrecisionAxisScores(answers);
  const total = Object.values(axisScores).reduce((s, v) => s + v, 0);
  // total range: 30(全問1点) - 150(全問5点)
  const raw = Math.round((total - 30) / 120 * 50);
  const clamped = Math.max(0, Math.min(50, raw));

  if (!targetBand) return clamped;

  // バンド範囲内に±5でソフトクランプ（精密ヒアリングがバンドと少し乖離しても許容）
  const config = LEVEL_BAND_CONFIG[targetBand];
  const softMin = Math.max(0, config.start - 5);
  const softMax = Math.min(50, config.end + 5);
  return Math.max(softMin, Math.min(softMax, clamped));
}

/**
 * 次の設問を取得（0-indexed）
 */
export function getPrecisionQuestion(index: number): PrecisionQuestion | null {
  if (index < 0 || index >= PRECISION_QUESTION_COUNT) return null;
  return PRECISION_QUESTIONS[index];
}

/**
 * 精密ヒアリング結果サマリ
 */
export interface PrecisionResult {
  exactLevel: number;
  axisScores: Record<keyof AxisScores, number>;
  totalScore: number;
  targetBand: LevelBand | null;
}

export function computePrecisionResult(answers: number[], targetBand?: LevelBand): PrecisionResult {
  const axisScores = calculatePrecisionAxisScores(answers);
  const totalScore = Object.values(axisScores).reduce((s, v) => s + v, 0);
  const exactLevel = calculateExactLevel(answers, targetBand);
  return {
    exactLevel,
    axisScores,
    totalScore,
    targetBand: targetBand ?? null,
  };
}
