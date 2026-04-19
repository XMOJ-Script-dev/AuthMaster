-- Migration: 0010_totp.sql
-- Store TOTP credentials, enrollment challenges, and recovery codes

CREATE TABLE IF NOT EXISTS totp_credentials (
  user_id TEXT PRIMARY KEY,
  secret_encrypted TEXT NOT NULL,
  enabled_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS totp_setup_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  secret_encrypted TEXT NOT NULL,
  recovery_code_hashes TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_totp_setup_challenges_user_id ON totp_setup_challenges(user_id);
CREATE INDEX idx_totp_setup_challenges_expires_at ON totp_setup_challenges(expires_at);

CREATE TABLE IF NOT EXISTS recovery_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_recovery_codes_user_id ON recovery_codes(user_id);
CREATE INDEX idx_recovery_codes_used_at ON recovery_codes(used_at);