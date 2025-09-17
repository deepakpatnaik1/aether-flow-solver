-- Secure sensitive tables with proper user-specific RLS policies

-- First, ensure RLS is enabled on all sensitive tables
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superjournal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.past_journals_full ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boss ENABLE ROW LEVEL SECURITY;

-- Drop all existing overly permissive policies
DROP POLICY IF EXISTS "Public can check connection status" ON public.google_tokens;
DROP POLICY IF EXISTS "Service role can manage google_tokens" ON public.google_tokens;
DROP POLICY IF EXISTS "Users can only access their own tokens" ON public.google_tokens;
DROP POLICY IF EXISTS "Public access to journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Authenticated users can access journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Public access to superjournal_entries" ON public.superjournal_entries;
DROP POLICY IF EXISTS "Authenticated users can access superjournal_entries" ON public.superjournal_entries;
DROP POLICY IF EXISTS "Public access to knowledge_entries" ON public.past_journals_full;
DROP POLICY IF EXISTS "Authenticated users can access past_journals_full" ON public.past_journals_full;
DROP POLICY IF EXISTS "Public access to processes" ON public.processes;
DROP POLICY IF EXISTS "Authenticated users can access processes" ON public.processes;
DROP POLICY IF EXISTS "Public access to personas" ON public.personas;
DROP POLICY IF EXISTS "Authenticated users can access personas" ON public.personas;
DROP POLICY IF EXISTS "Public access to boss" ON public.boss;
DROP POLICY IF EXISTS "Authenticated users can access boss" ON public.boss;

-- Add user_id column to tables that need user-specific access
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.superjournal_entries ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.past_journals_full ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.personas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.boss ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create secure user-specific policies for google_tokens
CREATE POLICY "Users can only access their own google tokens" 
ON public.google_tokens 
FOR ALL 
TO authenticated
USING (user_email = auth.jwt() ->> 'email');

-- Create secure user-specific policies for journal_entries
CREATE POLICY "Users can only access their own journal entries" 
ON public.journal_entries 
FOR ALL 
TO authenticated
USING (user_id = auth.uid());

-- Create secure user-specific policies for superjournal_entries
CREATE POLICY "Users can only access their own superjournal entries" 
ON public.superjournal_entries 
FOR ALL 
TO authenticated
USING (user_id = auth.uid());

-- Create secure user-specific policies for past_journals_full
CREATE POLICY "Users can only access their own past journals" 
ON public.past_journals_full 
FOR ALL 
TO authenticated
USING (user_id = auth.uid());

-- Create secure user-specific policies for processes
CREATE POLICY "Users can only access their own processes" 
ON public.processes 
FOR ALL 
TO authenticated
USING (user_id = auth.uid());

-- Create secure user-specific policies for personas
CREATE POLICY "Users can only access their own personas" 
ON public.personas 
FOR ALL 
TO authenticated
USING (user_id = auth.uid());

-- Create secure user-specific policies for boss
CREATE POLICY "Users can only access their own boss entries" 
ON public.boss 
FOR ALL 
TO authenticated
USING (user_id = auth.uid());