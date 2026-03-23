-- ===== Migration 006: リマインダー用 timeline_type 追加 =====
-- reminder_sent を timeline_type enum に追加

ALTER TYPE timeline_type ADD VALUE IF NOT EXISTS 'reminder_sent';
