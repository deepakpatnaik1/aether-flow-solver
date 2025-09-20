-- Fix the entries with null user_id
UPDATE superjournal_entries 
SET user_id = 'deepakpatnaik1@gmail.com' 
WHERE user_id IS NULL;