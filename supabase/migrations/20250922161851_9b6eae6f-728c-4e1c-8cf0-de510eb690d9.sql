-- Remove Google OAuth functionality completely
-- Drop Google tokens table
DROP TABLE IF EXISTS public.google_tokens CASCADE;

-- Drop OAuth states table (only used for Google OAuth)
DROP TABLE IF EXISTS public.oauth_states CASCADE;

-- Remove the cleanup function as it's no longer needed
DROP FUNCTION IF EXISTS public.cleanup_expired_oauth_states() CASCADE;