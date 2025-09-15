import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

// Supabase Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Upload function called');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string || 'documents';
    const customPath = formData.get('customPath') as string || '';
    
    console.log('Received file:', file?.name, 'Category:', category);
    
    if (!file) {
      throw new Error('No file provided');
    }

    // Determine the bucket and path based on category
    let bucketName = 'documents'; // default bucket
    let filePath = '';
    
    switch (category) {
      case 'boss':
        bucketName = 'boss';
        filePath = file.name;
        break;
      case 'persona':
        bucketName = 'persona';
        filePath = file.name;
        break;
      case 'processes':
        bucketName = 'processes';
        filePath = file.name;
        break;
      case 'attachments':
        bucketName = 'attachments';
        filePath = file.name;
        break;
      case 'custom':
        bucketName = 'documents';
        filePath = customPath.endsWith('/') ? customPath + file.name : customPath + '/' + file.name;
        break;
      default:
        bucketName = 'documents';
        filePath = file.name;
    }

    // Sanitize filename
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalPath = filePath.replace(file.name, sanitizedName);
    
    console.log('Uploading to bucket:', bucketName, 'path:', finalPath);

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(finalPath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true
      });

    if (error) {
      console.error('Supabase Storage error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    console.log('Upload successful:', data);

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(finalPath);

    const publicUrl = publicUrlData.publicUrl;
    console.log('Public URL:', publicUrl);

    // Save metadata to appropriate table based on category
    let dbError;
    if (category === 'attachments') {
      // Ephemeral chat attachments
      const { error } = await supabase
        .from('ephemeral_attachments')
        .insert({
          file_name: sanitizedName,
          original_name: file.name,
          public_url: publicUrl,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream'
        });
      dbError = error;
    } else {
      // Persistent documents (boss, persona, processes, documents)
      const { error } = await supabase
        .from('persistent_attachments')
        .insert({
          file_name: sanitizedName,
          original_name: file.name,
          public_url: publicUrl,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
          category: category
        });
      dbError = error;
    }

    if (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the upload if database insert fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      fileName: sanitizedName,
      publicUrl: publicUrl,
      originalName: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      category,
      bucketName,
      storagePath: finalPath
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});