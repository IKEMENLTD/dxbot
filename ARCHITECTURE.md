# ARCHITECTURE.md

## 1. プロジェクト概要

**プロジェクト名**: DXBOT Admin
**バージョン**: 0.1.0
**概要**: 中小企業のDX推進を支援するコーチングプラットフォーム。LINE Bot連携による自動ステップ配信、DXレベル診断、ファネル分析、CTA自動発火を管理する統合管理画面。

**技術スタック**:
| カテゴリ | 技術 | バージョン |
|---------|------|---------|
| フレームワーク | Next.js (App Router) | 16.2.1 |
| UI | React | 19.2.4 |
| DB | Supabase (PostgreSQL) | 2.99.3 |
| チャート | Recharts | 3.8.0 |
| CSS | Tailwind CSS | 4 |
| ホスティング | Netlify | - |
| LINE連携 | LINE Messaging API | - |
| テスト | Vitest | 4.1.0 |

---

## 2. システムアーキテクチャ

```
[ユーザー] → LINE App → LINE Platform → Webhook → /api/webhook
                                                      ↓
                                              conversation-state.ts
                                              step-delivery.ts
                                              cta-engine.ts
                                                      ↓
                                              Supabase (PostgreSQL)
                                                      ↑
[管理者] → ブラウザ → /admindashboard/* → /api/* → queries.ts
                                                      ↓
[見込客] → /assessment → /api/assessment → Supabase
         → /track/[code] → /api/track/[code] → Supabase
```

---

## 3. データベーススキーマ

### テーブル一覧（migration順）

| No. | テーブル名 | Migration | 主要カラム | 用途 |
|-----|-----------|-----------|-----------|------|
| 1 | tags | 001 | id, label, color, sort_order | ユーザータグマスター |
| 2 | user_tags | 001 | user_id, tag_id | ユーザー×タグ紐付け |
| 3 | chat_messages | 001, 005 | id, user_id, sender, content, read, read_at, line_message_id | LINEチャットメッセージ |
| 4 | user_notes | 002 | id, user_id, content, created_at | 管理者メモ |
| 5 | users | 002, 007, 011, 013 | id, preferred_name, company_name, industry, level, score, axis_scores, customer_status, lead_source, weak_axis, tracking_link_id, level_source, band_survey_score, assessed_band, precision_score, profile_picture_url | ユーザーマスター |
| 6 | deals | 002 | id, user_id, exit_type, deal_amount, subsidy_amount, status, started_at | 成約情報 |
| 7 | user_steps | 002 | id, user_id, step_id, step_name, status, stumble_type | ステップ進捗 |
| 8 | cta_history | 002 | id, user_id, trigger, recommended_exit, fired_at, result | CTA発火履歴 |
| 9 | user_timeline | 002 | id, user_id, type, description, metadata, created_at | ユーザーイベント履歴 |
| 10 | recommend_scores | 002 | id, user_id, exit_type, score | 推奨出口スコア |
| 11 | app_settings | 003, 008 | key, value(JSONB), updated_at | アプリ設定（KVストア） |
| 12 | templates | 003 | id, name, content, category | メッセージテンプレート |
| 13 | custom_lead_sources | 003 | id, label, sort_order | カスタム流入元 |
| 14 | conversation_states | 003 | line_user_id, user_id, state(JSONB), preferred_name, industry, lead_source | LINE会話状態 |
| 15 | diagnosis_results | 003 | id, user_id, answers, scores, created_at | 診断結果 |
| 16 | monthly_goals | 003 | year_month(UNIQUE), target_converted, target_revenue | 月間目標 |
| 17 | tracking_links | 009 | id, code(UNIQUE), label, lead_source, destination_url, click_count, is_active | トラッキングリンク |
| 18 | tracking_clicks | 010 | id, tracking_link_id, device_type, os, browser, referer, utm_source, utm_medium, utm_campaign, utm_content, language, country, clicked_at | クリック詳細 |
| 19 | assessment_responses | 014 | id, name, company_name, industry, answers(JSONB), axis_scores(JSONB), precision_score(CHECK 30-150), exact_level(CHECK 0-50), level_band, line_user_id | DXレベル診断回答 |

### ビュー一覧

