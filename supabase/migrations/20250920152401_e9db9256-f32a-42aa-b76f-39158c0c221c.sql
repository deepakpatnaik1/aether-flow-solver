-- SECURE BOSS-ONLY ACCESS IMPLEMENTATION
-- Create a security definer function to check authorization
-- This is more secure than hardcoded emails in RLS policies

CREATE OR REPLACE FUNCTION public.is_authorized_boss()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if current user's email matches the authorized boss email
  RETURN (auth.jwt() ->> 'email' = 'deepakpatnaik1@gmail.com');
END;
$$;

-- Drop existing policies and recreate with the security function
DROP POLICY IF EXISTS "Boss only access" ON profiles;
DROP POLICY IF EXISTS "Boss only access" ON journal_entries;  
DROP POLICY IF EXISTS "Boss only access" ON superjournal_entries;
DROP POLICY IF EXISTS "Boss only access" ON ephemeral_attachments;

-- Create new secure policies using the authorization function
CREATE POLICY "Authorized boss access" ON profiles
  FOR ALL
  USING (public.is_authorized_boss())
  WITH CHECK (public.is_authorized_boss());

CREATE POLICY "Authorized boss access" ON journal_entries
  FOR ALL  
  USING (public.is_authorized_boss())
  WITH CHECK (public.is_authorized_boss());

CREATE POLICY "Authorized boss access" ON superjournal_entries
  FOR ALL
  USING (public.is_authorized_boss())
  WITH CHECK (public.is_authorized_boss());

CREATE POLICY "Authorized boss access" ON ephemeral_attachments
  FOR ALL
  USING (public.is_authorized_boss())  
  WITH CHECK (public.is_authorized_boss());

-- Ensure RLS is enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE superjournal_entries ENABLE ROW LEVEL SECURITY;  
ALTER TABLE ephemeral_attachments ENABLE ROW LEVEL SECURITY;