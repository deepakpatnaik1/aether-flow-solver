import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    console.log('Upload function called');

    const authHeader = req.headers.get('authorization');
    let userId = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (user && !error) {
        if (user.email !== 'deepakpatnaik1@gmail.com') {
          console.log('❌ Unauthorized upload attempt by:', user.email);
          return new Response(JSON.stringify({ error: 'Access denied. Boss-only.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        userId = user.id;
        console.log('✅ Authenticated Boss for upload:', user.email);
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string || 'documents';
    const customPath = formData.get('customPath') as string || '';
    console.log('Received file:', file?.name, 'Category:', category);
    if (!file) {
      throw new Error('No file provided');
    }
    let bucketName = 'documents'; 
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
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalPath = filePath.replace(file.name, sanitizedName);
    console.log('Uploading to bucket:', bucketName, 'path:', finalPath);
    const buffer = await file.arrayBuffer();
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
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(finalPath);
    const publicUrl = publicUrlData.publicUrl;
    console.log('Public URL:', publicUrl);
    let dbError;
    if (category === 'attachments') {
      const { error } = await supabase
        .from('ephemeral_attachments')
        .insert({
          file_name: sanitizedName,
          original_name: file.name,
          public_url: publicUrl,
          file_type: file.type || 'application/octet-stream',
          user_id: userId 
        });
      dbError = error;
    } else {
      dbError = null;
    }
    if (dbError) {
      console.error('Database error:', dbError);
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