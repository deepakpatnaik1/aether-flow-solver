-- Create profile for the user
INSERT INTO public.profiles (user_id, email, display_name)
VALUES (
  '2b1a83c2-0a40-4583-9e53-e434f775a470'::uuid,
  'deepakpatnaik1@gmail.com',
  'deepakpatnaik1@gmail.com'
)
ON CONFLICT (user_id) DO NOTHING;

-- Update superjournal_entries to associate with correct user
UPDATE public.superjournal_entries 
SET user_id = '2b1a83c2-0a40-4583-9e53-e434f775a470'::uuid
WHERE user_id IS NULL;

-- Update journal_entries to associate with correct user  
UPDATE public.journal_entries
SET user_id = '2b1a83c2-0a40-4583-9e53-e434f775a470'::uuid
WHERE user_id IS NULL;

-- Update ephemeral_attachments to associate with correct user
UPDATE public.ephemeral_attachments
SET user_id = '2b1a83c2-0a40-4583-9e53-e434f775a470'::uuid
WHERE user_id IS NULL;