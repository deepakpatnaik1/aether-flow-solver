-- CRITICAL SECURITY FIX: Remove public access to sensitive data

-- Remove public access to journal entries (contains private conversations)
DROP POLICY IF EXISTS "Public access to journal entries" ON public.journal_entries;

-- Remove public access to superjournal entries (also contains private data)  
DROP POLICY IF EXISTS "Public access to superjournal entries" ON public.superjournal_entries;

-- Remove public access to ephemeral attachments (contains uploaded files)
DROP POLICY IF EXISTS "Public access to ephemeral attachments" ON public.ephemeral_attachments;

-- Ensure only authenticated users can access their own journal entries
-- (Admin policy already exists for deepakpatnaik1@gmail.com)
CREATE POLICY "Users can view their own journal entries" 
ON public.journal_entries FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journal entries" 
ON public.journal_entries FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries" 
ON public.journal_entries FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries" 
ON public.journal_entries FOR DELETE 
USING (auth.uid() = user_id);

-- Ensure only authenticated users can access their own superjournal entries
-- Update the existing policy to be more restrictive
DROP POLICY IF EXISTS "Users can access their own entries" ON public.superjournal_entries;

CREATE POLICY "Users can access their own superjournal entries" 
ON public.superjournal_entries FOR ALL 
USING (auth.uid() = user_id);

-- Note: Admin policies for deepakpatnaik1@gmail.com remain in place for all tables