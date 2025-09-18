-- Remove all remaining RLS policies to make all tables unrestricted

-- Drop RLS policies for boss table
DROP POLICY IF EXISTS "Users can only access their own boss entries" ON public.boss;

-- Drop RLS policies for google_tokens table  
DROP POLICY IF EXISTS "Block all direct access to google_tokens" ON public.google_tokens;

-- Drop RLS policies for past_journals_full table
DROP POLICY IF EXISTS "Users can only access their own past journals" ON public.past_journals_full;

-- Drop RLS policies for personas table
DROP POLICY IF EXISTS "Users can only access their own personas" ON public.personas;

-- Drop RLS policies for processes table
DROP POLICY IF EXISTS "Users can only access their own processes" ON public.processes;