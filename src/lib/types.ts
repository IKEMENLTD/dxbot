// ===== DXBOT 型定義 =====

// ---------------------------------------------------------------------------
// レベル分類型（大分類 / 中分類 / 小分類）
// ---------------------------------------------------------------------------

/** 小分類: Lv.10刻みの範囲バンド（5軸と1:1対応） */
export type LevelBand =
  | 'lv_01_10'  // Lv.1-10   売上・請求管理の基礎 (axis a1)
  | 'lv_11_20'  // Lv.11-20  記録整備・連絡管理の定着 (axis a2)
  | 'lv_21_30'  // Lv.21-30  自動化導入・業務効率化 (axis b)
  | 'lv_31_40'  // Lv.31-40  データ活用・経営改善 (axis c)
  | 'lv_41_50'; // Lv.41-50  ITツール統合・DX完成 (axis d)

/** 中分類: DX習熟フェーズ（3段階） */
export type LevelPhase =
  | 'phase_entry'    // 入門期 Lv.1-20
  | 'phase_practice' // 実践期 Lv.21-40
  | 'phase_advanced'; // 活用期 Lv.41-50

/** 大分類: DX推進ステージ（2段階） */
export type LevelStage =
  | 'stage_early'  // 育成段階 Lv.1-30
  | 'stage_mature'; // 推進段階 Lv.31-50

export interface LevelClassification {
  stage: LevelStage;
  stageLabel: string;   // "育成段階" | "推進段階"
  phase: LevelPhase;
  phaseLabel: string;   // "入門期" | "実践期" | "活用期"
  band: LevelBand;
  bandLabel: string;    // "Lv.1-10" | "Lv.11-20" など
  bandRange: string;    // "1-10" | "11-20" など（CSV用）
  bandStart: number;
  bandEnd: number;
  axis: string;         // 対応軸 "a1" | "a2" | "b" | "c" | "d"
  axisLabel: string;    // "売上・請求管理" など
  description: string;  // 状態の説明文
}

export const LEVEL_BAND_CONFIG: Record<LevelBand, {
  label: string;
  range: string;
  start: number;
  end: number;
  phase: LevelPhase;
  stage: LevelStage;
  axis: string;
  axisLabel: string;
  description: string;
}> = {
  lv_01_10: {
    label: 'Lv.1-10', range: '1-10', start: 1, end: 10,
    phase: 'phase_entry', stage: 'stage_early',
    axis: 'a1', axisLabel: '売上・請求管理',
    description: 'DXの第一歩。請求・売上管理のデジタル化に取り組んでいます',
  },
  lv_11_20: {
    label: 'Lv.11-20', range: '11-20', start: 11, end: 20,
    phase: 'phase_entry', stage: 'stage_early',
    axis: 'a2', axisLabel: '連絡・記録管理',
    description: '連絡・記録管理をデジタル化し、業務の基盤が整いつつあります',
  },
  lv_21_30: {
    label: 'Lv.21-30', range: '21-30', start: 21, end: 30,
    phase: 'phase_practice', stage: 'stage_early',
    axis: 'b', axisLabel: '繰り返し作業の自動化',
    description: '業務の自動化に着手。生産性向上の実感が出てくる段階です',
  },
  lv_31_40: {
    label: 'Lv.31-40', range: '31-40', start: 31, end: 40,
    phase: 'phase_practice', stage: 'stage_mature',
    axis: 'c', axisLabel: 'データ経営',
    description: 'データを活用した経営判断ができるようになっています',
  },
  lv_41_50: {
    label: 'Lv.41-50', range: '41-50', start: 41, end: 50,
    phase: 'phase_advanced', stage: 'stage_mature',
    axis: 'd', axisLabel: 'ITツール活用',
    description: 'ITツールが業務に完全統合。DXが日常業務に定着しています',
  },
};

export const LEVEL_PHASE_CONFIG: Record<LevelPhase, {
  label: string;
  bandRange: string;
  description: string;
}> = {
  phase_entry: {
    label: '入門期',
    bandRange: 'Lv.1-20',
    description: 'DXの基礎を学び、業務改善の第一歩を踏み出している段階',
  },
  phase_practice: {
    label: '実践期',
    bandRange: 'Lv.21-40',
    description: '業務自動化・データ活用で生産性を向上させている段階',
  },
  phase_advanced: {
    label: '活用期',
    bandRange: 'Lv.41-50',
    description: 'ITツールが完全統合されDXが日常業務に定着した段階',
  },
};

