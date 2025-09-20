-- Update all superjournal entries to use email as user_id
UPDATE superjournal_entries 
SET user_id = 'deepakpatnaik1@gmail.com'::uuid 
WHERE user_id IS NOT NULL;

-- Actually, let's change the approach - create a text-based user identifier
-- First, let's see what we're working with
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'superjournal_entries' AND column_name = 'user_id';