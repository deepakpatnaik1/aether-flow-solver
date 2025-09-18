-- Remove redundant fields from all tables (keeping user_id for future auth)

-- Drop triggers that update updated_at columns we're about to remove
DROP TRIGGER IF EXISTS update_boss_updated_at ON public.boss;
DROP TRIGGER IF EXISTS update_google_tokens_updated_at ON public.google_tokens;
DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON public.journal_entries;
DROP TRIGGER IF EXISTS update_past_journals_full_updated_at ON public.past_journals_full;
DROP TRIGGER IF EXISTS update_persistent_attachments_updated_at ON public.persistent_attachments;
DROP TRIGGER IF EXISTS update_personas_updated_at ON public.personas;
DROP TRIGGER IF EXISTS update_processes_updated_at ON public.processes;
DROP TRIGGER IF EXISTS update_superjournal_entries_updated_at ON public.superjournal_entries;

-- boss table - remove updated_at
ALTER TABLE public.boss DROP COLUMN IF EXISTS updated_at;

-- ephemeral_attachments - remove file_size, created_at
ALTER TABLE public.ephemeral_attachments 
DROP COLUMN IF EXISTS file_size,
DROP COLUMN IF EXISTS created_at;

-- google_tokens - remove created_at, updated_at
ALTER TABLE public.google_tokens 
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS updated_at;

-- journal_entries - remove created_at, updated_at  
ALTER TABLE public.journal_entries
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS updated_at;

-- past_journals_full - remove updated_at, entry_type
ALTER TABLE public.past_journals_full
DROP COLUMN IF EXISTS updated_at,
DROP COLUMN IF EXISTS entry_type;

-- persistent_attachments - remove created_at, updated_at, file_size
ALTER TABLE public.persistent_attachments
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS updated_at,
DROP COLUMN IF EXISTS file_size;

-- personas - remove updated_at
ALTER TABLE public.personas DROP COLUMN IF EXISTS updated_at;

-- processes - remove updated_at  
ALTER TABLE public.processes DROP COLUMN IF EXISTS updated_at;

-- superjournal_entries - remove created_at, updated_at
ALTER TABLE public.superjournal_entries
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS updated_at;