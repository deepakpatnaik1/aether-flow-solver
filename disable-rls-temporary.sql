-- TEMPORARY: Disable RLS for UI development
-- WARNING: Run enable-rls.sql before going to production!

-- Disable RLS on all relevant tables
ALTER TABLE public.journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.superjournal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ephemeral_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens DISABLE ROW LEVEL SECURITY;

-- Grant full access to anon role temporarily
GRANT ALL ON public.journal_entries TO anon;
GRANT ALL ON public.superjournal_entries TO anon;
GRANT ALL ON public.ephemeral_attachments TO anon;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.google_tokens TO anon;

-- Make sure we can read without auth
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Note: Run this in Supabase SQL Editor
-- Remember to re-enable RLS before production!