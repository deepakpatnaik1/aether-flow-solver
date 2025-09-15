-- Restructure journal_entries to match superjournal_entries schema
-- First, create a backup of existing data
CREATE TABLE journal_entries_backup AS SELECT * FROM journal_entries;

-- Drop the old table
DROP TABLE journal_entries;

-- Create new journal_entries table with aligned schema
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id TEXT NOT NULL UNIQUE, -- Links to superjournal_entries.entry_id
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_message_content TEXT NOT NULL,
  user_message_persona TEXT NOT NULL,
  user_message_attachments JSONB DEFAULT '[]'::jsonb,
  ai_response_content TEXT NOT NULL,
  ai_response_persona TEXT NOT NULL,
  ai_response_model TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for public access (matching existing pattern)
CREATE POLICY "Public access to journal_entries" 
ON public.journal_entries 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_journal_entries_updated_at
BEFORE UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for linking
CREATE INDEX idx_journal_entries_entry_id ON public.journal_entries(entry_id);

-- Create index for timestamp queries
CREATE INDEX idx_journal_entries_timestamp ON public.journal_entries(timestamp);