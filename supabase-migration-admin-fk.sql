-- ============================================================
-- MIGRATION: Fix admin user FK constraint issues
-- Run this if you already applied the schema and get 500 errors
-- when admin tries to create research jobs or other records
-- ============================================================

-- Insert admin user into users table (needed for FK constraints)
-- The admin token uses supabase_uid = 'admin:1'
INSERT INTO users (supabase_uid, email, name, role)
VALUES ('admin:1', 'admin', 'admin', 'admin')
ON CONFLICT (supabase_uid) DO NOTHING;

-- Verify the admin user was created
SELECT id, supabase_uid, email, name, role FROM users WHERE supabase_uid = 'admin:1';
