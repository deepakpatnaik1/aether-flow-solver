-- Ensure the google_tokens table has proper RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on google_tokens" ON public.google_tokens;

-- Create a permissive policy for service role (used by edge functions)
CREATE POLICY "Service role can manage google_tokens" 
ON public.google_tokens 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- Also allow authenticated users to read/write their tokens  
CREATE POLICY "Allow all operations on google_tokens for authenticated users" 
ON public.google_tokens 
FOR ALL 
TO authenticated
USING (true) 
WITH CHECK (true);