import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple AWS signature v4 implementation for R2
async function createSignedRequest(
  method: string,
  url: string,
  body: ArrayBuffer,
  contentType: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string = 'auto'
) {
  const encoder = new TextEncoder();
  
  // Create canonical request
  const host = new URL(url).host;
  const path = new URL(url).pathname;
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = timestamp.slice(0, 8);
  
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${timestamp}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  
  const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\nUNSIGNED-PAYLOAD`;
  
  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${await sha256(canonicalRequest)}`;
  
  // Calculate signature
  const kDate = await hmacSha256(encoder.encode(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, 's3');
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = await hmacSha256(kSigning, stringToSign);
  
  // Create authorization header
  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
  
  return {
    'Authorization': authorization,
    'X-Amz-Date': timestamp,
    'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
    'Content-Type': contentType,
  };
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: Uint8Array | ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = key instanceof ArrayBuffer ? key : key.buffer;
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  return await crypto.subtle.sign('HMAC', cryptoKey, messageData);
}

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

    // Get environment variables
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const accountId = Deno.env.get('R2_ACCOUNT_ID');
    const bucketName = Deno.env.get('R2_BUCKET_NAME');
    const publicUrl = Deno.env.get('R2_PUBLIC_URL');

    if (!accessKeyId || !secretAccessKey || !accountId || !bucketName) {
      throw new Error('Missing R2 configuration');
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

    // Generate filename (preserve original name)
    const originalName = file.name;
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${prefix}${sanitizedName}`;
    
    console.log('Uploading to path:', fileName);

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    
    // Create R2 endpoint URL
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const uploadUrl = `${endpoint}/${bucketName}/${fileName}`;
    
    console.log('Upload URL:', uploadUrl);
    
    // Create signed headers
    const headers = await createSignedRequest(
      'PUT',
      uploadUrl,
      buffer,
      file.type || 'application/octet-stream',
      accessKeyId,
      secretAccessKey
    );

    // Upload to R2
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: buffer,
    });

    console.log('R2 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('R2 Error:', errorText);
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    // Construct public URL
    const filePublicUrl = `${publicUrl}/${fileName}`;

    console.log('Upload successful, public URL:', filePublicUrl);

    return new Response(JSON.stringify({ 
      success: true, 
      fileName,
      publicUrl: filePublicUrl,
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