| ビュー名 | Migration | 用途 |
|---------|-----------|------|
| contact_list_view | 001, 015 | チャットコンタクト一覧（未読数付き）|
| hot_users_view | 002 | アクティブユーザー一覧 |
| user_detail_view | 002 | ユーザー詳細情報 |
| weekly_kpi_view | 003 | 週次KPI集計（8週間） |
| exit_metrics_view | 003 | 出口別成約メトリクス |
| level_classification_view | 012, 013 | レベル分類（バンド/フェーズ/ステージ）|
| level_segment_summary_view | 012, 013 | レベルセグメント別集計 |

### Migration一覧

| No. | ファイル | 内容 |
|-----|---------|------|
| 001 | 001_chat.sql | tags, user_tags, chat_messages, user_notes, contact_list_view |
| 002 | 002_dashboard_carte.sql | users, deals, user_steps, cta_history, user_timeline, recommend_scores, hot_users_view, user_detail_view |
| 003 | 003_funnel_settings_line.sql | app_settings, templates, custom_lead_sources, conversation_states, diagnosis_results, monthly_goals, weekly_kpi_view, exit_metrics_view |
| 004 | 004_seed_data.sql | 初期タグ・設定データ投入 |
| 005 | 005_chat_messages_line_columns.sql | chat_messages LINE連携カラム追加（line_message_id, line_timestamp, read_at等） |
| 006 | 006_reminder_timeline_type.sql | user_timelineのタイプ拡張（reminder系） |
| 007 | 007_users_line_user_id.sql | users.line_user_idカラム追加 |
| 008 | 008_app_settings.sql | app_settingsテーブル再構築 |
| 009 | 009_tracking_links.sql | tracking_linksテーブル + users.tracking_link_id |
| 010 | 010_tracking_enhanced.sql | tracking_clicksテーブル（UTM/OS/ブラウザ/デバイス） |
| 011 | 011_user_profile_picture.sql | users.profile_picture_url, users.status_message |
| 012 | 012_level_classification_view.sql | level_classification_view, level_segment_summary_view |
| 013 | 013_level_assessment_columns.sql | users.level_source/band_survey_score/assessed_band/precision_score + ビュー更新 |
| 014 | 014_assessment_responses.sql | assessment_responsesテーブル + RLS + インデックス |
| 015 | 015_fix_read_at_and_seed_key.sql | contact_list_view read_at統一, read同期トリガー, seedキー修正, precision_score CHECK制約 |

---

## 4. APIエンドポイント一覧

### 認証不要（公開）

| パス | メソッド | 機能 |
|------|---------|------|
| `POST /api/assessment` | POST | DXレベル診断回答保存。30問バリデーション、サーバーサイドスコア計算 |
| `GET /api/assessment/config` | GET | 診断フォーム設定（LINE URL、設問、外観スタイル）|
| `GET /api/track/[code]` | GET | トラッキングリンク追跡。ボットフィルタリング、UTMパラメータ収集 |
| `POST /api/auth/login` | POST | 管理画面ログイン |
| `POST /api/webhook` | POST | LINE Webhook受信（HMAC-SHA256署名検証）|

### 認証必須（管理者）

| パス | メソッド | 機能 |
|------|---------|------|
| `GET /api/assessment/list` | GET | 診断回答一覧（最新200件）|
| `GET /api/assessment/export` | GET | 診断回答CSVエクスポート（BOM付きUTF-8）|
| `GET /api/chat` | GET | チャットメッセージ取得（ポーリング）|
| `POST /api/chat` | POST | チャットメッセージ送信（LINE連携）|
| `GET /api/chat/contacts` | GET | コンタクト一覧（未読数付き）|
| `POST /api/chat/mark-read` | POST | 既読/未読トグル（個別/一括、read/unread）|
| `POST /api/chat/upload` | POST | メディアファイルアップロード |
| `GET /api/deals` | GET | 成約一覧 |
| `GET /api/kpi` | GET | ファネルKPI（8週間分）|
| `GET/PUT /api/monthly-goals` | GET/PUT | 月間目標の取得/更新 |
| `GET/PUT /api/settings/app` | GET/PUT | アプリ設定の取得/更新（app_settings KVストア）|
| `GET/PUT/DELETE /api/settings/line` | GET/PUT/DELETE | LINE Bot設定 |
| `POST /api/settings/line/test` | POST | LINE接続テスト |
| `GET /api/tags` | GET | タグマスター一覧 |
| `GET/POST /api/tracking-links` | GET/POST | トラッキングリンク一覧/作成 |
| `GET /api/tracking-links/performance` | GET | トラッキングパフォーマンス集計 |
| `GET/PUT/DELETE /api/tracking-links/[id]` | GET/PUT/DELETE | トラッキングリンク詳細/更新/削除 |
| `GET /api/tracking-links/[id]/clicks` | GET | クリック詳細一覧 |
| `GET /api/tracking-links/[id]/qr` | GET | QRコード生成 |
| `GET /api/tracking-links/[id]/users` | GET | リンク経由ユーザー一覧 |
| `GET /api/users` | GET | ユーザー一覧 |
| `GET/PUT /api/users/[id]` | GET/PUT | ユーザー詳細/更新 |
| `POST /api/users/[id]/notes` | POST | ユーザーノート追加 |
| `POST /api/users/[id]/recommend` | POST | 推奨出口生成 |
| `POST /api/users/[id]/rediagnose` | POST | 再診断実行 |
| `POST /api/users/[id]/sales-email` | POST | 営業メール生成 |
| `POST /api/cron/reminders` | POST | 定期リマインダー実行（Cron認証）|
| `POST /api/auth/logout` | POST | ログアウト |

