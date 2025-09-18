-- RESTORE RLS - Run this before production!

-- Re-enable RLS on all tables
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superjournal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ephemeral_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

-- Revoke excessive permissions from anon role
REVOKE ALL ON public.journal_entries FROM anon;
REVOKE ALL ON public.superjournal_entries FROM anon;
REVOKE ALL ON public.ephemeral_attachments FROM anon;
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.google_tokens FROM anon;

-- Restore normal anon permissions (read-only on specific tables)
GRANT SELECT ON public.journal_entries TO anon;
GRANT SELECT ON public.superjournal_entries TO anon;

-- Note: Run this in Supabase SQL Editor before going to production!