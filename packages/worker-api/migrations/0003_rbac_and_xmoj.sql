-- Migration: 0003_rbac_and_xmoj.sql
-- Add RBAC fields to users and create xmoj bindings table

ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'merchant';
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';

UPDATE users SET role = 'merchant' WHERE role IS NULL;
UPDATE users SET status = 'active' WHERE status IS NULL;

CREATE TABLE IF NOT EXISTS xmoj_bindings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  xmoj_user_id TEXT NOT NULL,
  xmoj_username TEXT NOT NULL,
  phpsessid_encrypted TEXT NOT NULL,
  bind_method TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_xmoj_bindings_user_id ON xmoj_bindings(user_id);
CREATE INDEX IF NOT EXISTS idx_xmoj_bindings_xmoj_user_id ON xmoj_bindings(xmoj_user_id);
