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
    
    if (!file) {
      throw new Error('No file provided');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = crypto.randomUUID();
    const fileExtension = file.name.split('.').pop() || '';
    const fileName = `${timestamp}-${randomId}.${fileExtension}`;

    // Convert file to buffer
    const buffer = await file.arrayBuffer();

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: Deno.env.get('R2_BUCKET_NAME'),
      Key: fileName,
      Body: new Uint8Array(buffer),
      ContentType: file.type,
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
      type: file.type
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