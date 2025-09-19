-- Remove ALL RLS restrictions from all tables
-- Run this in Supabase SQL Editor to open up all tables

-- Disable RLS on all tables
ALTER TABLE public.superjournal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ephemeral_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.persistent_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.boss DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies (clean slate)
DROP POLICY IF EXISTS "Public access to superjournal_entries" ON public.superjournal_entries;
DROP POLICY IF EXISTS "Users can manage their own entries" ON public.superjournal_entries;
DROP POLICY IF EXISTS "Users manage own superjournal entries" ON public.superjournal_entries;
DROP POLICY IF EXISTS "Users can access their own entries" ON public.superjournal_entries;
DROP POLICY IF EXISTS "Enable all for authenticated users only" ON public.superjournal_entries;

DROP POLICY IF EXISTS "Public access to journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can view their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users manage own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Enable all for authenticated users only" ON public.journal_entries;

DROP POLICY IF EXISTS "Public access to ephemeral_attachments" ON public.ephemeral_attachments;
DROP POLICY IF EXISTS "Users can manage their own attachments" ON public.ephemeral_attachments;
DROP POLICY IF EXISTS "Users manage own ephemeral attachments" ON public.ephemeral_attachments;

DROP POLICY IF EXISTS "Public access to persistent_attachments" ON public.persistent_attachments;
DROP POLICY IF EXISTS "Users can manage their own attachments" ON public.persistent_attachments;
DROP POLICY IF EXISTS "Authenticated users can read persistent attachments" ON public.persistent_attachments;
DROP POLICY IF EXISTS "Authenticated users can manage persistent attachments" ON public.persistent_attachments;

DROP POLICY IF EXISTS "Users can view their own tokens" ON public.google_tokens;
DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.google_tokens;
DROP POLICY IF EXISTS "Users manage own Google tokens" ON public.google_tokens;

-- Create simple public access policies for everything
-- These allow ANYONE to read/write EVERYTHING (no auth required)

-- Superjournal - full public access
CREATE POLICY "Public full access"
ON public.superjournal_entries
FOR ALL
USING (true)
WITH CHECK (true);

-- Journal - full public access
CREATE POLICY "Public full access"
ON public.journal_entries
FOR ALL
USING (true)
WITH CHECK (true);

-- Ephemeral attachments - full public access
CREATE POLICY "Public full access"
ON public.ephemeral_attachments
FOR ALL
USING (true)
WITH CHECK (true);

-- Persistent attachments - full public access
CREATE POLICY "Public full access"
ON public.persistent_attachments
FOR ALL
USING (true)
WITH CHECK (true);

-- Google tokens - full public access (if you still need this table)
CREATE POLICY "Public full access"
ON public.google_tokens
FOR ALL
USING (true)
WITH CHECK (true);

-- Re-enable RLS but with public policies (Supabase requires RLS to be on for policies to work)
ALTER TABLE public.superjournal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ephemeral_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persistent_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

-- Verify the changes
SELECT tablename,
       CASE WHEN rowsecurity THEN 'RLS Enabled ✅' ELSE 'RLS Disabled ❌' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('superjournal_entries', 'journal_entries', 'ephemeral_attachments', 'persistent_attachments', 'google_tokens');

-- Show all policies
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;