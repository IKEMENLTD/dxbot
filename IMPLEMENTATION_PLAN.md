# DXBOT 設定値DB化 実装計画書

> 作成日: 2026-03-23
> 目的: ハードコードされた設定値を管理画面から編集可能にする

---

## 現状分析

### ハードコードされている設定値

| ファイル | 設定値 | 変更頻度 |
|----------|--------|----------|
| `src/lib/step-master.ts` | 30ステップ定義（名前/説明/軸/難易度/所要時間） | 高 |
| `src/lib/cta-engine.ts` | 6トリガー閾値（日数/ステップ数/レベル/スコア等） | 中 |
| `src/lib/recommend-engine.ts` | レコメンド重み（基本スコア/補正ルール10個） | 中 |
| `src/lib/diagnosis.ts` | 診断質問テキスト/バンド閾値（24/44/64） | 低 |
| `src/app/api/cron/reminders/route.ts` | リマインダー間隔（3/7/14/21日） | 低 |
| `src/lib/line-messages.ts` | メッセージテンプレート多数 | 中 |

### 既存設定ページの保存先

| コンポーネント | 現在の保存先 |
|----------------|-------------|
| `LineSettings` | localStorage (`dxbot_line_config`) |
| `TagSettings` | localStorage (`dxbot_tags`) |
| `LeadSourceSettings` | localStorage (`dxbot_lead_sources`) |
| `TemplateSettings` | localStorage (`dxbot_templates`) |
| `ExitSettings` | localStorage (`dxbot_exits`) |
| `StatusSettings` | localStorage (`dxbot_statuses`) |

---

## Phase A: DB基盤（依存関係の根幹）

### 依存関係
なし（最初に実施必須）

### タスク分割

#### A-1: マイグレーション作成（直列）
**ファイル:** `supabase/migrations/008_app_settings.sql`

```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_anon_select_app_settings" ON app_settings FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_app_settings" ON app_settings FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_app_settings" ON app_settings FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_app_settings" ON app_settings FOR DELETE USING (false);
```

#### A-2: schema.sql更新（A-1と並列可）
**ファイル:** `supabase/schema.sql`
- `app_settings` テーブル定義を末尾に追加
- RLSポリシー4件を追加

#### A-3: database.ts型追加（A-1と並列可）
**ファイル:** `src/lib/database.ts`
- `Database.public.Tables` に `app_settings` を追加

```typescript
app_settings: {
  Row: {
    key: string;
    value: Record<string, unknown>;
    updated_at: string;
  };
  Insert: {
    key: string;
    value: Record<string, unknown>;
    updated_at?: string;
  };
  Update: {
    key?: string;
    value?: Record<string, unknown>;
    updated_at?: string;
  };
  Relationships: [];
};
```

#### A-4: queries.tsにCRUD関数追加（A-3完了後）
**ファイル:** `src/lib/queries.ts`
- `getAppSetting<T>(key: string): Promise<T | null>` -- 1件取得
- `setAppSetting(key: string, value: unknown): Promise<{ success: boolean; error?: string }>` -- upsert
- `getAllAppSettings(): Promise<Record<string, unknown>>` -- 全件取得
- `deleteAppSetting(key: string): Promise<{ success: boolean; error?: string }>` -- 削除

#### A-5: 設定読み込みヘルパー作成（A-4完了後）
**ファイル:** `src/lib/app-settings.ts`（新規作成）

```typescript
// 設定キー定数
export const APP_SETTING_KEYS = {
  STEPS: 'steps',
  CTA_CONFIG: 'cta_config',
  REMINDER_CONFIG: 'reminder_config',
  DIAGNOSIS_CONFIG: 'diagnosis_config',
  RECOMMEND_WEIGHTS: 'recommend_weights',
  // Phase E用
  LINE_CONFIG: 'line_config',
  TAGS: 'tags',
  LEAD_SOURCES: 'lead_sources',
  TEMPLATES: 'templates',
  EXITS: 'exits',
  STATUSES: 'statuses',
} as const;

// DB優先 -> コードデフォルトフォールバック
export async function getSetting<T>(key: string, defaultValue: T): Promise<T>
```

#### A-6: API Route作成（A-4完了後、A-5と並列可）
**ファイル:** `src/app/api/settings/app/route.ts`（新規作成）

- `GET /api/settings/app` -- 全設定取得
- `GET /api/settings/app?key=xxx` -- 1件取得
- `PUT /api/settings/app` -- 設定更新 (body: `{ key, value }`)
- 全ハンドラにtry-catch必須
- AbortControllerでタイムアウト制御（120秒）

---

