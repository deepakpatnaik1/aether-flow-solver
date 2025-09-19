-- Fix for missing superjournal_entries table
-- Run this in Supabase SQL Editor if the table doesn't exist

CREATE TABLE IF NOT EXISTS public.superjournal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id TEXT NOT NULL UNIQUE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_message_content TEXT NOT NULL,
  user_message_persona TEXT NOT NULL,
  user_message_attachments JSONB DEFAULT '[]'::jsonb,
  ai_response_content TEXT NOT NULL,
  ai_response_persona TEXT NOT NULL,
  ai_response_model TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.superjournal_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own data
CREATE POLICY "Users can access their own entries"
ON public.superjournal_entries
FOR ALL
USING (auth.uid() = user_id OR user_id IS NULL);

-- Verify
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'superjournal_entries'
) AS table_exists;