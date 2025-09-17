-- SECURITY FIX: Restrict google_tokens table access to server-side only

-- Drop existing policy
DROP POLICY IF EXISTS "Users can only access their own google tokens" ON public.google_tokens;

-- Create ultra-restrictive policy: BLOCK all direct access from frontend
CREATE POLICY "Block all direct access to google_tokens" 
ON public.google_tokens 
FOR ALL 
USING (false);

-- Create security definer function for server-side token management
CREATE OR REPLACE FUNCTION public.get_google_connection_status()
RETURNS TABLE(
  is_connected boolean,
  user_email text,
  expires_at timestamp with time zone,
  scope text
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Only return connection status, never actual tokens
  RETURN QUERY
  SELECT 
    (COUNT(*) > 0) as is_connected,
    CASE WHEN COUNT(*) > 0 THEN MIN(gt.user_email) ELSE null END as user_email,
    CASE WHEN COUNT(*) > 0 THEN MIN(gt.expires_at) ELSE null END as expires_at,
    CASE WHEN COUNT(*) > 0 THEN MIN(gt.scope) ELSE null END as scope
  FROM google_tokens gt
  WHERE gt.user_email = (auth.jwt() ->> 'email'::text);
END;
$$;

-- Create security definer function for server-side token deletion
CREATE OR REPLACE FUNCTION public.disconnect_google_account()
RETURNS boolean
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  DELETE FROM google_tokens 
  WHERE user_email = (auth.jwt() ->> 'email'::text);
  
  RETURN true;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_google_connection_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.disconnect_google_account() TO authenticated;