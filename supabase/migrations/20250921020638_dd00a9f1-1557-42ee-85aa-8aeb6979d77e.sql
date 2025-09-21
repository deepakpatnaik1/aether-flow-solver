-- Fix OAuth states security vulnerability
-- Remove public access and restrict to service role only

-- Drop the overly permissive policy that allows public access
DROP POLICY IF EXISTS "System can manage oauth states" ON oauth_states;

-- Keep only service role access for OAuth edge functions
-- The existing "Service role can manage oauth states" policy is sufficient
-- OAuth states should only be accessed by backend functions during OAuth flows

-- Add a policy to explicitly deny public access
CREATE POLICY "Deny public access to oauth states" ON oauth_states
  FOR ALL 
  USING (false)
  WITH CHECK (false);