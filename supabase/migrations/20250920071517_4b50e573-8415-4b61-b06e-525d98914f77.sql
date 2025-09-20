-- Drop foreign key constraints by their specific names
ALTER TABLE superjournal_entries DROP CONSTRAINT IF EXISTS superjournal_entries_user_id_fkey;
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_user_id_fkey;
ALTER TABLE ephemeral_attachments DROP CONSTRAINT IF EXISTS ephemeral_attachments_user_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Now change user_id columns from UUID to TEXT to store email addresses
ALTER TABLE superjournal_entries ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE journal_entries ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE ephemeral_attachments ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE profiles ALTER COLUMN user_id TYPE TEXT;

-- Update all records to use email as identifier
UPDATE superjournal_entries SET user_id = 'deepakpatnaik1@gmail.com';
UPDATE journal_entries SET user_id = 'deepakpatnaik1@gmail.com';
UPDATE ephemeral_attachments SET user_id = 'deepakpatnaik1@gmail.com';
UPDATE profiles SET user_id = 'deepakpatnaik1@gmail.com' WHERE email = 'deepakpatnaik1@gmail.com';

-- Recreate RLS policies using email-based comparison
CREATE POLICY "Users can access their own superjournal entries" 
ON superjournal_entries FOR ALL 
USING (user_id = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can access their own journal entries" 
ON journal_entries FOR ALL 
USING (user_id = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can access their own attachments" 
ON ephemeral_attachments FOR ALL 
USING (user_id = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT 
USING (user_id = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (user_id = (auth.jwt() ->> 'email'))
WITH CHECK (user_id = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
WITH CHECK (user_id = (auth.jwt() ->> 'email'));