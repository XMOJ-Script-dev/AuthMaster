-- Migration: 0008_app_policy_links.sql
-- Add optional legal policy links for application publisher

ALTER TABLE applications ADD COLUMN privacy_policy_url TEXT;
ALTER TABLE applications ADD COLUMN children_policy_url TEXT;
ALTER TABLE applications ADD COLUMN terms_of_service_url TEXT;