## Phase B: ステップ管理タブ（層1: 高頻度変更）

### 依存関係
Phase A完了後

### タスク分割

#### B-1: ステップ設定の型定義（並列可）
**ファイル:** `src/lib/types.ts`
- `StepSettingsConfig` 型を追加（30ステップの配列、StepDefinitionを再利用）

#### B-2: ステップ管理コンポーネント作成（B-1完了後）
**ファイル:** `src/components/settings/StepSettings.tsx`（新規作成）

機能:
- 30ステップをテーブル表示（ID / 名前 / 説明 / 軸 / 難易度 / 所要時間）
- 各行のインライン編集（名前 / 説明 / 難易度 / 所要時間）
  - IDと軸は変更不可（表示のみ）
  - 難易度: 1/2/3 のセレクトボックス
  - 所要時間: 数値入力（分）
- 「一括保存」ボタン -- PUT /api/settings/app で key=`steps` に保存
- 「デフォルトに戻す」ボタン -- 確認ダイアログ付き
- 保存中のローディング表示
- エラー時の日本語メッセージ表示

UI仕様:
- 既存のTagSettings/ExitSettingsと同じテーブルスタイル
- AbortControllerでfetchタイムアウト（20秒）
- 絵文字禁止（SVGアイコンのみ）

#### B-3: 設定ページにタブ追加（B-2完了後）
**ファイル:** `src/app/dashboard/settings/page.tsx`

変更内容:
- `TabKey` に `"steps"` を追加
- `TABS` 配列に `{ key: "steps", label: "ステップ管理" }` を追加
- `TabContent` に `case "steps": return <StepSettings />;` を追加
- `import StepSettings from "@/components/settings/StepSettings";` を追加

#### B-4: step-master.tsをDB優先に変更（A-5完了後、B-2と並列可）
**ファイル:** `src/lib/step-master.ts`

変更内容:
- 既存の定数配列（AXIS_A1_STEPS等）はデフォルト値として保持
- `getStepsForAxis` / `getNextStep` / `getAllSteps` を同期関数のまま維持
- 新規追加: `async function loadStepsFromDb(): Promise<StepDefinition[] | null>` -- DB読み込み
- 新規追加: `async function getStepsAsync(): Promise<StepDefinition[]>` -- DB優先の非同期版
- 新規追加: `async function getNextStepAsync(...)` -- DB優先の非同期版
- 既存の同期関数はフォールバック用としてそのまま残す

#### B-5: webhook/route.tsの呼び出し元をDB対応（B-4完了後）
**ファイル:** `src/app/api/webhook/route.ts`

変更内容:
- `import { getNextStep, getAllSteps }` を `{ getNextStepAsync, getAllStepsAsync }` に変更
- `findStepById` 関数を非同期化: `async function findStepById(stepId: string): Promise<StepDefinition | null>`
- 全ての `findStepById` / `getNextStep` 呼び出しに `await` を追加
- 影響箇所:
  - `deliverNextStep()` -- `getNextStep()` -> `await getNextStepAsync()`
  - `handleStepComplete()` -- `findStepById()` -> `await findStepById()`
  - `handleStepStumble()` -- `findStepById()` -> `await findStepById()`
  - `handleStepRetry()` -- 間接的に `resendCurrentStep` 経由
  - `handleStepSkip()` -- `findStepById()` -> `await findStepById()`
  - `resendCurrentStep()` -- `findStepById()` -> `await findStepById()`
  - `completeDiagnosis()` -- `getNextStep()` -> `await getNextStepAsync()`

---

## Phase C: CTA設定タブ（層2: 中頻度変更）

### 依存関係
Phase A完了後（Phase Bと並列実行可能）

### タスク分割

#### C-1: CTA設定の型定義（並列可）
**ファイル:** `src/lib/types.ts`

```typescript
export interface CtaConfigTrigger {
  enabled: boolean;
}

export interface CtaConfigActionBoost extends CtaConfigTrigger {
  normalDays: number;        // デフォルト: 14
  normalSteps: number;       // デフォルト: 3
  techstarsGradDays: number; // デフォルト: 7
  techstarsGradSteps: number;// デフォルト: 1
}

export interface CtaConfigApoEarly extends CtaConfigTrigger {
  days: number;              // デフォルト: 7
  steps: number;             // デフォルト: 2
}

export interface CtaConfigSubsidyTiming extends CtaConfigTrigger {
  levelThreshold: number;    // デフォルト: 15
  subsidyMonths: number[];   // デフォルト: [1,2,3,6,7,8]
}

export interface CtaConfigLv40Reached extends CtaConfigTrigger {
  levelThreshold: number;    // デフォルト: 40
}

export interface CtaConfigInvoiceStumble extends CtaConfigTrigger {
  axisA1Threshold: number;   // デフォルト: 5
}

export interface CtaConfigItLiteracy extends CtaConfigTrigger {
  stumbleHowCountThreshold: number; // デフォルト: 3
  axisDThreshold: number;           // デフォルト: 5
  totalScoreThreshold: number;      // デフォルト: 24
}

export interface CtaConfig {
  action_boost: CtaConfigActionBoost;
  apo_early: CtaConfigApoEarly;
  subsidy_timing: CtaConfigSubsidyTiming;
  lv40_reached: CtaConfigLv40Reached;
  invoice_stumble: CtaConfigInvoiceStumble;
  it_literacy: CtaConfigItLiteracy;
}
```

