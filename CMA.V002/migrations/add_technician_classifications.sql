-- Migration: Add Technician Classifications & System Settings
-- Execute this script in the Supabase SQL Editor

-- 1. Add classification column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS classification TEXT CHECK (classification IN ('JUNIOR', 'PLENO', 'SENIOR'));

-- 2. Create system_settings table to store global configurations like technician targets
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Insert default technician targets
INSERT INTO system_settings (key, value)
VALUES (
    'technician_targets',
    '{"JUNIOR": 85000, "PLENO": 100000, "SENIOR": 120000}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 4. Enable RLS on system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies for system_settings
-- Only ADMIN or ASSISTANT can modify settings
CREATE POLICY "Admins e Assistentes podem gerenciar settings"
ON system_settings
FOR ALL
TO authenticated
USING (
   EXISTS (
      SELECT 1 FROM users WHERE users.auth_id = auth.uid() AND users.role IN ('ADMIN', 'ASSISTANT')
   )
);

-- Everyone can read settings
CREATE POLICY "Todos podem ler settings"
ON system_settings
FOR SELECT
TO authenticated
USING (true);
