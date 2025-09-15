import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// R2 Configuration
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY');
const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID');
const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME');

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
  
  // Create canonical request
  const urlObj = new URL(url);
  const canonicalUri = urlObj.pathname;
  const canonicalQuerystring = urlObj.search.slice(1);
  
  const canonicalHeaders = Object.entries(headers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key.toLowerCase()}:${value}`)
    .join('\n');
    
  const signedHeaders = Object.keys(headers)
    .map(key => key.toLowerCase())
    .sort()
    .join(';');

  const payloadHash = body 
    ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(body))))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // Empty string hash

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

  // Calculate signature
  const getSignatureKey = async (key: string, dateStamp: string, regionName: string, serviceName: string) => {
    const kDate = await crypto.subtle.importKey(
      'raw',
      encoder.encode('AWS4' + key),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const kDateResult = await crypto.subtle.sign('HMAC', kDate, encoder.encode(dateStamp));
    
    const kRegion = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(kDateResult),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const kRegionResult = await crypto.subtle.sign('HMAC', kRegion, encoder.encode(regionName));
    
    const kService = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(kRegionResult),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const kServiceResult = await crypto.subtle.sign('HMAC', kService, encoder.encode(serviceName));
    
    const kSigning = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(kServiceResult),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const kSigningResult = await crypto.subtle.sign('HMAC', kSigning, encoder.encode('aws4_request'));
    
    return new Uint8Array(kSigningResult);
  };

  const signingKey = await getSignatureKey(R2_SECRET_ACCESS_KEY!, date, 'auto', 's3');
  const signingKeyObj = await crypto.subtle.importKey(
    'raw',
    signingKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureResult = await crypto.subtle.sign('HMAC', signingKeyObj, encoder.encode(stringToSign));
  const signature = Array.from(new Uint8Array(signatureResult))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Create authorization header
  const authorization = `${algorithm} Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return {
    ...headers,
    'Authorization': authorization,
    'X-Amz-Date': timestamp,
  };
}

async function appendToSuperjournal(entry: JournalEntry) {
  const journalKey = 'superjournal/journal.jsonl';
  const r2Endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${journalKey}`;
  
  try {
    // First, try to get existing journal
    let existingContent = '';
    try {
      const getHeaders = await signR2Request('GET', r2Endpoint, {
        'Host': `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        'x-amz-content-sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      });
      
      const getResponse = await fetch(r2Endpoint, {
        method: 'GET',
        headers: getHeaders
      });
      
      if (getResponse.ok) {
        existingContent = await getResponse.text();
      }
    } catch (error) {
      console.log('No existing journal found, creating new one');
    }
    
    // Append new entry
    const newLine = JSON.stringify(entry) + '\n';
    const updatedContent = existingContent + newLine;
    
  // Calculate content hash for the updated content
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(updatedContent);
  const contentHashArray = await crypto.subtle.digest('SHA-256', contentBytes);
  const contentHash = Array.from(new Uint8Array(contentHashArray))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Upload updated journal
  const putHeaders = await signR2Request('PUT', r2Endpoint, {
    'Host': `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    'Content-Type': 'application/jsonl',
    'Content-Length': updatedContent.length.toString(),
    'x-amz-content-sha256': contentHash
  }, updatedContent);
    
    const putResponse = await fetch(r2Endpoint, {
      method: 'PUT',
      headers: putHeaders,
      body: updatedContent
    });
    
    if (!putResponse.ok) {
      throw new Error(`Failed to upload journal: ${putResponse.status} ${await putResponse.text()}`);
    }
    
    console.log('✅ Journal entry saved to R2');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error saving to superjournal:', error);
    throw error;
  }
}

async function loadSuperjournal(): Promise<JournalEntry[]> {
  const journalKey = 'superjournal/journal.jsonl';
  const r2Endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${journalKey}`;
  
  try {
    const getHeaders = await signR2Request('GET', r2Endpoint, {
      'Host': `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      'x-amz-content-sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    });
    
    const response = await fetch(r2Endpoint, {
      method: 'GET',
      headers: getHeaders
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('📝 No superjournal found, returning empty array');
        return [];
      }
      throw new Error(`Failed to load journal: ${response.status}`);
    }
    
    const content = await response.text();
    const entries: JournalEntry[] = [];
    
    // Parse JSONL content
    const lines = content.trim().split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch (parseError) {
        console.warn('⚠️ Failed to parse journal line:', line);
      }
    }
    
    console.log(`📖 Loaded ${entries.length} journal entries from R2`);
    return entries;
    
  } catch (error) {
    console.error('❌ Error loading superjournal:', error);
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
      console.log('📝 Appending journal entry:', entry.id);
      
      await appendToSuperjournal(entry);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } else if (req.method === 'GET' && action === 'load') {
      console.log('📖 Loading superjournal...');
      
      const entries = await loadSuperjournal();
      
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