-- NUKE: Drop all Call 1/Call 2 related tables and functionality

-- Drop superjournal_entries table and all related objects
DROP TABLE IF EXISTS public.superjournal_entries CASCADE;

-- Drop journal_entries table and all related objects  
DROP TABLE IF EXISTS public.journal_entries CASCADE;

-- Clean up any orphaned indexes or triggers that might remain
DROP INDEX IF EXISTS idx_journal_entries_entry_id;
DROP INDEX IF EXISTS idx_journal_entries_timestamp;
DROP INDEX IF EXISTS idx_journal_entries_conversation_id;

-- Remove any triggers that might reference these tables
DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON public.journal_entries;
DROP TRIGGER IF EXISTS update_superjournal_entries_updated_at ON public.superjournal_entries;