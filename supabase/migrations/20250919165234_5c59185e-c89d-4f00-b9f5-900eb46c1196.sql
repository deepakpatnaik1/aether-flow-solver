-- Remove all Google-related database elements

-- Drop Google-related functions
DROP FUNCTION IF EXISTS public.get_google_connection_status();
DROP FUNCTION IF EXISTS public.disconnect_google_account();
DROP FUNCTION IF EXISTS public.get_google_tokens_for_user(text);
DROP FUNCTION IF EXISTS public.store_google_tokens(text, text, text, timestamp with time zone, text);

-- Drop Google tokens table
DROP TABLE IF EXISTS public.google_tokens;