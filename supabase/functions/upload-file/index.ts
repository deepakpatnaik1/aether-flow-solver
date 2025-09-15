import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.400.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID') || '',
    secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY') || '',
  },
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string || 'documents';
    const customPath = formData.get('customPath') as string || '';
    
    if (!file) {
      throw new Error('No file provided');
    }

    // Determine the storage path based on category
    let prefix = '';
    switch (category) {
      case 'boss':
        prefix = 'boss/';
        break;
      case 'persona':
        prefix = 'persona/';
        break;
      case 'journal':
        prefix = 'journal/';
        break;
      case 'superjournal':
        prefix = 'superjournal/';
        break;
      case 'processes':
        prefix = 'processes/';
        break;
      case 'custom':
        prefix = customPath.endsWith('/') ? customPath : customPath + '/';
        break;
      default:
        prefix = 'documents/';
    }

    // Generate filename (preserve original name or use timestamp for duplicates)
    const timestamp = Date.now();
    const originalName = file.name;
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${prefix}${sanitizedName}`;
    
    // If we want to avoid overwrites, we can add timestamp
    // const fileName = `${prefix}${timestamp}-${sanitizedName}`;

    // Convert file to buffer
    const buffer = await file.arrayBuffer();

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: Deno.env.get('R2_BUCKET_NAME'),
      Key: fileName,
      Body: new Uint8Array(buffer),
      ContentType: file.type,
      Metadata: {
        'original-name': originalName,
        'upload-category': category,
        'uploaded-at': new Date().toISOString(),
      },
    });

    await r2Client.send(command);

    // Construct public URL
    const publicUrl = `${Deno.env.get('R2_PUBLIC_URL')}/${fileName}`;

    return new Response(JSON.stringify({ 
      success: true, 
      fileName,
      publicUrl,
      originalName: file.name,
      size: file.size,
      type: file.type,
      category,
      storagePath: fileName
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