#### C-2: CTA設定コンポーネント作成（C-1完了後）
**ファイル:** `src/components/settings/CtaSettings.tsx`（新規作成）

機能:
- 6トリガーをアコーディオン形式で表示
- 各トリガーの有効/無効スイッチ（トグル）
- 各トリガーの閾値フォーム:
  - `action_boost`: 通常日数/ステップ数、techstars_grad用日数/ステップ数
  - `apo_early`: 日数/ステップ数
  - `subsidy_timing`: レベル閾値/申請月（チェックボックス12個）
  - `lv40_reached`: レベル閾値
  - `invoice_stumble`: 軸A1閾値
  - `it_literacy`: stumble(how)回数/軸D閾値/全体スコア閾値
- 「保存」ボタン -- PUT /api/settings/app で key=`cta_config` に保存
- 「デフォルトに戻す」ボタン
- 入力バリデーション（数値範囲チェック）

#### C-3: 設定ページにタブ追加（C-2完了後）
**ファイル:** `src/app/dashboard/settings/page.tsx`
- `TabKey` に `"cta"` を追加
- `TABS` に `{ key: "cta", label: "CTA設定" }` を追加
- `TabContent` にcase追加

#### C-4: cta-engine.tsをDB優先に変更（A-5完了後、C-2と並列可）
**ファイル:** `src/lib/cta-engine.ts`

変更内容:
- `evaluateCta` を `async function evaluateCtaAsync(input: CtaInput): Promise<CtaResult>` に変更
- 冒頭で `await getSetting<CtaConfig>('cta_config', DEFAULT_CTA_CONFIG)` で設定読み込み
- 各トリガーの `enabled` フラグをチェックし、false ならスキップ
- ハードコード閾値をDB設定値に置換
- `isSubsidyPeriod()` を `subsidyMonths` 設定で判定するように変更
- 既存の同期版 `evaluateCta` はデフォルト値で動作するフォールバックとして残す

#### C-5: cta-service.ts等の呼び出し元をDB対応
**ファイル:** `src/lib/cta-service.ts`（既存の場合）
- `evaluateCta` -> `evaluateCtaAsync` に変更

---

## Phase D: リマインダー・診断設定タブ

### 依存関係
Phase A完了後（Phase B/Cと並列実行可能）

### タスク分割

#### D-1: リマインダー/診断設定の型定義（並列可）
**ファイル:** `src/lib/types.ts`

```typescript
export interface ReminderConfig {
  lightDays: number;      // デフォルト: 3
  mediumDays: number;     // デフォルト: 7
  finalDays: number;      // デフォルト: 14
  stopDays: number;       // デフォルト: 21
  lightMessage: string;   // カスタムメッセージ（空ならデフォルト使用）
  mediumMessage: string;
  finalMessage: string;
}

export interface DiagnosisConfig {
  bandThresholds: [number, number, number]; // デフォルト: [24, 44, 64]
  questions: Array<{
    axis: 'industry' | 'a1' | 'a2' | 'b' | 'c' | 'd';
    question: string;
  }>;
  scoreMultiplier: number; // デフォルト: 3
}
```

#### D-2: リマインダー・診断設定コンポーネント作成（D-1完了後）
**ファイル:** `src/components/settings/ReminderSettings.tsx`（新規作成）

機能:
- リマインダー間隔設定: 4段階の日数入力（light/medium/final/stop）
- リマインダーメッセージ文言: 各段階のテキストエリア（空ならデフォルト使用）
- 「保存」ボタン

**ファイル:** `src/components/settings/DiagnosisSettings.tsx`（新規作成）

機能:
- バンド閾値設定: Band1/2/3/4 の境界値3個を数値入力
- 診断質問テキスト: Q1-Q6 のテキスト編集
- スコア倍率: 数値入力（デフォルト3）
- 「保存」ボタン / 「デフォルトに戻す」ボタン

