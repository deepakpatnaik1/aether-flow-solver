-- Fix critical security vulnerability in google_tokens table
-- Add user_id column to associate tokens with specific users
ALTER TABLE public.google_tokens 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing tokens to be owned by the authorized user
-- Since this is a boss-only application, assign to the authorized user
UPDATE public.google_tokens 
SET user_id = (SELECT id FROM auth.users WHERE email = 'deepakpatnaik1@gmail.com' LIMIT 1)
WHERE user_id IS NULL;

-- Make user_id required for new records
ALTER TABLE public.google_tokens 
ALTER COLUMN user_id SET NOT NULL;

-- Drop the insecure policies that allow all users access
DROP POLICY IF EXISTS "Allow all operations on google_tokens for authenticated users" ON public.google_tokens;
DROP POLICY IF EXISTS "System can manage google tokens" ON public.google_tokens;

-- Create secure RLS policies that only allow users to access their own tokens
CREATE POLICY "Users can manage their own google tokens" 
ON public.google_tokens 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Keep the service role policy for system operations
-- (This is needed for edge functions to manage tokens)