export const LEVEL_STAGE_CONFIG: Record<LevelStage, {
  label: string;
  bandRange: string;
  description: string;
}> = {
  stage_early: {
    label: '育成段階',
    bandRange: 'Lv.1-30',
    description: 'DXの基礎固め〜業務改善の実践',
  },
  stage_mature: {
    label: '推進段階',
    bandRange: 'Lv.31-50',
    description: 'データ活用〜DX完全定着',
  },
};

export type ExitType = 'techstars' | 'taskmate' | 'veteran_ai' | 'custom_dev';
export type CustomerStatus = 'prospect' | 'contacted' | 'meeting' | 'customer' | 'churned' | 'techstars_active' | 'techstars_grad';
export type LeadSource = 'apo' | 'threads' | 'x' | 'instagram' | 'referral' | 'other';
export type StumbleType = 'how' | 'motivation' | 'time';
export type BadgeType = 'cta_fired' | 'action_boost' | 'inactive_30d' | 'new_this_week' | 'techstars_grad';
export type DealStatus = 'active' | 'completed' | 'cancelled';
export type TagColor = 'green' | 'orange' | 'gray';

export interface UserTag {
  id: string;
  label: string;
  color: TagColor;
}
export type CtaTrigger = 'action_boost' | 'apo_early' | 'subsidy_timing' | 'lv40_reached' | 'invoice_stumble' | 'it_literacy';

export interface AxisScores {
  a1: number; // 売上・請求管理
  a2: number; // 連絡・記録管理
  b: number;  // 繰り返し作業
  c: number;  // データ経営
  d: number;  // ツール習熟
}

export interface User {
  id: string;
  line_user_id: string | null;
  preferred_name: string;
  company_name: string;
  industry: string;
  level: number;
  score: number;
  recommended_exit: ExitType;
  customer_status: CustomerStatus;
  lead_source: LeadSource;
  lead_note: string | null;
  axis_scores: AxisScores;
  prev_scores: AxisScores | null;
  weak_axis: string;
  badges: BadgeType[];
  last_action_at: string;
  last_completed_step: string | null;
  steps_completed: number;
  stumble_count: number;
  stumble_how_count: number;
  created_at: string;
  techstars_started_at: string | null;
  techstars_completed_at: string | null;
  paused_until: string | null;
  profile_picture_url: string | null;
  status_message: string | null;
  tags?: string[]; // UserTag IDs
}

export interface Deal {
  id: string;
  user_id: string;
  exit_type: ExitType;
  deal_amount: number;
  subsidy_amount: number;
  deal_stage: number;
  status: DealStatus;
  started_at: string;
  completed_at: string | null;
  note: string | null;
}

export interface CtaHistory {
  id: string;
  user_id: string;
  trigger: CtaTrigger;
  recommended_exit: ExitType;
  fired_at: string;
  result: 'pending' | 'clicked' | 'converted' | 'ignored';
}