#### D-3: 設定ページにタブ追加（D-2完了後）
**ファイル:** `src/app/dashboard/settings/page.tsx`
- `TabKey` に `"reminder"` / `"diagnosis"` を追加
- `TABS` に2項目追加
- `TabContent` にcase追加

#### D-4: reminders/route.tsをDB優先に変更（A-5完了後）
**ファイル:** `src/app/api/cron/reminders/route.ts`

変更内容:
- `processReminders` 冒頭で `await getSetting<ReminderConfig>('reminder_config', DEFAULT_REMINDER_CONFIG)` を読み込み
- `determineReminderLevel` にDB設定値を引数で渡す
- `getReminderTargetUsers(minDaysAgo)` の `minDaysAgo` をDB設定の `lightDays` に変更
- カスタムメッセージが設定されている場合、`createReminderMessage` で使用

#### D-5: diagnosis.tsをDB優先に変更（A-5完了後）
**ファイル:** `src/lib/diagnosis.ts`

変更内容:
- `determineBand` を `async function determineBandAsync(totalScore: number): Promise<1|2|3|4>` に変更
- `getQuestion` を `async function getQuestionAsync(index: number): Promise<DiagnosisQuestion | null>` に変更
- DB設定読み込みで閾値と質問テキストをオーバーライド
- 既存の同期版はフォールバック用として残す

#### D-6: webhook/route.tsの診断関連をDB対応（D-5完了後）
**ファイル:** `src/app/api/webhook/route.ts`
- `determineBand` -> `determineBandAsync`
- `getQuestion` -> `getQuestionAsync`
- `getQuestionCount` -> `getQuestionCountAsync`（DBの質問数を返す）

---

## Phase E: 既存localStorage設定のDB移行

### 依存関係
Phase A完了後（Phase B/C/Dと並列実行可能）

### タスク分割

#### E-1: 既存コンポーネントの保存先変更

各コンポーネントで以下の共通パターンを適用:

**変更パターン:**
1. `loadFromStorage` -> `fetch('/api/settings/app?key=xxx')` に変更
2. `saveToStorage` -> `fetch('/api/settings/app', { method: 'PUT', body: { key, value } })` に変更
3. 初期ロード時は `useEffect` で非同期フェッチ
4. フォールバック: API失敗時はlocalStorageから読み込み
5. フェッチ中はローディング表示
6. AbortControllerでタイムアウト（20秒）

**対象ファイル:**

| ファイル | 設定キー |
|----------|---------|
| `src/components/settings/LineSettings.tsx` | `line_config` |
| `src/components/settings/TagSettings.tsx` | `tags` |
| `src/components/settings/LeadSourceSettings.tsx` | `lead_sources` |
| `src/components/settings/TemplateSettings.tsx` | `templates` |
| `src/components/settings/ExitSettings.tsx` | `exits` |
| `src/components/settings/StatusSettings.tsx` | `statuses` |

#### E-2: 共通フック作成（E-1の前に）
**ファイル:** `src/hooks/useAppSetting.ts`（新規作成）

```typescript
/**
 * app_settings テーブルの1キーを読み書きするフック
 * - 初期ロード: GET /api/settings/app?key=xxx
 * - 保存: PUT /api/settings/app
 * - フォールバック: localStorage
 * - AbortController + 20秒タイムアウト
 */
export function useAppSetting<T>(
  key: string,
  defaultValue: T
): {
  value: T;
  setValue: (newValue: T) => void;
  save: () => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
  saving: boolean;
  error: string | null;
}
```

#### E-3: マイグレーションデータ移行（任意）
localStorageからDBへの初回移行は不要（各コンポーネントがDB未設定時にデフォルト値を使用するため）。
ユーザーが設定画面で保存操作を行った時点でDBに書き込まれる。

---

## ファイル変更一覧

### 新規作成ファイル

| Phase | ファイル | 説明 |
|-------|---------|------|
| A | `supabase/migrations/008_app_settings.sql` | app_settingsテーブル作成 |
| A | `src/lib/app-settings.ts` | 設定読み込みヘルパー |
| A | `src/app/api/settings/app/route.ts` | 設定API |
| B | `src/components/settings/StepSettings.tsx` | ステップ管理UI |
| C | `src/components/settings/CtaSettings.tsx` | CTA設定UI |
| D | `src/components/settings/ReminderSettings.tsx` | リマインダー設定UI |
| D | `src/components/settings/DiagnosisSettings.tsx` | 診断設定UI |
| E | `src/hooks/useAppSetting.ts` | 設定フック |

### 変更ファイル

