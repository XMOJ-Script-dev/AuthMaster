-- Migration: 0001_initial_schema.sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_users_email ON users(email);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  app_id TEXT UNIQUE NOT NULL,
  app_secret TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  redirect_uris TEXT NOT NULL,
  scopes TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_app_id ON applications(app_id);

-- Create authorizations table
CREATE TABLE IF NOT EXISTS authorizations (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(app_id, user_id)
);

CREATE INDEX idx_authorizations_app_user ON authorizations(app_id, user_id);

-- Create oauth_tokens table
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  access_token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,
  token_type TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  scope TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_oauth_tokens_access_token ON oauth_tokens(access_token);
CREATE INDEX idx_oauth_tokens_refresh_token ON oauth_tokens(refresh_token);
CREATE INDEX idx_oauth_tokens_app_user ON oauth_tokens(app_id, user_id);

-- Create api_usage table
CREATE TABLE IF NOT EXISTS api_usage (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  data_usage INTEGER DEFAULT 0,
  avg_response_time REAL DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(app_id, endpoint, created_at)
);

CREATE INDEX idx_api_usage_app_id ON api_usage(app_id);
CREATE INDEX idx_api_usage_date ON api_usage(created_at);
