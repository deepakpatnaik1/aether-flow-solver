-- Drop old RLS policies that are no longer needed since authentication is removed

-- Drop policies for superjournal_entries
DROP POLICY IF EXISTS "Users can only access their own superjournal entries" ON public.superjournal_entries;

-- Drop policies for journal_entries  
DROP POLICY IF EXISTS "Users can only access their own journal entries" ON public.journal_entries;

-- Drop policies for ephemeral_attachments
DROP POLICY IF EXISTS "Users can only access their own ephemeral attachments" ON public.ephemeral_attachments;

-- Drop policies for persistent_attachments
DROP POLICY IF EXISTS "Users can only access their own persistent attachments" ON public.persistent_attachments;