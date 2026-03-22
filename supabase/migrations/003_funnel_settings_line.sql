-- ===================================================================
-- 003_funnel_settings_line.sql
-- ファネルKPI / 設定 / LINE Webhook / レコメンド・CTA拡張
-- ===================================================================

-- ===================================================================
-- weekly_kpi_view（改善版）
-- ===================================================================
DROP VIEW IF EXISTS weekly_kpi_view;

CREATE OR REPLACE VIEW weekly_kpi_view AS
WITH weekly_inflow AS (
  SELECT DATE_TRUNC('week', u.created_at) AS week_start, COUNT(*) AS inflow
  FROM users u WHERE u.created_at >= NOW() - INTERVAL '8 weeks'
  GROUP BY DATE_TRUNC('week', u.created_at)
),
weekly_timeline AS (
  SELECT
    DATE_TRUNC('week', t.created_at) AS week_start,
    COUNT(*) FILTER (WHERE t.type = 'rediagnosis' OR (t.type = 'step_completed' AND t.metadata->>'step_id' = 'S01')) AS diagnosed,
    COUNT(DISTINCT t.user_id) FILTER (WHERE t.type = 'step_completed' AND t.metadata->>'step_id' != 'S01') AS step_started,
    COUNT(*) FILTER (WHERE t.type = 'cta_fired') AS cta_fired,
    COUNT(*) FILTER (WHERE t.type = 'status_change' AND t.metadata->>'to' = 'meeting') AS meeting,
    COUNT(*) FILTER (WHERE t.type = 'deal_created') AS converted
  FROM user_timeline t WHERE t.created_at >= NOW() - INTERVAL '8 weeks'
  GROUP BY DATE_TRUNC('week', t.created_at)
)
SELECT
  TO_CHAR(COALESCE(wi.week_start, wt.week_start), 'MM/DD') AS week,
  COALESCE(wi.inflow, 0)::INT AS inflow,
  COALESCE(wt.diagnosed, 0)::INT AS diagnosed,
  COALESCE(wt.step_started, 0)::INT AS step_started,
  COALESCE(wt.cta_fired, 0)::INT AS cta_fired,
  COALESCE(wt.meeting, 0)::INT AS meeting,
  COALESCE(wt.converted, 0)::INT AS converted
FROM weekly_inflow wi
FULL OUTER JOIN weekly_timeline wt ON wi.week_start = wt.week_start
ORDER BY COALESCE(wi.week_start, wt.week_start);

COMMENT ON VIEW weekly_kpi_view IS '週次ファネルKPI（過去8週）';

-- ===================================================================
-- exit_metrics_view（出口別成約サマリ）
-- ===================================================================
CREATE OR REPLACE VIEW exit_metrics_view AS
SELECT
  d.exit_type,
  COUNT(*)::INT AS count,
  COALESCE(SUM(d.deal_amount), 0)::INT AS revenue,
  COALESCE(SUM(d.subsidy_amount), 0)::INT AS subsidy_total
FROM deals d
WHERE d.status IN ('active', 'completed')
GROUP BY d.exit_type
ORDER BY count DESC;

COMMENT ON VIEW exit_metrics_view IS '出口別成約サマリ（ExitCards用）';

-- ===================================================================
-- monthly_goals テーブル
-- ===================================================================
CREATE TABLE IF NOT EXISTS monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month TEXT NOT NULL UNIQUE,
  target_converted INTEGER NOT NULL DEFAULT 3,
  target_revenue INTEGER NOT NULL DEFAULT 5000000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE monthly_goals IS '月間目標設定（GoalProgress用）';

ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monthly_goals_all" ON monthly_goals FOR ALL USING (true) WITH CHECK (true);

-- ===================================================================
-- app_settings テーブル（KVストア）
-- ===================================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE app_settings IS 'アプリ設定KVストア（LINE設定等）';

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings_all" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- ===================================================================
-- templates テーブル（定型文マスター）
-- ===================================================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE templates IS '定型文テンプレート';

