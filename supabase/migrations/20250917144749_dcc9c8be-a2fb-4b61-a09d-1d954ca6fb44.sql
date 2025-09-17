-- Update existing superjournal entries with null user_id to use the first authenticated user
-- This assumes a single-user application scenario
UPDATE superjournal_entries 
SET user_id = (
  SELECT id 
  FROM auth.users 
  LIMIT 1
) 
WHERE user_id IS NULL;

-- Update existing journal entries with null user_id as well  
UPDATE journal_entries 
SET user_id = (
  SELECT id 
  FROM auth.users 
  LIMIT 1
) 
WHERE user_id IS NULL;