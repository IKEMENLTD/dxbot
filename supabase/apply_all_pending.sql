-- ===================================================================
-- 未適用migration 一括実行用
-- Supabase SQL Editor にこのファイルの内容を貼り付けて実行してください
-- 実行順序: カラム追加 → ビュー作成 → トリガー → データ修正
-- ===================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: users テーブルの欠落カラム追加 (migration 016)
-- ---------------------------------------------------------------------------

ALTER TABLE users ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS level_source TEXT NOT NULL DEFAULT 'initial';
ALTER TABLE users ADD COLUMN IF NOT EXISTS band_survey_score INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS assessed_band TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS precision_score INTEGER;

-- CHECK制約
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_level_source_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_level_source_check
      CHECK (level_source IN ('initial', 'band_survey', 'precision'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_assessed_band_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_assessed_band_check
      CHECK (assessed_band IS NULL OR assessed_band IN ('lv_01_10', 'lv_11_20', 'lv_21_30', 'lv_31_40', 'lv_41_50'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_precision_score_range'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_precision_score_range
      CHECK (precision_score IS NULL OR precision_score BETWEEN 30 AND 150);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_level_source ON users (level_source);
CREATE INDEX IF NOT EXISTS idx_users_assessed_band ON users (assessed_band);

-- ---------------------------------------------------------------------------
-- STEP 2: contact_list_view を read_at ベースに再作成 (migration 015)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW contact_list_view AS
SELECT
  u.id,
  u.preferred_name,
  u.company_name,
  u.industry,
  u.customer_status,
  u.profile_picture_url,
  u.tags,
  u.tracking_link_id,
  unread.unread_count,
  latest_msg.last_message,
  latest_msg.last_message_at,
  latest_msg.last_sender
FROM users u
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS unread_count FROM chat_messages cm2
  WHERE cm2.user_id = u.id AND cm2.sender = 'user' AND cm2.read_at IS NULL
) unread ON TRUE
LEFT JOIN LATERAL (
  SELECT
    cm3.content AS last_message,
    cm3.sent_at AS last_message_at,
    cm3.sender  AS last_sender
  FROM chat_messages cm3
  WHERE cm3.user_id = u.id
  ORDER BY cm3.sent_at DESC
  LIMIT 1
) latest_msg ON TRUE
WHERE EXISTS (
  SELECT 1 FROM chat_messages cm4 WHERE cm4.user_id = u.id
)
ORDER BY latest_msg.last_message_at DESC NULLS LAST;

-- ---------------------------------------------------------------------------
-- STEP 3: chat_messages.read カラム追加 + read/read_at 同期トリガー
-- ---------------------------------------------------------------------------

-- read カラムが欠落している場合に追加
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT FALSE;

-- read_at から read を初期同期
UPDATE chat_messages SET read = TRUE WHERE read_at IS NOT NULL AND read = FALSE;

-- 同期トリガー
CREATE OR REPLACE FUNCTION sync_read_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.read_at IS NOT NULL AND (OLD.read_at IS NULL OR OLD.read IS FALSE) THEN
    NEW.read := TRUE;
  ELSIF NEW.read_at IS NULL AND (OLD.read_at IS NOT NULL OR OLD.read IS TRUE) THEN
    NEW.read := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_read_columns ON chat_messages;
CREATE TRIGGER trg_sync_read_columns
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION sync_read_columns();

-- 未読インデックス
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages (user_id, read) WHERE read = FALSE;

-- ---------------------------------------------------------------------------
-- STEP 4: seed data のキー名修正 (migration 015)
-- ---------------------------------------------------------------------------

UPDATE app_settings SET key = 'line_config' WHERE key = 'line.config';

-- ---------------------------------------------------------------------------
-- STEP 5: level_classification_view (migration 012/013)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW level_classification_view AS
SELECT
  u.id AS user_id,
  u.preferred_name,
  u.company_name,
  u.industry,
  u.level,
  u.score,
  u.steps_completed,
  COALESCE(u.level_source, 'initial') AS level_source,
  u.assessed_band,
  u.band_survey_score,
  u.precision_score,
  CASE
    WHEN u.level <= 10 THEN 'lv_01_10'
    WHEN u.level <= 20 THEN 'lv_11_20'
    WHEN u.level <= 30 THEN 'lv_21_30'
    WHEN u.level <= 40 THEN 'lv_31_40'
    ELSE 'lv_41_50'
  END AS level_band,
  CASE
    WHEN u.level <= 10 THEN 'Lv.1-10'
    WHEN u.level <= 20 THEN 'Lv.11-20'
    WHEN u.level <= 30 THEN 'Lv.21-30'
    WHEN u.level <= 40 THEN 'Lv.31-40'
    ELSE 'Lv.41-50'
  END AS level_band_label,
  CASE
    WHEN u.level <= 10 THEN '1-10'
    WHEN u.level <= 20 THEN '11-20'
    WHEN u.level <= 30 THEN '21-30'
    WHEN u.level <= 40 THEN '31-40'
    ELSE '41-50'
  END AS level_band_range,
  CASE
    WHEN u.level <= 10 THEN 'a1'
    WHEN u.level <= 20 THEN 'a2'
    WHEN u.level <= 30 THEN 'b'
    WHEN u.level <= 40 THEN 'c'
    ELSE 'd'
  END AS primary_axis,
  CASE
    WHEN u.level <= 10 THEN '売上・請求管理'
    WHEN u.level <= 20 THEN '連絡・記録管理'
    WHEN u.level <= 30 THEN '繰り返し作業の自動化'
    WHEN u.level <= 40 THEN 'データ経営'
    ELSE 'ITツール活用'
  END AS primary_axis_label,
  CASE
    WHEN u.level <= 20 THEN 'phase_entry'
    WHEN u.level <= 40 THEN 'phase_practice'
    ELSE 'phase_advanced'
  END AS level_phase,
  CASE
    WHEN u.level <= 20 THEN '入門期'
    WHEN u.level <= 40 THEN '実践期'
    ELSE '活用期'
  END AS level_phase_label,
  CASE
    WHEN u.level <= 30 THEN 'stage_early'
    ELSE 'stage_mature'
  END AS level_stage,
  CASE
    WHEN u.level <= 30 THEN '育成段階'
    ELSE '推進段階'
  END AS level_stage_label,
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
  EXTRACT(DAY FROM NOW() - u.created_at)::INTEGER AS days_since_created,
  EXTRACT(DAY FROM NOW() - u.last_action_at)::INTEGER AS days_since_action,
  CASE
    WHEN u.level <= 10 THEN ROUND(((u.level - 1)::NUMERIC / 10) * 100)
    WHEN u.level <= 20 THEN ROUND(((u.level - 10)::NUMERIC / 10) * 100)
    WHEN u.level <= 30 THEN ROUND(((u.level - 20)::NUMERIC / 10) * 100)
    WHEN u.level <= 40 THEN ROUND(((u.level - 30)::NUMERIC / 10) * 100)
    ELSE ROUND(((LEAST(u.level, 50) - 40)::NUMERIC / 10) * 100)
  END AS band_progress_pct
FROM users u
WHERE u.customer_status != 'churned'
ORDER BY u.score DESC;

-- ---------------------------------------------------------------------------
-- STEP 6: assessment_responses の RLS (migration 014 の補完)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'assessment_responses' AND policyname = 'public_insert'
  ) THEN
    ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "public_insert" ON assessment_responses FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 完了
-- ---------------------------------------------------------------------------
SELECT 'All migrations applied successfully' AS result;