CREATE INDEX idx_templates_sort_order ON templates (sort_order);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_all" ON templates FOR ALL USING (true) WITH CHECK (true);

-- ===================================================================
-- custom_lead_sources テーブル
-- ===================================================================
CREATE TABLE IF NOT EXISTS custom_lead_sources (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE custom_lead_sources IS 'ENUM以外のカスタム流入元';

CREATE INDEX idx_custom_lead_sources_sort ON custom_lead_sources (sort_order);

ALTER TABLE custom_lead_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_lead_sources_all" ON custom_lead_sources FOR ALL USING (true) WITH CHECK (true);

-- ===================================================================
-- conversation_states テーブル（LINE会話状態）
-- user_id は TEXT（users.id が TEXT のため）
-- ===================================================================
CREATE TABLE IF NOT EXISTS conversation_states (
  line_user_id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  state JSONB NOT NULL DEFAULT '{"phase":"idle"}',
  preferred_name TEXT,
  industry TEXT,
  lead_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE conversation_states IS 'LINE会話状態管理（idle→diagnosis→step_active）';

CREATE INDEX idx_conversation_states_user_id ON conversation_states (user_id);
CREATE INDEX idx_conversation_states_phase ON conversation_states ((state->>'phase'));

ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversation_states_all" ON conversation_states FOR ALL USING (true) WITH CHECK (true);

-- ===================================================================
-- diagnosis_results テーブル（診断結果履歴）
-- user_id は TEXT（users.id が TEXT のため）
-- ===================================================================
CREATE TABLE IF NOT EXISTS diagnosis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  axis_scores JSONB NOT NULL,
  total_score INTEGER NOT NULL,
  band INTEGER NOT NULL,
  weak_axis TEXT NOT NULL,
  industry TEXT,
  diagnosed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE diagnosis_results IS '診断結果履歴（再診断対応）';

CREATE INDEX idx_diagnosis_results_user_id ON diagnosis_results (user_id);
CREATE INDEX idx_diagnosis_results_diagnosed_at ON diagnosis_results (diagnosed_at DESC);

ALTER TABLE diagnosis_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diagnosis_results_select" ON diagnosis_results FOR SELECT USING (true);
CREATE POLICY "diagnosis_results_insert" ON diagnosis_results FOR INSERT WITH CHECK (true);

-- ===================================================================
-- recommend_scores 拡張カラム
-- ===================================================================
ALTER TABLE recommend_scores
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reasons JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN recommend_scores.confidence IS 'レコメンド確信度（0-100）';
COMMENT ON COLUMN recommend_scores.reasons IS 'レコメンド理由の配列';

-- ===================================================================
-- cta_history 拡張カラム
-- ===================================================================
ALTER TABLE cta_history
  ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN cta_history.message IS 'CTA発火時の文面';

-- ===================================================================
-- calculate_funnel_kpi() 関数
-- p_user_id 引数は TEXT 型に合わせる
-- ===================================================================
CREATE OR REPLACE FUNCTION calculate_funnel_kpi(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  p_end_date   TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (inflow INT, diagnosed INT, step_started INT, cta_fired INT, meeting INT, converted INT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INT FROM users u WHERE u.created_at >= p_start_date AND u.created_at < p_end_date),
    (SELECT COUNT(*)::INT FROM user_timeline t WHERE t.created_at >= p_start_date AND t.created_at < p_end_date
      AND (t.type = 'rediagnosis' OR (t.type = 'step_completed' AND t.metadata->>'step_id' = 'S01'))),
    (SELECT COUNT(DISTINCT t.user_id)::INT FROM user_timeline t WHERE t.created_at >= p_start_date AND t.created_at < p_end_date
      AND t.type = 'step_completed' AND t.metadata->>'step_id' != 'S01'),
    (SELECT COUNT(*)::INT FROM user_timeline t WHERE t.created_at >= p_start_date AND t.created_at < p_end_date AND t.type = 'cta_fired'),
    (SELECT COUNT(*)::INT FROM user_timeline t WHERE t.created_at >= p_start_date AND t.created_at < p_end_date
      AND t.type = 'status_change' AND t.metadata->>'to' = 'meeting'),
    (SELECT COUNT(*)::INT FROM user_timeline t WHERE t.created_at >= p_start_date AND t.created_at < p_end_date AND t.type = 'deal_created');
END;
$$;

COMMENT ON FUNCTION calculate_funnel_kpi IS '任意期間のファネルKPIを計算';

-- ===================================================================
-- update_recommendation() 関数
-- p_user_id は TEXT 型
-- ===================================================================
CREATE OR REPLACE FUNCTION update_recommendation(
  p_user_id TEXT, p_exit_type exit_type, p_score NUMERIC(5,2),
  p_reason TEXT DEFAULT '', p_confidence NUMERIC(5,2) DEFAULT 0, p_reasons JSONB DEFAULT '[]'
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO recommend_scores (id, user_id, exit_type, score, reason, confidence, reasons, calculated_at)
  VALUES ('rs-' || gen_random_uuid(), p_user_id, p_exit_type, p_score, p_reason, p_confidence, p_reasons, NOW())
  ON CONFLICT (user_id, exit_type)
  DO UPDATE SET score = EXCLUDED.score, reason = EXCLUDED.reason,
    confidence = EXCLUDED.confidence, reasons = EXCLUDED.reasons, calculated_at = NOW();
END;
$$;

COMMENT ON FUNCTION update_recommendation IS 'レコメンドスコアのUPSERT';

-- ===================================================================
-- 初期データ
-- ===================================================================
INSERT INTO monthly_goals (year_month, target_converted, target_revenue) VALUES
  ('2026-03', 3, 5000000), ('2026-04', 3, 5000000), ('2026-05', 3, 5000000)
ON CONFLICT (year_month) DO NOTHING;

INSERT INTO templates (name, text, sort_order) VALUES
  ('進捗確認',   'ステップの進捗はいかがですか？',                                           1),
  ('補助金案内', '補助金の申請受付が始まりました',                                             2),
  ('次ステップ', '次回のステップをお送りします',                                               3),
  ('面談提案',   '面談のご都合はいかがでしょうか？',                                           4),
  ('研修後',     '研修お疲れ様でした。次のステップについてご相談しませんか？',                   5)
ON CONFLICT DO NOTHING;

INSERT INTO app_settings (key, value) VALUES
  ('line.config', '{"channelAccessToken":"","channelSecret":"","webhookUrl":"","botName":null,"verified":false}'),
  ('notification.remind_days', '3'),
  ('notification.pause_days', '7')
ON CONFLICT (key) DO NOTHING;

-- ===================================================================
-- pg_cron（有効化後に実行）
-- ===================================================================
-- Supabase Dashboard → Database → Extensions → pg_cron を有効化後:
--
-- SELECT cron.schedule('weekly-step-reminder', '0 0 * * 1', $$
--   INSERT INTO user_timeline (id, user_id, type, description, metadata)
--   SELECT 'tl-cron-' || gen_random_uuid(), u.id, 'note_added', '週次リマインド自動送信',
--     jsonb_build_object('auto', true, 'trigger', 'weekly_reminder')
--   FROM users u
--   WHERE u.customer_status IN ('prospect', 'contacted', 'meeting')
--     AND u.last_action_at < NOW() - INTERVAL '3 days'
--     AND (u.paused_until IS NULL OR u.paused_until < NOW())
--     AND NOT EXISTS (
--       SELECT 1 FROM user_timeline t
--       WHERE t.user_id = u.id AND t.metadata->>'trigger' = 'weekly_reminder'
--         AND t.created_at >= DATE_TRUNC('week', NOW())
--     );
-- $$);
