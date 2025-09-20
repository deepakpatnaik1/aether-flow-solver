-- Find all foreign key constraints in the database
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public';

-- Drop all foreign key constraints that involve user_id
DROP CONSTRAINT IF EXISTS superjournal_entries_user_id_fkey ON superjournal_entries CASCADE;
DROP CONSTRAINT IF EXISTS journal_entries_user_id_fkey ON journal_entries CASCADE;
DROP CONSTRAINT IF EXISTS ephemeral_attachments_user_id_fkey ON ephemeral_attachments CASCADE;
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey ON profiles CASCADE;