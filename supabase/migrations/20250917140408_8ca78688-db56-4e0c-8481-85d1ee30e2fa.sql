-- Add user_id columns to attachment tables for proper access control
ALTER TABLE public.ephemeral_attachments 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.persistent_attachments 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing public policies
DROP POLICY IF EXISTS "Public access to ephemeral_attachments" ON public.ephemeral_attachments;
DROP POLICY IF EXISTS "Public access to persistent_attachments" ON public.persistent_attachments;

-- Create secure RLS policies for ephemeral_attachments
CREATE POLICY "Users can only access their own ephemeral attachments" 
ON public.ephemeral_attachments 
FOR ALL 
USING (auth.uid() = user_id);

-- Create secure RLS policies for persistent_attachments  
CREATE POLICY "Users can only access their own persistent attachments"
ON public.persistent_attachments
FOR ALL
USING (auth.uid() = user_id);