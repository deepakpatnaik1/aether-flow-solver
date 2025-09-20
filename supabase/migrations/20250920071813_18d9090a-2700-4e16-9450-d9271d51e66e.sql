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

-- Recreate RLS policies - Boss only access  
CREATE POLICY "Boss only access" 
ON superjournal_entries FOR ALL 
USING (user_id = 'deepakpatnaik1@gmail.com');

CREATE POLICY "Boss only access" 
ON journal_entries FOR ALL 
USING (user_id = 'deepakpatnaik1@gmail.com');

CREATE POLICY "Boss only access" 
ON ephemeral_attachments FOR ALL 
USING (user_id = 'deepakpatnaik1@gmail.com');

CREATE POLICY "Boss only access" 
ON profiles FOR ALL 
USING (user_id = 'deepakpatnaik1@gmail.com')
WITH CHECK (user_id = 'deepakpatnaik1@gmail.com');