export interface TimelineEvent {
  id: string;
  user_id: string;
  type: 'step_completed' | 'stumble' | 'step_skipped' | 'cta_fired' | 'status_change' | 'techstars_start' | 'techstars_complete' | 'rediagnosis' | 'deal_created' | 'note_added' | 'reminder_sent';
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface StumbleRecord {
  id: string;
  user_id: string;
  step_id: string;
  step_name: string;
  stumble_type: StumbleType;
  created_at: string;
}

export interface TrackingLink {
  id: string;
  code: string;
  label: string;
  lead_source: string;
  destination_url: string;
  click_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrackingPerformance {
  linkId: string;
  label: string;
  leadSource: string;
  clickCount: number;
  followCount: number;
  diagnosedCount: number;
  ctaFiredCount: number;
  convertedCount: number;
  diagnosisRate: number;
  ctaRate: number;
  conversionRate: number;
}

export interface TrackingClickDetail {
  id: string;
  deviceType: string | null;
  os: string | null;
  browser: string | null;
  referer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  clickedAt: string;
}

export interface FunnelKpi {
  week: string;
  inflow: number;
  diagnosed: number;
  step_started: number;
  cta_fired: number;
  meeting: number;
  converted: number;
}

export interface ExitMetrics {
  exit_type: ExitType;
  count: number;
  revenue: number;
  subsidy_total: number;
}

export interface WeeklyKpi {
  week: string;
  metrics: FunnelKpi;
}

// 出口表示情報（白+緑+オレンジ系のみ）
export const EXIT_CONFIG: Record<ExitType, { label: string; color: string; colorClass: string; bgClass: string }> = {
  techstars:   { label: 'TECHSTARS研修', color: '#EA580C', colorClass: 'text-orange-600', bgClass: 'bg-orange-50' },
  taskmate:    { label: 'TaskMate',      color: '#16A34A', colorClass: 'text-green-600',  bgClass: 'bg-green-50' },
  veteran_ai:  { label: 'ベテランAI',    color: '#15803D', colorClass: 'text-green-700',  bgClass: 'bg-green-50' },
  custom_dev:  { label: '受託開発',      color: '#C2410C', colorClass: 'text-orange-700', bgClass: 'bg-orange-50' },
};

export const BADGE_CONFIG: Record<BadgeType, { label: string; colorClass: string; bgClass: string }> = {
  cta_fired:      { label: 'CTA発火',       colorClass: 'text-orange-600', bgClass: 'bg-orange-50' },
  action_boost:   { label: '行動加速',      colorClass: 'text-green-600',  bgClass: 'bg-green-50' },
  inactive_30d:   { label: '30日未操作',     colorClass: 'text-gray-500',   bgClass: 'bg-gray-100' },
  new_this_week:  { label: '今週流入',      colorClass: 'text-green-600',  bgClass: 'bg-green-50' },
  techstars_grad: { label: 'TECHSTARS修了', colorClass: 'text-purple-600', bgClass: 'bg-purple-50' },
};

// ===== CTA設定型定義（Phase C） =====

export interface CtaConfigTrigger {
  enabled: boolean;
}

export interface CtaConfigActionBoost extends CtaConfigTrigger {
  normalDays: number;
  normalSteps: number;
  techstarsGradDays: number;
  techstarsGradSteps: number;
}

export interface CtaConfigApoEarly extends CtaConfigTrigger {
  days: number;
  steps: number;
}

export interface CtaConfigSubsidyTiming extends CtaConfigTrigger {
  levelThreshold: number;
  subsidyMonths: number[];
}

export interface CtaConfigLv40Reached extends CtaConfigTrigger {
  levelThreshold: number;
}

export interface CtaConfigInvoiceStumble extends CtaConfigTrigger {
  axisA1Threshold: number;
}

export interface CtaConfigItLiteracy extends CtaConfigTrigger {
  stumbleHowCountThreshold: number;
  axisDThreshold: number;
  totalScoreThreshold: number;
}

export interface CtaConfig {
  action_boost: CtaConfigActionBoost;
  apo_early: CtaConfigApoEarly;
  subsidy_timing: CtaConfigSubsidyTiming;
  lv40_reached: CtaConfigLv40Reached;
  invoice_stumble: CtaConfigInvoiceStumble;
  it_literacy: CtaConfigItLiteracy;
}

// ===== リマインダー設定型定義（Phase D） =====

export interface ReminderConfig {
  lightDays: number;      // デフォルト: 3
  mediumDays: number;     // デフォルト: 7
  finalDays: number;      // デフォルト: 14
  stopDays: number;       // デフォルト: 21
  lightMessage: string;   // カスタムメッセージ（空ならデフォルト使用）
  mediumMessage: string;
  finalMessage: string;
}

// ===== 診断設定型定義（Phase D） =====

export type DiagnosisAxis = 'industry' | 'a1' | 'a2' | 'b' | 'c' | 'd';

export interface DiagnosisQuestionConfig {
  axis: DiagnosisAxis;
  question: string;
}

export interface DiagnosisConfig {
  bandThresholds: [number, number, number]; // デフォルト: [24, 44, 64]
  bandLabels: [string, string, string, string]; // デフォルト: ['DX未着手', '部分的にDX', 'DX進行中', 'DX成熟']
  questions: DiagnosisQuestionConfig[];
  industries: string[];
  scoreMultiplier: number; // デフォルト: 3
}

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  apo: "APO",
  threads: "Threads",
  x: "X (Twitter)",
  instagram: "Instagram",
  referral: "紹介",
  other: "その他",
};

export const STATUS_CONFIG: Record<CustomerStatus, { label: string; colorClass: string }> = {
  prospect:         { label: '見込み',        colorClass: 'text-gray-500' },
  contacted:        { label: 'コンタクト済',   colorClass: 'text-green-600' },
  meeting:          { label: '面談済',        colorClass: 'text-orange-600' },
  customer:         { label: '成約',          colorClass: 'text-green-700' },
  churned:          { label: '離脱',          colorClass: 'text-orange-700' },
  techstars_active: { label: 'TECHSTARS受講中', colorClass: 'text-orange-600' },
  techstars_grad:   { label: 'TECHSTARS修了',  colorClass: 'text-orange-500' },
};
