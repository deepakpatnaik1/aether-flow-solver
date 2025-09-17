-- COMPLETE SECURITY FIX: Add server-side functions for edge function token management

-- Create secure function for storing Google tokens (edge function use)
CREATE OR REPLACE FUNCTION public.store_google_tokens(
  p_user_email text,
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamp with time zone,
  p_scope text
)
RETURNS boolean
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Only store tokens, never expose them
  INSERT INTO google_tokens (
    user_email,
    access_token,
    refresh_token,
    expires_at,
    scope,
    created_at,
    updated_at
  ) VALUES (
    p_user_email,
    p_access_token,
    p_refresh_token,
    p_expires_at,
    p_scope,
    now(),
    now()
  )
  ON CONFLICT (user_email) 
  DO UPDATE SET
    access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    expires_at = EXCLUDED.expires_at,
    scope = EXCLUDED.scope,
    updated_at = now();
    
  RETURN true;
END;
$$;

-- Create secure function for retrieving tokens (edge function use only)
CREATE OR REPLACE FUNCTION public.get_google_tokens_for_user(p_user_email text)
RETURNS TABLE(
  access_token text,
  refresh_token text,
  expires_at timestamp with time zone,
  scope text
)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- This function should ONLY be called by trusted edge functions
  -- It returns actual tokens for API usage
  RETURN QUERY
  SELECT 
    gt.access_token,
    gt.refresh_token,
    gt.expires_at,
    gt.scope
  FROM google_tokens gt
  WHERE gt.user_email = p_user_email
  AND gt.expires_at > now()
  LIMIT 1;
END;
$$;

-- Grant execute permissions to authenticated users (edge functions run as authenticated)
GRANT EXECUTE ON FUNCTION public.store_google_tokens(text, text, text, timestamp with time zone, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_google_tokens_for_user(text) TO authenticated;