-- Create boss table for boss profile data
CREATE TABLE public.boss (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boss ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Public access to boss" 
ON public.boss 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_boss_updated_at
BEFORE UPDATE ON public.boss
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();