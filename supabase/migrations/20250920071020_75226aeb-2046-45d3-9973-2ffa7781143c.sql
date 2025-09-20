-- Update all superjournal entries with null user_id to use the boss user_id
UPDATE superjournal_entries 
SET user_id = '652309c4-940b-464a-96f7-7d734d4c9530'
WHERE user_id IS NULL;

-- Update all journal entries with null user_id to use the boss user_id  
UPDATE journal_entries 
SET user_id = '652309c4-940b-464a-96f7-7d734d4c9530'
WHERE user_id IS NULL;

-- Update all ephemeral_attachments with null user_id to use the boss user_id
UPDATE ephemeral_attachments 
SET user_id = '652309c4-940b-464a-96f7-7d734d4c9530'
WHERE user_id IS NULL;