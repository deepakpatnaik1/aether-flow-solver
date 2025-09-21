-- Fix OAuth states RLS security vulnerability
-- The issue: overly permissive service role policy allows public access

-- Drop the problematic policy that allows public access
DROP POLICY IF EXISTS "Service role can manage oauth states" ON oauth_states;

-- Remove the redundant deny policy since we'll have no permissive policies
DROP POLICY IF EXISTS "Deny public access to oauth states" ON oauth_states;

-- OAuth states should only be accessed by edge functions with service role
-- Edge functions use the service role key and bypass RLS anyway
-- No public policies needed = no public access possible

-- Add a comment to document this security design
COMMENT ON TABLE oauth_states IS 'OAuth state tokens for CSRF protection. Access restricted to service role only via edge functions. No public RLS policies = no public access.';