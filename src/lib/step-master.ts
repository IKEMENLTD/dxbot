// ===== ステップマスターデータ（30件） =====

import type { AxisScores } from './types';
import { getSetting, APP_SETTING_KEYS } from './app-settings';

export interface StepDefinition {
  id: string;
  name: string;
  description: string;
  axis: keyof AxisScores;
  difficulty: 1 | 2 | 3;
  estimatedMinutes: number;
}

// ---------------------------------------------------------------------------
// 軸A1: 売上・請求管理 (S01〜S06)
// ---------------------------------------------------------------------------
const AXIS_A1_STEPS: StepDefinition[] = [
  { id: 'S01', name: '請求書作成', description: '基本的な請求書をデジタルで作成する', axis: 'a1', difficulty: 1, estimatedMinutes: 15 },
  { id: 'S02', name: 'インボイス設定', description: '適格請求書発行事業者番号の設定と書式対応', axis: 'a1', difficulty: 1, estimatedMinutes: 20 },
  { id: 'S03', name: '売上管理シート', description: '月次売上を一覧管理するシートを作成する', axis: 'a1', difficulty: 2, estimatedMinutes: 30 },
  { id: 'S04', name: '入金管理', description: '入金状況の記録と消込を行う', axis: 'a1', difficulty: 2, estimatedMinutes: 25 },
  { id: 'S05', name: '見積書テンプレート', description: '再利用可能な見積書テンプレートを整備する', axis: 'a1', difficulty: 2, estimatedMinutes: 20 },
  { id: 'S06', name: '月次締め', description: '月末の請求・売上締め処理を仕組み化する', axis: 'a1', difficulty: 3, estimatedMinutes: 40 },
];

// ---------------------------------------------------------------------------
// 軸A2: 連絡・記録管理 (S07〜S12)
// ---------------------------------------------------------------------------
const AXIS_A2_STEPS: StepDefinition[] = [
  { id: 'S07', name: 'メール連携', description: 'ビジネスメールの基本設定と連携', axis: 'a2', difficulty: 1, estimatedMinutes: 15 },
  { id: 'S08', name: 'LINE公式設定', description: 'LINE公式アカウントの開設と基本設定', axis: 'a2', difficulty: 1, estimatedMinutes: 20 },
  { id: 'S09', name: '顧客リスト整理', description: '既存顧客情報をデジタルリスト化する', axis: 'a2', difficulty: 2, estimatedMinutes: 30 },
  { id: 'S10', name: '連絡先一元化', description: '複数チャネルの連絡先を一箇所にまとめる', axis: 'a2', difficulty: 2, estimatedMinutes: 25 },
  { id: 'S11', name: '対応履歴記録', description: '顧客対応の履歴を記録・検索できるようにする', axis: 'a2', difficulty: 3, estimatedMinutes: 35 },
  { id: 'S12', name: 'SNS連携', description: 'SNSアカウントとビジネスツールを連携させる', axis: 'a2', difficulty: 3, estimatedMinutes: 30 },
];

// ---------------------------------------------------------------------------
// 軸B: 繰り返し作業 (S13〜S18)
// ---------------------------------------------------------------------------
const AXIS_B_STEPS: StepDefinition[] = [
  { id: 'S13', name: 'タスク棚卸し', description: '日常業務のタスクを洗い出して一覧化する', axis: 'b', difficulty: 1, estimatedMinutes: 20 },
  { id: 'S14', name: '繰り返し作業リスト', description: '自動化候補となる繰り返し作業を特定する', axis: 'b', difficulty: 1, estimatedMinutes: 15 },
  { id: 'S15', name: '自動化ツール選定', description: '業務に適した自動化ツールを選ぶ', axis: 'b', difficulty: 2, estimatedMinutes: 30 },
  { id: 'S16', name: 'テンプレート作成', description: '定型業務のテンプレートを作成する', axis: 'b', difficulty: 2, estimatedMinutes: 25 },
  { id: 'S17', name: 'ワークフロー設計', description: '業務フローを図式化し改善点を見つける', axis: 'b', difficulty: 3, estimatedMinutes: 40 },
  { id: 'S18', name: '自動化実行', description: '選定ツールで実際に自動化を設定・実行する', axis: 'b', difficulty: 3, estimatedMinutes: 45 },
];

