-- Check what RLS policies currently exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Drop ALL existing RLS policies
DROP POLICY IF EXISTS "Users can access their own superjournal entries" ON superjournal_entries;
DROP POLICY IF EXISTS "Users can access their own journal entries" ON journal_entries;  
DROP POLICY IF EXISTS "Users can access their own attachments" ON ephemeral_attachments;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Boss only access" ON superjournal_entries;
DROP POLICY IF EXISTS "Boss only access" ON journal_entries;
DROP POLICY IF EXISTS "Boss only access" ON ephemeral_attachments;
DROP POLICY IF EXISTS "Boss only access" ON profiles;