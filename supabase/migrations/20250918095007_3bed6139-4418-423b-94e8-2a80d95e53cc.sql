-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Berlin'),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Berlin')
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies - users can view all profiles but only update their own
CREATE POLICY "Anyone can view profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Update RLS policies for journal_entries to be user-specific
DROP POLICY IF EXISTS "Allow all operations on journal_entries" ON public.journal_entries;

CREATE POLICY "Users can view their own journal entries" 
ON public.journal_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journal entries" 
ON public.journal_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries" 
ON public.journal_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries" 
ON public.journal_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update RLS policies for superjournal_entries to be user-specific
DROP POLICY IF EXISTS "Allow all operations on superjournal_entries" ON public.superjournal_entries;

CREATE POLICY "Users can view their own superjournal entries" 
ON public.superjournal_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own superjournal entries" 
ON public.superjournal_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own superjournal entries" 
ON public.superjournal_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own superjournal entries" 
ON public.superjournal_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update RLS policies for ephemeral_attachments to be user-specific
DROP POLICY IF EXISTS "Allow all operations on ephemeral_attachments" ON public.ephemeral_attachments;

CREATE POLICY "Users can view their own attachments" 
ON public.ephemeral_attachments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attachments" 
ON public.ephemeral_attachments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attachments" 
ON public.ephemeral_attachments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments" 
ON public.ephemeral_attachments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Secure google_tokens - only allow operations by the token owner
DROP POLICY IF EXISTS "Allow all operations on google_tokens" ON public.google_tokens;

CREATE POLICY "Users can view their own google tokens" 
ON public.google_tokens 
FOR SELECT 
USING (user_email = (auth.jwt() ->> 'email'::text));

CREATE POLICY "Users can insert their own google tokens" 
ON public.google_tokens 
FOR INSERT 
WITH CHECK (user_email = (auth.jwt() ->> 'email'::text));

CREATE POLICY "Users can update their own google tokens" 
ON public.google_tokens 
FOR UPDATE 
USING (user_email = (auth.jwt() ->> 'email'::text));

CREATE POLICY "Users can delete their own google tokens" 
ON public.google_tokens 
FOR DELETE 
USING (user_email = (auth.jwt() ->> 'email'::text));

-- Add trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();