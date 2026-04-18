-- Migration: 0006_app_publisher_website.sql
-- Add publisher website field for merchant applications

ALTER TABLE applications ADD COLUMN publisher_website TEXT;
