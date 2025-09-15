-- Create superjournal_entries table for storing conversation summaries
CREATE TABLE public.superjournal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id TEXT NOT NULL UNIQUE,
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

-- Enable Row Level Security
ALTER TABLE public.superjournal_entries ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (no authentication needed)
CREATE POLICY "Public access to superjournal_entries" 
ON public.superjournal_entries 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_superjournal_entries_updated_at
BEFORE UPDATE ON public.superjournal_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();