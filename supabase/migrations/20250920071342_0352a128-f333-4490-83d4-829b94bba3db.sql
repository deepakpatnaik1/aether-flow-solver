-- Change user_id columns from UUID to TEXT to store email addresses
-- Start with superjournal_entries
ALTER TABLE superjournal_entries 
ALTER COLUMN user_id TYPE TEXT;

-- Update to use email as identifier
UPDATE superjournal_entries 
SET user_id = 'deepakpatnaik1@gmail.com';

-- Change journal_entries 
ALTER TABLE journal_entries 
ALTER COLUMN user_id TYPE TEXT;

-- Update journal entries
UPDATE journal_entries 
SET user_id = 'deepakpatnaik1@gmail.com';

-- Change ephemeral_attachments
ALTER TABLE ephemeral_attachments 
ALTER COLUMN user_id TYPE TEXT;

-- Update ephemeral_attachments
UPDATE ephemeral_attachments 
SET user_id = 'deepakpatnaik1@gmail.com';

-- Change profiles table user_id to text as well
ALTER TABLE profiles 
ALTER COLUMN user_id TYPE TEXT;

-- Update profiles
UPDATE profiles 
SET user_id = 'deepakpatnaik1@gmail.com'
WHERE email = 'deepakpatnaik1@gmail.com';