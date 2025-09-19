-- PRODUCTION RLS RESTORE - Re-enable security with admin access
-- Run this in Supabase SQL Editor before going to production

-- Re-enable RLS on all tables
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superjournal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ephemeral_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

-- Drop any overly permissive policies from testing
DROP POLICY IF EXISTS "anon_read_all" ON public.journal_entries;
DROP POLICY IF EXISTS "anon_read_all" ON public.superjournal_entries;
DROP POLICY IF EXISTS "anon_read_all" ON public.ephemeral_attachments;
DROP POLICY IF EXISTS "anon_read_all" ON public.profiles;
DROP POLICY IF EXISTS "anon_read_all" ON public.google_tokens;

-- Revoke excessive permissions from anon role
REVOKE ALL ON public.journal_entries FROM anon;
REVOKE ALL ON public.superjournal_entries FROM anon;
REVOKE ALL ON public.ephemeral_attachments FROM anon;
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.google_tokens FROM anon;

-- Create policies for deepakpatnaik1@gmail.com (full access)
CREATE POLICY "admin_all_access_journal" ON public.journal_entries
FOR ALL USING (auth.email() = 'deepakpatnaik1@gmail.com');

CREATE POLICY "admin_all_access_superjournal" ON public.superjournal_entries
FOR ALL USING (auth.email() = 'deepakpatnaik1@gmail.com');

CREATE POLICY "admin_all_access_attachments" ON public.ephemeral_attachments
FOR ALL USING (auth.email() = 'deepakpatnaik1@gmail.com');

CREATE POLICY "admin_all_access_profiles" ON public.profiles
FOR ALL USING (auth.email() = 'deepakpatnaik1@gmail.com');

CREATE POLICY "admin_all_access_google_tokens" ON public.google_tokens
FOR ALL USING (auth.email() = 'deepakpatnaik1@gmail.com');

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.superjournal_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ephemeral_attachments TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_tokens TO authenticated;

-- Storage bucket policies (ensure admin can access)
-- Note: Storage policies are managed in Supabase Dashboard
-- Make sure deepakpatnaik1@gmail.com has access to all buckets

COMMENT ON TABLE public.journal_entries IS 'RLS enabled - Admin access for deepakpatnaik1@gmail.com';
COMMENT ON TABLE public.superjournal_entries IS 'RLS enabled - Admin access for deepakpatnaik1@gmail.com';

-- Verify the policies are working
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('journal_entries', 'superjournal_entries', 'ephemeral_attachments', 'profiles', 'google_tokens')
ORDER BY tablename, policyname;