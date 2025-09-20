-- Drop foreign key constraints with correct syntax
ALTER TABLE superjournal_entries DROP CONSTRAINT IF EXISTS superjournal_entries_user_id_fkey;
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_user_id_fkey;  
ALTER TABLE ephemeral_attachments DROP CONSTRAINT IF EXISTS ephemeral_attachments_user_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Also check for any other constraints that might exist
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;