-- Create knowledge_entries table for collective memory/journal content
CREATE TABLE public.knowledge_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  entry_type text NOT NULL DEFAULT 'journal', -- journal, decision, conversation, background
  tags text[] DEFAULT '{}',
  source_file text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Public access to knowledge_entries" 
ON public.knowledge_entries 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_knowledge_entries_updated_at
BEFORE UPDATE ON public.knowledge_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better search performance
CREATE INDEX idx_knowledge_entries_tags ON public.knowledge_entries USING GIN(tags);
CREATE INDEX idx_knowledge_entries_type ON public.knowledge_entries(entry_type);
CREATE INDEX idx_knowledge_entries_content ON public.knowledge_entries USING GIN(to_tsvector('english', content));