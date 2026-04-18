-- Migration: 0004_admin_system_management.sql
-- Add admin system management fields and audit logs

ALTER TABLE applications ADD COLUMN is_blocked INTEGER DEFAULT 0;
ALTER TABLE applications ADD COLUMN blocked_reason TEXT;
ALTER TABLE applications ADD COLUMN blocked_at TEXT;
ALTER TABLE applications ADD COLUMN warning_message TEXT;
ALTER TABLE applications ADD COLUMN warning_at TEXT;

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  before_data TEXT,
  after_data TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
