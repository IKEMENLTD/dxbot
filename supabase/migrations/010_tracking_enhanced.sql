-- ===== 010: トラッキング拡張 =====
-- 個別クリックログテーブル + users.tracking_link_id

-- 個別クリックログテーブル
CREATE TABLE IF NOT EXISTS tracking_clicks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tracking_link_id TEXT NOT NULL REFERENCES tracking_links(id) ON DELETE CASCADE,
  device_type TEXT,
  os TEXT,
  browser TEXT,
  referer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  language TEXT,
  country TEXT,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tracking_clicks_link ON tracking_clicks(tracking_link_id);
CREATE INDEX idx_tracking_clicks_at ON tracking_clicks(clicked_at DESC);

ALTER TABLE tracking_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_anon_select_tracking_clicks ON tracking_clicks FOR SELECT TO anon USING (false);
CREATE POLICY deny_anon_insert_tracking_clicks ON tracking_clicks FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY deny_anon_update_tracking_clicks ON tracking_clicks FOR UPDATE TO anon USING (false);
CREATE POLICY deny_anon_delete_tracking_clicks ON tracking_clicks FOR DELETE TO anon USING (false);

-- usersテーブルにtracking_link_id追加（流入元リンクとの紐付け）
ALTER TABLE users ADD COLUMN IF NOT EXISTS tracking_link_id TEXT REFERENCES tracking_links(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_tracking_link ON users(tracking_link_id);
