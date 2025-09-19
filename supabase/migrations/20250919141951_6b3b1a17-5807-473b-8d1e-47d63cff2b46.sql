-- Remove RLS authentication requirements for public access
-- This allows the app to work without authentication

-- Update journal_entries policies for public access
DROP POLICY IF EXISTS "Users can view their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can insert their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can update their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can delete their own journal entries" ON public.journal_entries;

CREATE POLICY "Public access to journal entries" 
ON public.journal_entries 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Update superjournal_entries policies for public access
DROP POLICY IF EXISTS "Users can view their own superjournal entries" ON public.superjournal_entries;
DROP POLICY IF EXISTS "Users can insert their own superjournal entries" ON public.superjournal_entries;
DROP POLICY IF EXISTS "Users can update their own superjournal entries" ON public.superjournal_entries;
DROP POLICY IF EXISTS "Users can delete their own superjournal entries" ON public.superjournal_entries;

CREATE POLICY "Public access to superjournal entries" 
ON public.superjournal_entries 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Update ephemeral_attachments policies for public access
DROP POLICY IF EXISTS "Users can view their own ephemeral attachments" ON public.ephemeral_attachments;
DROP POLICY IF EXISTS "Users can insert their own ephemeral attachments" ON public.ephemeral_attachments;
DROP POLICY IF EXISTS "Users can update their own ephemeral attachments" ON public.ephemeral_attachments;
DROP POLICY IF EXISTS "Users can delete their own ephemeral attachments" ON public.ephemeral_attachments;

CREATE POLICY "Public access to ephemeral attachments" 
ON public.ephemeral_attachments 
FOR ALL 
USING (true) 
WITH CHECK (true);