-- Create tables for Google OAuth2 flow
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.google_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for oauth_states (allow system to manage)
CREATE POLICY "System can manage oauth states" 
ON public.oauth_states 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create policies for google_tokens (allow system to manage)
CREATE POLICY "System can manage google tokens" 
ON public.google_tokens 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add cleanup function for expired states
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM public.oauth_states 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;