// ---------------------------------------------------------------------------
// 軸C: データ経営 (S19〜S24)
// ---------------------------------------------------------------------------
const AXIS_C_STEPS: StepDefinition[] = [
  { id: 'S19', name: '売上データ入力', description: '売上データをデジタル化して入力する', axis: 'c', difficulty: 1, estimatedMinutes: 15 },
  { id: 'S20', name: 'KPI設定', description: '事業の重要指標（KPI）を定義する', axis: 'c', difficulty: 1, estimatedMinutes: 20 },
  { id: 'S21', name: 'ダッシュボード構築', description: 'KPIを可視化するダッシュボードを作る', axis: 'c', difficulty: 2, estimatedMinutes: 35 },
  { id: 'S22', name: 'レポート自動化', description: '定期レポートの自動生成を設定する', axis: 'c', difficulty: 2, estimatedMinutes: 30 },
  { id: 'S23', name: 'データ分析入門', description: '基礎的なデータ分析手法を実践する', axis: 'c', difficulty: 3, estimatedMinutes: 40 },
  { id: 'S24', name: '意思決定フレーム', description: 'データに基づく意思決定の仕組みを作る', axis: 'c', difficulty: 3, estimatedMinutes: 45 },
];

// ---------------------------------------------------------------------------
// 軸D: ツール習熟 (S25〜S30)
// ---------------------------------------------------------------------------
const AXIS_D_STEPS: StepDefinition[] = [
  { id: 'S25', name: 'PC基本操作', description: 'ファイル管理・ショートカットなど基本操作の習得', axis: 'd', difficulty: 1, estimatedMinutes: 20 },
  { id: 'S26', name: 'クラウドストレージ', description: 'Google Drive等のクラウド保存を使いこなす', axis: 'd', difficulty: 1, estimatedMinutes: 15 },
  { id: 'S27', name: 'ビデオ会議', description: 'Zoom/Meet等のビデオ会議ツールを使う', axis: 'd', difficulty: 2, estimatedMinutes: 20 },
  { id: 'S28', name: 'セキュリティ基礎', description: 'パスワード管理・二段階認証の設定', axis: 'd', difficulty: 2, estimatedMinutes: 25 },
  { id: 'S29', name: 'ツール選定', description: '業務に必要なツールを比較・選定する', axis: 'd', difficulty: 3, estimatedMinutes: 30 },
  { id: 'S30', name: 'ITリテラシーテスト', description: '総合的なITリテラシーの確認テスト', axis: 'd', difficulty: 3, estimatedMinutes: 35 },
];

// ---------------------------------------------------------------------------
// 全ステップ（デフォルト値）
// ---------------------------------------------------------------------------
const DEFAULT_STEPS: StepDefinition[] = [
  ...AXIS_A1_STEPS,
  ...AXIS_A2_STEPS,
  ...AXIS_B_STEPS,
  ...AXIS_C_STEPS,
  ...AXIS_D_STEPS,
];

/** デフォルトの軸別ステップ一覧（同期版で使用） */
const STEPS_BY_AXIS: Record<keyof AxisScores, StepDefinition[]> = {
  a1: AXIS_A1_STEPS,
  a2: AXIS_A2_STEPS,
  b: AXIS_B_STEPS,
  c: AXIS_C_STEPS,
  d: AXIS_D_STEPS,
};

// ---------------------------------------------------------------------------
// 公開関数
// ---------------------------------------------------------------------------

/** 指定軸のステップ一覧を取得 */
export function getStepsForAxis(axis: keyof AxisScores): StepDefinition[] {
  return STEPS_BY_AXIS[axis];
}

