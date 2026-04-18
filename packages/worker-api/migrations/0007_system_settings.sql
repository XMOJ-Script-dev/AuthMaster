-- Migration: 0007_system_settings.sql
-- Add global system settings for merchant registration workflow

CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  allow_merchant_registration INTEGER NOT NULL DEFAULT 1,
  merchant_registration_requires_review INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO system_settings (
  id,
  allow_merchant_registration,
  merchant_registration_requires_review,
  updated_at
) VALUES (
  1,
  1,
  0,
  datetime('now')
);
