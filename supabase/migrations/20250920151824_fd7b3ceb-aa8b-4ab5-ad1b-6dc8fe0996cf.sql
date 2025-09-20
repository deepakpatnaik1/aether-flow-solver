-- Fix function search path mutable security warning
-- Update the cleanup_expired_oauth_states function to set a secure search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.oauth_states 
  WHERE expires_at < now();
END;
$function$;