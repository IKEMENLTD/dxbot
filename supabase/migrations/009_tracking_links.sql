-- 009: トラッキングリンク（流入元管理）
-- クリック数を計測するためのトラッキングリンクテーブル

CREATE TABLE IF NOT EXISTS tracking_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  lead_source TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  click_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_links_code ON tracking_links(code);
CREATE INDEX idx_tracking_links_active ON tracking_links(is_active);

ALTER TABLE tracking_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_anon_select_tracking_links ON tracking_links FOR SELECT TO anon USING (false);
CREATE POLICY deny_anon_insert_tracking_links ON tracking_links FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY deny_anon_update_tracking_links ON tracking_links FOR UPDATE TO anon USING (false);
CREATE POLICY deny_anon_delete_tracking_links ON tracking_links FOR DELETE TO anon USING (false);
