-- ===== 008: app_settings テーブル =====
-- 管理画面の設定値をDB保存するための汎用テーブル

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: anon キーでの全操作を拒否（service_role のみアクセス可）
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_anon_select_app_settings" ON app_settings FOR SELECT USING (false);
CREATE POLICY "deny_anon_insert_app_settings" ON app_settings FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_anon_update_app_settings" ON app_settings FOR UPDATE USING (false);
CREATE POLICY "deny_anon_delete_app_settings" ON app_settings FOR DELETE USING (false);
