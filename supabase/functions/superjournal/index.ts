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

interface JournalEntry {
  id: string;
  timestamp: string;
  userMessage: {
    content: string;
    persona: string;
    attachments?: any[];
  };
  aiResponse: {
    content: string;
    persona: string;
    model: string;
  };
}

// Helper function to sign R2 requests
async function signR2Request(
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: string
) {
  const encoder = new TextEncoder();
  
  // AWS requires lowercase header names for signing but actual case for HTTP
  const lowerHeaders: Record<string, string> = {};
  const actualHeaders: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    lowerHeaders[key.toLowerCase()] = value;
    actualHeaders[key] = value; // Keep original case for HTTP
  }
  
  // Create canonical request with lowercase headers
  const urlObj = new URL(url);
  const canonicalUri = urlObj.pathname;
  const canonicalQuerystring = urlObj.search.slice(1);
  
  const canonicalHeaders = Object.entries(lowerHeaders)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('\n');
    
  const signedHeaders = Object.keys(lowerHeaders)
    .sort()
    .join(';');

  const payloadHash = body 
    ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(body))))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders + '\n',
    signedHeaders,
    payloadHash
  ].join('\n');

  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = timestamp.slice(0, 8);
  const credentialScope = `${date}/auto/s3/aws4_request`;
  
  const stringToSign = [
    algorithm,
    timestamp,
    credentialScope,
    Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest))))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  ].join('\n');

  // Calculate signature using HMAC chain
  const kDate = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', encoder.encode('AWS4' + R2_SECRET_ACCESS_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    encoder.encode(date)
  );
  
  const kRegion = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', new Uint8Array(kDate), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    encoder.encode('auto')
  );
  
  const kService = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', new Uint8Array(kRegion), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    encoder.encode('s3')
  );
  
  const kSigning = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', new Uint8Array(kService), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    encoder.encode('aws4_request')
  );
  
  const signature = Array.from(new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', new Uint8Array(kSigning), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    encoder.encode(stringToSign)
  ))).map(b => b.toString(16).padStart(2, '0')).join('');

  // Return headers with authorization
  return {
    ...actualHeaders, // Use original case for HTTP headers
    'Authorization': `${algorithm} Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'X-Amz-Date': timestamp,
  };
}

async function appendToSuperjournal(entry: JournalEntry) {
  try {
    console.log('💾 Saving entry to superjournal R2:', entry.id);
    
    // Load existing entries from R2
    const existingEntries = await loadSuperjournal();
    
    // Add new entry
    const updatedEntries = [...existingEntries, entry];
    
    // Save back to R2
    const content = JSON.stringify({ entries: updatedEntries }, null, 2);
    const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/superjournal.json`;
    
    const headers = await signR2Request('PUT', url, {
      'content-type': 'application/json',
    }, content);

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: content,
    });

    if (!response.ok) {
      throw new Error(`Failed to save to R2: ${response.status} ${response.statusText}`);
    }
    
    console.log('✅ Journal entry saved to R2, total entries:', updatedEntries.length);
    return { success: true };
  } catch (error) {
    console.error('❌ Error saving to superjournal R2:', error);
    throw error;
  }
}

async function loadSuperjournal(): Promise<JournalEntry[]> {
  try {
    console.log('📖 Loading superjournal from R2...');
    
    const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/superjournal.json`;
    
    const headers = await signR2Request('GET', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    if (response.status === 404) {
      console.log('📋 No existing superjournal found, starting fresh');
      return [];
    }
    
    if (!response.ok) {
      throw new Error(`Failed to load from R2: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const entries = data.entries || [];
    
    console.log(`📋 Found ${entries.length} superjournal entries in R2`);
    return entries;
    
  } catch (error) {
    console.error('❌ Error loading from R2, starting fresh:', error);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID || !R2_BUCKET_NAME) {
    console.error('Missing R2 configuration');
    return new Response(JSON.stringify({ error: 'R2 configuration missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (req.method === 'POST' && action === 'append') {
      const entry: JournalEntry = await req.json();
      console.log('📝 Appending journal entry:', entry.id, 'user content:', entry.userMessage.content.substring(0, 50));
      
      await appendToSuperjournal(entry);
      console.log('✅ Successfully appended journal entry:', entry.id);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } else if (req.method === 'GET' && action === 'load') {
      console.log('📖 Loading superjournal...');
      
      const entries = await loadSuperjournal();
      console.log(`📋 Found ${entries.length} superjournal entries`);
      
      return new Response(JSON.stringify({ entries }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use ?action=append (POST) or ?action=load (GET)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Request error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});