/** 弱点軸優先で次の未完了ステップを選択 */
export function getNextStep(
  completedStepIds: string[],
  weakAxis: keyof AxisScores
): StepDefinition | null {
  const completed = new Set(completedStepIds);

  // 1. 弱点軸から未完了ステップを探す（難易度順）
  const weakSteps = STEPS_BY_AXIS[weakAxis];
  for (const step of weakSteps) {
    if (!completed.has(step.id)) {
      return step;
    }
  }

  // 2. 弱点軸が全完了なら、他の軸からスコア昇順で探す
  const otherAxes = (Object.keys(STEPS_BY_AXIS) as (keyof AxisScores)[])
    .filter((a) => a !== weakAxis);

  for (const axis of otherAxes) {
    for (const step of STEPS_BY_AXIS[axis]) {
      if (!completed.has(step.id)) {
        return step;
      }
    }
  }

  // 3. 全ステップ完了
  return null;
}

/** 全ステップ一覧を取得（同期版: デフォルト値を返す） */
export function getAllSteps(): StepDefinition[] {
  return DEFAULT_STEPS;
}

// ---------------------------------------------------------------------------
// DB優先の非同期版（Phase B: webhook等のサーバーサイドで使用）
// ---------------------------------------------------------------------------

/** DBからステップ定義を読み込む。未設定時はnullを返す */
async function loadStepsFromDb(): Promise<StepDefinition[] | null> {
  try {
    const dbSteps = await getSetting<StepDefinition[]>(APP_SETTING_KEYS.STEPS, DEFAULT_STEPS);
    // getSettingはデフォルト値を返すので、DBに値がある場合のみdbStepsは異なる
    // ただし getSetting は常にT型を返すため null にはならない
    return dbSteps;
  } catch (err) {
    console.error('[step-master] DB読み込みエラー:', err);
    return null;
  }
}

/** 軸別にグループ化するヘルパー */
function buildStepsByAxis(steps: StepDefinition[]): Record<keyof AxisScores, StepDefinition[]> {
  const result: Record<keyof AxisScores, StepDefinition[]> = {
    a1: [], a2: [], b: [], c: [], d: [],
  };
  for (const step of steps) {
    if (result[step.axis]) {
      result[step.axis].push(step);
    }
  }
  return result;
}

/** 全ステップ一覧を取得（非同期版: DB優先、フォールバックはDEFAULT_STEPS） */
export async function getAllStepsAsync(): Promise<StepDefinition[]> {
  const dbSteps = await loadStepsFromDb();
  return dbSteps ?? DEFAULT_STEPS;
}

/** 弱点軸優先で次の未完了ステップを選択（非同期版: DB優先） */
export async function getNextStepAsync(
  completedStepIds: string[],
  weakAxis: keyof AxisScores
): Promise<StepDefinition | null> {
  const allSteps = await getAllStepsAsync();
  const stepsByAxis = buildStepsByAxis(allSteps);
  const completed = new Set(completedStepIds);

  // 1. 弱点軸から未完了ステップを探す（難易度順）
  const weakSteps = stepsByAxis[weakAxis] ?? [];
  for (const step of weakSteps) {
    if (!completed.has(step.id)) {
      return step;
    }
  }

  // 2. 弱点軸が全完了なら、他の軸からスコア昇順で探す
  const otherAxes = (Object.keys(stepsByAxis) as (keyof AxisScores)[])
    .filter((a) => a !== weakAxis);

  for (const axis of otherAxes) {
    for (const step of stepsByAxis[axis] ?? []) {
      if (!completed.has(step.id)) {
        return step;
      }
    }
  }

  // 3. 全ステップ完了
  return null;
}

/** stepIdからStepDefinitionを検索（非同期版: DB優先） */
export async function findStepByIdAsync(stepId: string): Promise<StepDefinition | null> {
  const allSteps = await getAllStepsAsync();
  return allSteps.find((s) => s.id === stepId) ?? null;
}
