-- Add RLS policies to allow users to access their own profile data
-- This fixes the security issue while maintaining boss admin access

-- Policy for users to read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT 
  USING (auth.uid()::text = user_id);

-- Policy for users to update their own profile  
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE 
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Policy for users to insert their own profile (during signup)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id);