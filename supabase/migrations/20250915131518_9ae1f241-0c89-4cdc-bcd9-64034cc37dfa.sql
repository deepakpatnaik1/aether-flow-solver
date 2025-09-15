-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('attachments', 'attachments', true),
  ('documents', 'documents', true),
  ('boss', 'boss', true),
  ('persona', 'persona', true),
  ('processes', 'processes', true);

-- Create storage policies for file access
-- Public read access for all buckets
CREATE POLICY "Public read access" 
ON storage.objects 
FOR SELECT 
USING (true);

-- Allow anyone to upload files
CREATE POLICY "Anyone can upload files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update files
CREATE POLICY "Anyone can update files" 
ON storage.objects 
FOR UPDATE 
USING (true);

-- Allow anyone to delete files  
CREATE POLICY "Anyone can delete files" 
ON storage.objects 
FOR DELETE 
USING (true);