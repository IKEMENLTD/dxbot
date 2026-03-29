-- ===== Migration 016: 欠落カラムの追加 =====
-- users テーブルに不足しているカラムを追加

-- migration 002 から欠落しているカラム
ALTER TABLE users ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- migration 013 から欠落しているカラム
ALTER TABLE users ADD COLUMN IF NOT EXISTS level_source TEXT NOT NULL DEFAULT 'initial';
ALTER TABLE users ADD COLUMN IF NOT EXISTS band_survey_score INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS assessed_band TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS precision_score INTEGER;

-- CHECK制約の追加（既存で付いていない場合のみ）
DO $$
BEGIN
  -- level_source のCHECK制約
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'users_level_source_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_level_source_check
      CHECK (level_source IN ('initial', 'band_survey', 'precision'));
  END IF;

  -- assessed_band のCHECK制約
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'users_assessed_band_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_assessed_band_check
      CHECK (assessed_band IS NULL OR assessed_band IN ('lv_01_10', 'lv_11_20', 'lv_21_30', 'lv_31_40', 'lv_41_50'));
  END IF;

  -- precision_score のCHECK制約
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'users_precision_score_range'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_precision_score_range
      CHECK (precision_score IS NULL OR precision_score BETWEEN 30 AND 150);
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_users_level_source ON users (level_source);
CREATE INDEX IF NOT EXISTS idx_users_assessed_band ON users (assessed_band);
