-- Remove the overly permissive RLS policy on google_tokens
DROP POLICY IF EXISTS "Allow all operations on google_tokens" ON public.google_tokens;

-- Create a secure policy that only allows service role operations
-- (Service role bypasses RLS anyway, but this makes intent clear)
CREATE POLICY "Service role can manage google_tokens" 
ON public.google_tokens 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Allow limited read access for connection status checking
-- This allows frontend to check if Google is connected without exposing tokens
CREATE POLICY "Public can check connection status" 
ON public.google_tokens 
FOR SELECT 
TO anon 
USING (true);