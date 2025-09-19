-- Re-enable Row Level Security on all tables
ALTER TABLE public.superjournal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ephemeral_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for superjournal_entries
CREATE POLICY "Users can access their own superjournal entries"
ON public.superjournal_entries
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for journal_entries  
CREATE POLICY "Users can access their own journal entries"
ON public.journal_entries
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for ephemeral_attachments
CREATE POLICY "Users can access their own attachments"
ON public.ephemeral_attachments
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);