| Phase | ファイル | 変更内容 |
|-------|---------|---------|
| A | `supabase/schema.sql` | app_settingsテーブル追加 |
| A | `src/lib/database.ts` | app_settings型追加 |
| A | `src/lib/queries.ts` | CRUD関数4件追加 |
| B | `src/app/dashboard/settings/page.tsx` | タブ追加（steps） |
| B | `src/lib/step-master.ts` | 非同期版関数追加 |
| B | `src/app/api/webhook/route.ts` | ステップ取得を非同期化 |
| C | `src/app/dashboard/settings/page.tsx` | タブ追加（cta） |
| C | `src/lib/cta-engine.ts` | 非同期版追加、DB設定読み込み |
| C | `src/lib/types.ts` | CTA設定型追加 |
| D | `src/app/dashboard/settings/page.tsx` | タブ追加（reminder, diagnosis） |
| D | `src/app/api/cron/reminders/route.ts` | DB設定読み込み |
| D | `src/lib/diagnosis.ts` | 非同期版追加 |
| D | `src/lib/types.ts` | リマインダー/診断設定型追加 |
| E | `src/components/settings/LineSettings.tsx` | DB保存に変更 |
| E | `src/components/settings/TagSettings.tsx` | DB保存に変更 |
| E | `src/components/settings/LeadSourceSettings.tsx` | DB保存に変更 |
| E | `src/components/settings/TemplateSettings.tsx` | DB保存に変更 |
| E | `src/components/settings/ExitSettings.tsx` | DB保存に変更 |
| E | `src/components/settings/StatusSettings.tsx` | DB保存に変更 |

---

## 並列実行可能なタスク

```
Phase A (必須・最初)
  A-1 ─────────────────> A-4 ───> A-5 ───> (B-4, C-4, D-4, D-5)
  A-2 (A-1と並列) ──────/         A-6 (A-4と並列)
  A-3 (A-1と並列) ────/

Phase B            Phase C            Phase D            Phase E
B-1 ──> B-2 ──>   C-1 ──> C-2 ──>   D-1 ──> D-2 ──>   E-2 ──> E-1
        B-3        C-3               D-3
B-4 ──> B-5       C-4 ──> C-5       D-4
                                     D-5 ──> D-6
```

- Phase B, C, D, E は全てPhase A完了後に着手可能
- Phase B, C, D, E は互いに独立しており並列実行可能
- 各Phase内のUI作成（B-2, C-2, D-2）とエンジン変更（B-4, C-4, D-4/D-5）は並列可能
- page.tsx のタブ追加（B-3, C-3, D-3）は最後にまとめて行うことも可

---

## 設計原則の遵守事項

| 原則 | 適用箇所 |
|------|---------|
| any禁止 | 全ての新規型定義、queries.ts のジェネリクス |
| try-catch必須 | API Route全ハンドラ、queries.ts全関数、useAppSettingフック |
| AbortController | API Route（120秒）、フロントfetch（20秒） |
| 絵文字禁止 | 全UIコンポーネント（SVGアイコンのみ） |
| 日本語エラー | 全エラーメッセージ |
| タイムアウト必須 | 全非同期処理 |
| DB優先フォールバック | getSetting関数でDB -> コードデフォルトの順 |

---

## 設定ページ最終タブ構成

```
設定
├── LINE連携        (既存 -> Phase Eで保存先変更)
├── タグ            (既存 -> Phase Eで保存先変更)
├── 流入元          (既存 -> Phase Eで保存先変更)
├── 定型文          (既存 -> Phase Eで保存先変更)
├── 出口            (既存 -> Phase Eで保存先変更)
├── ステータス      (既存 -> Phase Eで保存先変更)
├── ステップ管理    (Phase B: 新規)
├── CTA設定         (Phase C: 新規)
├── リマインダー    (Phase D: 新規)
└── 診断設定        (Phase D: 新規)
```

---

## 注意事項

1. **後方互換性**: 全てのエンジン関数は同期版を残し、DB未接続時（mock環境含む）はデフォルト値で動作する
2. **キャッシュ不要**: app_settings はアクセス頻度が低い（設定変更時 + webhook受信時）。LRUキャッシュは不要
3. **RLSポリシー**: 既存テーブルと同じく anon キーを全拒否。service_role キーのみアクセス可
4. **LINE設定の特殊性**: channelAccessToken/channelSecret はセキュリティ上、DBに平文保存。環境変数への移行は将来課題
5. **recommend-engine.ts**: レコメンド重みのDB化は複雑度が高いため、Phase C/D完了後の追加Phaseとして実施を推奨（本計画ではスコープ外）
