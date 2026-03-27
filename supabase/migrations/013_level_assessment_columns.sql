-- ===== Migration 013: 3段階レベリング アセスメントカラム追加 =====
-- Stage1(診断6問) → Stage2(バンドサーベイ15問) → Stage3(精密ヒアリング30問)
-- に対応するDB拡張

-- ---------------------------------------------------------------------------
-- users テーブル: レベルアセスメント情報を追加
-- ---------------------------------------------------------------------------

-- レベルの根拠（どのステージで設定されたか）
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS level_source TEXT NOT NULL DEFAULT 'initial'
  CHECK (level_source IN ('initial', 'band_survey', 'precision'));

-- バンドサーベイの合計スコア（0-30）
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS band_survey_score INTEGER;

-- バンドサーベイで判定されたバンド
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS assessed_band TEXT
  CHECK (assessed_band IN ('lv_01_10', 'lv_11_20', 'lv_21_30', 'lv_31_40', 'lv_41_50'));

-- 精密ヒアリングの合計スコア（30-150）
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS precision_score INTEGER;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_users_level_source  ON users (level_source);
CREATE INDEX IF NOT EXISTS idx_users_assessed_band ON users (assessed_band);

-- ---------------------------------------------------------------------------
-- level_classification_view を更新（新カラムを含める）
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW level_classification_view AS
SELECT
  u.id                                            AS user_id,
  u.preferred_name,
  u.company_name,
  u.industry,
  u.level,
  u.score,
  u.steps_completed,

  -- ===== レベルアセスメント情報 =====
  COALESCE(u.level_source, 'initial')             AS level_source,
  u.assessed_band,
  u.band_survey_score,
  u.precision_score,

  -- ===== 小分類: Lv.10刻みバンド =====
  CASE
    WHEN u.level <= 10 THEN 'lv_01_10'
    WHEN u.level <= 20 THEN 'lv_11_20'
    WHEN u.level <= 30 THEN 'lv_21_30'
    WHEN u.level <= 40 THEN 'lv_31_40'
    ELSE                    'lv_41_50'
  END AS level_band,

  CASE
    WHEN u.level <= 10 THEN 'Lv.1-10'
    WHEN u.level <= 20 THEN 'Lv.11-20'
    WHEN u.level <= 30 THEN 'Lv.21-30'
    WHEN u.level <= 40 THEN 'Lv.31-40'
    ELSE                    'Lv.41-50'
  END AS level_band_label,

  CASE
    WHEN u.level <= 10 THEN '1-10'
    WHEN u.level <= 20 THEN '11-20'
    WHEN u.level <= 30 THEN '21-30'
    WHEN u.level <= 40 THEN '31-40'
    ELSE                    '41-50'
  END AS level_band_range,

  -- 対応軸
  CASE
    WHEN u.level <= 10 THEN 'a1'
    WHEN u.level <= 20 THEN 'a2'
    WHEN u.level <= 30 THEN 'b'
    WHEN u.level <= 40 THEN 'c'
    ELSE                    'd'
  END AS primary_axis,

  CASE
    WHEN u.level <= 10 THEN '売上・請求管理'
    WHEN u.level <= 20 THEN '連絡・記録管理'
    WHEN u.level <= 30 THEN '繰り返し作業の自動化'
    WHEN u.level <= 40 THEN 'データ経営'
    ELSE                    'ITツール活用'
  END AS primary_axis_label,

  -- ===== 中分類: DX習熟フェーズ =====
  CASE
    WHEN u.level <= 20 THEN 'phase_entry'
    WHEN u.level <= 40 THEN 'phase_practice'
    ELSE                    'phase_advanced'
  END AS level_phase,

  CASE
    WHEN u.level <= 20 THEN '入門期'
    WHEN u.level <= 40 THEN '実践期'
    ELSE                    '活用期'
  END AS level_phase_label,

  -- ===== 大分類: DX推進ステージ =====
  CASE
    WHEN u.level <= 30 THEN 'stage_early'
    ELSE                    'stage_mature'
  END AS level_stage,

  CASE
    WHEN u.level <= 30 THEN '育成段階'
    ELSE                    '推進段階'
  END AS level_stage_label,

  -- ===== ステータス・属性 =====
  u.customer_status,
  u.recommended_exit,
  u.lead_source,
  u.weak_axis,
  u.stumble_count,
  u.stumble_how_count,

  (u.axis_scores->>'a1')::INTEGER AS axis_score_a1,
  (u.axis_scores->>'a2')::INTEGER AS axis_score_a2,
  (u.axis_scores->>'b')::INTEGER  AS axis_score_b,
  (u.axis_scores->>'c')::INTEGER  AS axis_score_c,
  (u.axis_scores->>'d')::INTEGER  AS axis_score_d,

  u.created_at,
  u.last_action_at,
  EXTRACT(DAY FROM NOW() - u.created_at)::INTEGER       AS days_since_created,
  EXTRACT(DAY FROM NOW() - u.last_action_at)::INTEGER   AS days_since_action,

  -- バンド内進行度（バンド開始点0%、終了点100%）
  CASE
    WHEN u.level <= 10 THEN ROUND(((u.level - 1)::NUMERIC / 10) * 100)
    WHEN u.level <= 20 THEN ROUND(((u.level - 10)::NUMERIC / 10) * 100)
    WHEN u.level <= 30 THEN ROUND(((u.level - 20)::NUMERIC / 10) * 100)
    WHEN u.level <= 40 THEN ROUND(((u.level - 30)::NUMERIC / 10) * 100)
    ELSE                    ROUND(((LEAST(u.level, 50) - 40)::NUMERIC / 10) * 100)
  END AS band_progress_pct

FROM users u
WHERE u.customer_status != 'churned'
ORDER BY u.score DESC;

-- ---------------------------------------------------------------------------
-- level_segment_summary_view も更新（level_sourceを集計に追加）
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW level_segment_summary_view AS
SELECT
  level_stage_label                           AS stage,
  level_phase_label                           AS phase,
  level_band_label                            AS band,
  level_band_range                            AS band_range,
  primary_axis_label                          AS axis,
  COUNT(*)                                    AS user_count,
  AVG(score)::INTEGER                         AS avg_score,
  AVG(steps_completed)::NUMERIC(4,1)          AS avg_steps,
  AVG(days_since_action)::INTEGER             AS avg_days_since_action,
  -- レベルソース別内訳
  COUNT(*) FILTER (WHERE level_source = 'initial')     AS level_initial_count,
  COUNT(*) FILTER (WHERE level_source = 'band_survey') AS level_band_count,
  COUNT(*) FILTER (WHERE level_source = 'precision')   AS level_precision_count,
  -- CVR
  COUNT(*) FILTER (WHERE customer_status = 'meeting')::INTEGER    AS meeting_count,
  COUNT(*) FILTER (WHERE customer_status = 'customer')::INTEGER   AS customer_count,
  ROUND(
    COUNT(*) FILTER (WHERE customer_status IN ('meeting','customer'))::NUMERIC
    / NULLIF(COUNT(*), 0) * 100, 1
  )                                           AS cvr_pct
FROM level_classification_view
GROUP BY
  level_stage_label, level_phase_label,
  level_band_label, level_band_range, primary_axis_label
ORDER BY
  CASE level_band_range
    WHEN '1-10'   THEN 1
    WHEN '11-20'  THEN 2
    WHEN '21-30'  THEN 3
    WHEN '31-40'  THEN 4
    WHEN '41-50'  THEN 5
  END;
