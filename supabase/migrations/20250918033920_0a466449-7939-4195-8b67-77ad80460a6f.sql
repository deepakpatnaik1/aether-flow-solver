-- Update all timestamp fields to use Berlin timezone as default

-- First, update the update_updated_at_column function to use Berlin time
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now() AT TIME ZONE 'Europe/Berlin';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Update defaults for all tables to use Berlin timezone

-- boss table
ALTER TABLE public.boss 
  ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin'),
  ALTER COLUMN updated_at SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin');

-- ephemeral_attachments table  
ALTER TABLE public.ephemeral_attachments
  ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin');

-- google_tokens table
ALTER TABLE public.google_tokens
  ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin'),
  ALTER COLUMN updated_at SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin');

-- journal_entries table
ALTER TABLE public.journal_entries
  ALTER COLUMN timestamp SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin'),
  ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin'),
  ALTER COLUMN updated_at SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin');

-- past_journals_full table
ALTER TABLE public.past_journals_full
  ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin'),
  ALTER COLUMN updated_at SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin');

-- persistent_attachments table
ALTER TABLE public.persistent_attachments
  ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin'),
  ALTER COLUMN updated_at SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin');

-- personas table
ALTER TABLE public.personas
  ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin'),
  ALTER COLUMN updated_at SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin');

-- processes table
ALTER TABLE public.processes
  ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin'),
  ALTER COLUMN updated_at SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin');

-- superjournal_entries table  
ALTER TABLE public.superjournal_entries
  ALTER COLUMN timestamp SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin'),
  ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin'),
  ALTER COLUMN updated_at SET DEFAULT (now() AT TIME ZONE 'Europe/Berlin');