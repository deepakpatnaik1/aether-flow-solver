-- Disable RLS entirely on all tables to make them truly unrestricted

ALTER TABLE public.boss DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ephemeral_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.past_journals_full DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.persistent_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.superjournal_entries DISABLE ROW LEVEL SECURITY;