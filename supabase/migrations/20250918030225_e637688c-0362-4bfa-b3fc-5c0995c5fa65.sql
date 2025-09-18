-- Disable RLS on superjournal_entries to allow public access
ALTER TABLE public.superjournal_entries DISABLE ROW LEVEL SECURITY;

-- Disable RLS on journal_entries to allow public access  
ALTER TABLE public.journal_entries DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on other tables that might be used
ALTER TABLE public.ephemeral_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.persistent_attachments DISABLE ROW LEVEL SECURITY;