---

## 5. 管理画面ページ一覧

| パス | ページ名 | 主要コンポーネント |
|------|---------|------------------|
| `/admindashboard` | リード管理 | FilterBar, StatsCards, HotUsersTable, TodayActions |
| `/admindashboard/chat` | チャット | ContactList, MessageList, ChatInput, UserInfoPanel |
| `/admindashboard/funnel` | ファネルKPI | FunnelChart, WeeklyTrend, ExitCards, LtvTracker, GoalProgress |
| `/admindashboard/sources` | 流入元管理 | トラッキングリンクテーブル, パフォーマンス分析, クリック詳細モーダル, ユーザー一覧モーダル |
| `/admindashboard/assessments` | 診断回答一覧 | 回答テーブル, CSVエクスポートボタン |
| `/admindashboard/settings` | 設定（11タブ）| LINE連携, タグ, 流入元, 定型文, 出口, ステータス, ステップ, CTA, リマインダー, 診断, 月目標 |
| `/admindashboard/users/[id]` | ユーザー詳細 | UserHeader, RadarChart, Timeline, StumbleHistory, LtvHistory, NotesActions |

---

## 6. 3段階レベリングシステム

### フロー

```
Stage 1: 初回診断（6問・2択）
  → 5軸スコア算出 → 暫定レベル（Lv.1-10）→ ステップ配信開始

Stage 2: バンドサーベイ（15問・3択・約5分）
  → 合計スコア（0-30）→ バンド判定（Lv.1-10 / 11-20 / 21-30 / 31-40 / 41-50）

Stage 3: 精密ヒアリング（30問・5択・約15分）
  → 合計スコア（30-150）→ 1単位の正確なレベル（Lv.0-50）
  → Webフォーム（/assessment）でも実施可能
```

### レベル分類体系

| 分類 | 区分 | 値 |
|------|------|-----|
| 大分類（Stage） | 育成段階 / 推進段階 | Lv.1-30 / Lv.31-50 |
| 中分類（Phase） | 入門期 / 実践期 / 活用期 | Lv.1-20 / Lv.21-40 / Lv.41-50 |
| 小分類（Band） | 5バンド | Lv.1-10, 11-20, 21-30, 31-40, 41-50 |

### 5軸スコア

| 軸 | ラベル | 対応バンド |
|----|--------|----------|
| A1 | 売上・請求管理 | Lv.1-10 |
| A2 | 連絡・記録管理 | Lv.11-20 |
| B | 繰り返し作業の自動化 | Lv.21-30 |
| C | データ経営 | Lv.31-40 |
| D | ITツール活用 | Lv.41-50 |

---

## 7. CTA（営業提案）エンジン

### 6つのトリガー

| トリガー | 発火条件 | 推奨出口 |
|---------|---------|---------|
| action_boost | 行動加速（日数+ステップ条件）| 設定依存 |
| apo_early | 参加早期（日数+ステップ以下）| 設定依存 |
| subsidy_timing | 補助金申請月+レベル閾値 | 設定依存 |
| lv40_reached | レベル40以上到達 | 設定依存 |
| invoice_stumble | 売上管理スコアが閾値以下 | 設定依存 |
| it_literacy | ITリテラシー不足（複合条件）| 設定依存 |

### 出口タイプ（動的追加可能）

| ID | デフォルトラベル | 用途 |
|----|----------------|------|
| techstars | TECHSTARS研修 | DX研修プログラム |
| taskmate | TaskMate | タスク自動化ツール |
| veteran_ai | ベテランAI | AI営業支援 |
| custom_dev | 受託開発 | カスタム開発 |
| (追加可能) | 管理画面から追加 | 設定→出口タブ |

