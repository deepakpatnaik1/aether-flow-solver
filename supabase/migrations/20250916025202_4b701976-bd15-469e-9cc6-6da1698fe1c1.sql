-- Remove duplicate entries, keeping only the most recent version of each document
DELETE FROM knowledge_entries k1 
WHERE k1.id NOT IN (
  SELECT DISTINCT ON (source_file) id 
  FROM knowledge_entries k2 
  ORDER BY source_file, created_at DESC
);