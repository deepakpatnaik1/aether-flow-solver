-- Create ephemeral_attachments table for chat files that can be bulk deleted
CREATE TABLE public.ephemeral_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  message_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create persistent_attachments table for important documents
CREATE TABLE public.persistent_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  category TEXT NOT NULL, -- boss, persona, processes, documents
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.ephemeral_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persistent_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (matching existing pattern)
CREATE POLICY "Public access to ephemeral_attachments" 
ON public.ephemeral_attachments 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Public access to persistent_attachments" 
ON public.persistent_attachments 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Migrate existing file_attachments to appropriate table based on usage
-- Chat attachments (with message_id) go to ephemeral
INSERT INTO public.ephemeral_attachments (file_name, original_name, public_url, file_size, file_type, message_id, created_at)
SELECT file_name, original_name, public_url, file_size, file_type, message_id, created_at
FROM public.file_attachments 
WHERE message_id IS NOT NULL;

-- Other files go to persistent (assume they're documents)
INSERT INTO public.persistent_attachments (file_name, original_name, public_url, file_size, file_type, category, created_at)
SELECT file_name, original_name, public_url, file_size, file_type, 'documents', created_at
FROM public.file_attachments 
WHERE message_id IS NULL;

-- Add trigger for updated_at on persistent_attachments
CREATE TRIGGER update_persistent_attachments_updated_at
BEFORE UPDATE ON public.persistent_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Drop the old file_attachments table
DROP TABLE public.file_attachments;