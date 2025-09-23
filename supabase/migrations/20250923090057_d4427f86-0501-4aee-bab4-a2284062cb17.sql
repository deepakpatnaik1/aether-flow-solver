-- Disable RLS on all tables since authentication has been removed
ALTER TABLE journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE superjournal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE ephemeral_attachments DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies since they're no longer needed
DROP POLICY IF EXISTS "Authorized boss access" ON journal_entries;
DROP POLICY IF EXISTS "Authorized boss access" ON superjournal_entries;
DROP POLICY IF EXISTS "Authorized boss access" ON profiles;
DROP POLICY IF EXISTS "Authorized boss access" ON ephemeral_attachments;

-- Drop user-specific policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;