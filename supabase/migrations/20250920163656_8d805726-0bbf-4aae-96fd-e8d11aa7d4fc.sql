-- Create table for OAuth states (for security)
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for Google tokens
CREATE TABLE IF NOT EXISTS public.google_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for oauth_states (edge functions can manage these)
CREATE POLICY "Service role can manage oauth states" 
ON public.oauth_states 
FOR ALL 
USING (true);

-- Create policies for google_tokens (boss only)
CREATE POLICY "Boss can view own tokens" 
ON public.google_tokens 
FOR SELECT 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Boss can manage own tokens" 
ON public.google_tokens 
FOR ALL 
USING (auth.uid()::text = user_id::text);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON public.oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_google_tokens_user_id ON public.google_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_google_tokens_expires_at ON public.google_tokens(expires_at);

-- Add trigger for updating updated_at
CREATE TRIGGER update_google_tokens_updated_at
  BEFORE UPDATE ON public.google_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();