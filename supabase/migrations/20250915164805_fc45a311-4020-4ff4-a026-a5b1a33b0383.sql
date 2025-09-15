-- Clean up old Boss.md file from persistent_attachments since it's now in the boss table
DELETE FROM persistent_attachments WHERE file_name = 'Boss.md' AND category = 'boss';