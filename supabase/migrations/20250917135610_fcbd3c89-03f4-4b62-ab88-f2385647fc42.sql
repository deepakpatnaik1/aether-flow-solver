-- Fix RLS policies to require authentication and proper access control

-- Update google_tokens policies to be more secure
DROP POLICY IF EXISTS "Public can check connection status" ON public.google_tokens;
DROP POLICY IF EXISTS "Service role can manage google_tokens" ON public.google_tokens;

CREATE POLICY "Users can only access their own tokens" 
ON public.google_tokens 
FOR ALL 
USING (user_email = auth.jwt() ->> 'email');

-- Update journal_entries to require authentication
DROP POLICY IF EXISTS "Public access to journal_entries" ON public.journal_entries;

CREATE POLICY "Authenticated users can access journal_entries" 
ON public.journal_entries 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Update superjournal_entries to require authentication  
DROP POLICY IF EXISTS "Public access to superjournal_entries" ON public.superjournal_entries;

CREATE POLICY "Authenticated users can access superjournal_entries" 
ON public.superjournal_entries 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Update past_journals_full to require authentication
DROP POLICY IF EXISTS "Public access to knowledge_entries" ON public.past_journals_full;

CREATE POLICY "Authenticated users can access past_journals_full" 
ON public.past_journals_full 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Update processes to require authentication
DROP POLICY IF EXISTS "Public access to processes" ON public.processes;

CREATE POLICY "Authenticated users can access processes" 
ON public.processes 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Update personas to require authentication
DROP POLICY IF EXISTS "Public access to personas" ON public.personas;

CREATE POLICY "Authenticated users can access personas" 
ON public.personas 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Update boss to require authentication
DROP POLICY IF EXISTS "Public access to boss" ON public.boss;

CREATE POLICY "Authenticated users can access boss" 
ON public.boss 
FOR ALL 
USING (auth.role() = 'authenticated');