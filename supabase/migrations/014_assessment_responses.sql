-- ===== Migration 014: DXレベル診断フォーム アセスメント回答テーブル =====

CREATE TABLE IF NOT EXISTS assessment_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name            TEXT NOT NULL,
  company_name    TEXT NOT NULL,
  industry        TEXT NOT NULL,
  answers         JSONB NOT NULL,           -- number[] (30要素, 各1-5)
  axis_scores     JSONB NOT NULL,           -- { a1, a2, b, c, d }
  precision_score INTEGER NOT NULL CHECK (precision_score BETWEEN 30 AND 150),
  exact_level     INTEGER NOT NULL CHECK (exact_level BETWEEN 0 AND 50),
  level_band      TEXT NOT NULL
    CHECK (level_band IN ('lv_01_10','lv_11_20','lv_21_30','lv_31_40','lv_41_50')),
  line_user_id    TEXT                      -- nullable: LINE連携時に使用
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_assessment_created_at  ON assessment_responses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_level_band  ON assessment_responses (level_band);
CREATE INDEX IF NOT EXISTS idx_assessment_line_user_id ON assessment_responses (line_user_id)
  WHERE line_user_id IS NOT NULL;

-- Row Level Security
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;

-- 公開フォームからの書き込みを許可（service_roleはRLSをバイパスして全件読み書き可）
CREATE POLICY "public_insert" ON assessment_responses
  FOR INSERT WITH CHECK (true);
