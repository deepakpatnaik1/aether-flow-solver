-- Enable RLS on all remaining public tables
ALTER TABLE public.ephemeral_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persistent_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superjournal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for these tables (allowing all operations for now)
-- Note: You may want to restrict these further based on your security requirements

-- Ephemeral attachments policies
CREATE POLICY "Allow all operations on ephemeral_attachments" ON public.ephemeral_attachments
FOR ALL USING (true) WITH CHECK (true);

-- Persistent attachments policies  
CREATE POLICY "Allow all operations on persistent_attachments" ON public.persistent_attachments
FOR ALL USING (true) WITH CHECK (true);

-- Superjournal entries policies
CREATE POLICY "Allow all operations on superjournal_entries" ON public.superjournal_entries
FOR ALL USING (true) WITH CHECK (true);

-- Google tokens policies
CREATE POLICY "Allow all operations on google_tokens" ON public.google_tokens
FOR ALL USING (true) WITH CHECK (true);

-- Journal entries policies
CREATE POLICY "Allow all operations on journal_entries" ON public.journal_entries
FOR ALL USING (true) WITH CHECK (true);