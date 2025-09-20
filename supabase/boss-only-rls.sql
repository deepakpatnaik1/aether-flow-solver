-- Boss-Only RLS Policies for Aether
-- This ensures only deepakpatnaik1@gmail.com can access the data

-- First, enable RLS on all tables
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE superjournal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ephemeral_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Boss only access" ON journal_entries;
DROP POLICY IF EXISTS "Boss only access" ON superjournal_entries;
DROP POLICY IF EXISTS "Boss only access" ON profiles;
DROP POLICY IF EXISTS "Boss only access" ON ephemeral_attachments;

-- Create Boss-only policies for each table
-- Journal entries - Boss can do everything
CREATE POLICY "Boss only access" ON journal_entries
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'deepakpatnaik1@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'deepakpatnaik1@gmail.com');

-- Superjournal entries - Boss can do everything
CREATE POLICY "Boss only access" ON superjournal_entries
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'deepakpatnaik1@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'deepakpatnaik1@gmail.com');

-- Profiles - Boss can do everything
CREATE POLICY "Boss only access" ON profiles
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'deepakpatnaik1@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'deepakpatnaik1@gmail.com');

-- Ephemeral attachments - Boss can do everything
CREATE POLICY "Boss only access" ON ephemeral_attachments
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'deepakpatnaik1@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'deepakpatnaik1@gmail.com');

-- Note: Storage bucket policies need to be configured in Supabase Dashboard
-- Go to Storage > Policies and ensure each bucket has RLS enabled with Boss-only access