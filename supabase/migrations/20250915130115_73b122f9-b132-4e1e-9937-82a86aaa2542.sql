-- Ensure RLS is enabled on all public tables
-- Check and enable RLS on any tables that might be missing it

-- Enable RLS on journal_entries if not already enabled
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Check other tables and enable RLS if needed
ALTER TABLE public.superjournal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;