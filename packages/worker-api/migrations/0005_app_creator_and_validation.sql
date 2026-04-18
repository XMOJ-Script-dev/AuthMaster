-- Migration: 0005_app_creator_and_validation.sql
-- Add creator info, official app flags, validation workflow, and change review workflow

ALTER TABLE applications ADD COLUMN creator_name TEXT;
ALTER TABLE applications ADD COLUMN is_official INTEGER DEFAULT 0;
ALTER TABLE applications ADD COLUMN validation_status TEXT DEFAULT 'unverified';
ALTER TABLE applications ADD COLUMN validation_submission TEXT;
ALTER TABLE applications ADD COLUMN validation_submitted_at TEXT;
ALTER TABLE applications ADD COLUMN validation_review_note TEXT;
ALTER TABLE applications ADD COLUMN validation_reviewed_at TEXT;
ALTER TABLE applications ADD COLUMN validation_reviewed_by TEXT;

UPDATE applications
SET creator_name = COALESCE(creator_name, name)
WHERE creator_name IS NULL;

CREATE TABLE IF NOT EXISTS app_change_requests (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  submitted_by_user_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  submission_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  review_note TEXT,
  reviewed_by_user_id TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (app_id) REFERENCES applications(app_id) ON DELETE CASCADE,
  FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_app_change_requests_app_id ON app_change_requests(app_id);
CREATE INDEX IF NOT EXISTS idx_app_change_requests_status ON app_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_app_change_requests_created_at ON app_change_requests(created_at);