---

## 8. DXレベル診断フォーム（/assessment）

### フロー
1. 30問の5択スケール（1-5）→ ワンタップで自動進行
2. プロフィール入力（名前・会社名・業種）
3. サーバーサイドでスコア計算 → 結果表示
4. LINE友だち追加CTA

### カスタマイズ項目（管理画面→設定→診断設定）
- 30問の設問テキスト（軸別アコーディオン）
- ボタン形状（square / pill / bar / minimal / circle）
- ボタンサイズ（40-64px）
- カラー設定（アクセント、背景、テキスト、スケール5色、プログレスバー）
- 端ラベルテキスト

---

## 9. トラッキング・UTM計測

### フロー
```
ユーザーが /track/[code]?utm_source=X&utm_medium=Y にアクセス
  → ボット判定（isBot）→ ボットならトラッキングせずリダイレクト
  → 重複クリック判定（sessionStorage 5秒以内）
  → UTMパラメータ + User-Agent + Referer をPOST
  → tracking_clicks にINSERT
  → tracking_links.click_count をインクリメント
  → destination_url にリダイレクト
```

### 計測データ
- UTM: source, medium, campaign, content
- デバイス: device_type, os, browser
- リファラー: document.referrer + HTTPヘッダーフォールバック
- ボット排除: 20+パターンの正規表現判定

---

## 10. チャット既読管理

### 仕組み
- `read_at` (TIMESTAMPTZ) で管理。NULL=未読、非NULL=既読
- `read` (BOOLEAN) はトリガー `trg_sync_read_columns` で自動同期
- 管理者が手動でトグル（メッセージクリック or 「すべて既読」ボタン）
- 楽観的更新 + APIフォールバック

---

## 11. 設定画面タブ一覧

| No. | タブ | キー | 新規追加 | 保存先 |
|-----|------|------|---------|--------|
| 1 | LINE連携 | line_config | - | app_settings |
| 2 | タグ | tags | 可能 | app_settings |
| 3 | 流入元 | lead_sources | 可能 | app_settings |
| 4 | 定型文 | templates | 可能 | app_settings |
| 5 | 出口 | exits | 可能 | app_settings |
| 6 | ステータス | statuses | 可能 | app_settings |
| 7 | ステップ管理 | steps | 編集のみ | app_settings |
| 8 | CTA設定 | cta_config | パラメータ編集 | app_settings |
| 9 | リマインダー | reminder_config | パラメータ編集 | app_settings |
| 10 | 診断設定 | diagnosis_config + precision_questions + assessment_style | 業種追加可 + 設問編集 + 外観 | app_settings |
| 11 | 月目標 | monthly_goals | 月別編集 | monthly_goals テーブル |

---

## 12. 環境変数

| キー | 用途 | 必須 |
|------|------|------|
| SUPABASE_URL | Supabase接続URL | 必須 |
| SUPABASE_SERVICE_ROLE_KEY | Supabase認証キー | 必須 |
| ADMIN_PASSWORD | 管理画面パスワード | 必須 |
| CRON_SECRET | Cronジョブ認証トークン | 必須 |
| LINE_CHANNEL_ACCESS_TOKEN | LINE Botトークン | 任意（管理画面から設定可）|
| LINE_CHANNEL_SECRET | LINEチャネルシークレット | 任意（管理画面から設定可）|
| ANTHROPIC_API_KEY | Claude APIキー | 任意 |
| RESEND_API_KEY | メール送信APIキー | 任意 |

---

## 13. セキュリティ

- **管理画面認証**: ADMIN_PASSWORDによるパスワード認証 + Cookie管理
- **API認証**: requireAuth()ミドルウェアで全管理API保護
- **LINE Webhook**: HMAC-SHA256署名検証
- **Supabase**: service_roleキー使用（RLSバイパス）、公開テーブルはINSERTポリシーのみ
- **暗号化**: LINE認証情報はAES-256-GCMで暗号化してapp_settingsに保存
- **ボット排除**: トラッキングAPIでボット判定フィルタリング
- **入力検証**: 全APIでバリデーション実施、any型禁止

---

## 14. 最終更新

- **日付**: 2026-03-28
- **最新Migration**: 015
- **最新コミット**: DB整合性修正（既読判定・seedキー・precision_score制約）
