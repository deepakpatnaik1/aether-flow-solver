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
    // Simple in-memory storage as fallback until R2 is fixed
    console.log('💾 Saving entry to superjournal:', entry.id);
    
    // Add to memory storage
    memoryEntries.push(entry);
    
    console.log('✅ Journal entry saved (in-memory), total entries:', memoryEntries.length);
    return { success: true };
  } catch (error) {
    console.error('❌ Error saving to superjournal:', error);
    throw error;
  }
}

// In-memory storage for now (until R2 is fixed)
let memoryEntries: JournalEntry[] = [
  {
    "id": "fca57d8b-8230-4dab-b301-1fd1df6a72aa",
    "timestamp": "2025-09-15T08:34:56.170Z",
    "userMessage": {
      "content": "Kirby, what is the capital of India?",
      "persona": "Boss"
    },
    "aiResponse": {
      "content": "New Delhi.",
      "persona": "kirby",
      "model": "gpt-5-2025-08-07"
    }
  },
  {
    "id": "b4e9f7d4-ef16-4267-8f59-d5cf8889a52a",
    "timestamp": "2025-09-15T09:24:33.043Z",
    "userMessage": {
      "content": "Stefan, what is the capital of Nepal?",
      "persona": "Boss"
    },
    "aiResponse": {
      "content": "Kathmandu.",
      "persona": "stefan",
      "model": "gpt-5-mini-2025-08-07"
    }
  }
];

async function loadSuperjournal(): Promise<JournalEntry[]> {
  console.log('📖 Loading superjournal from memory...');
  console.log(`📋 Found ${memoryEntries.length} superjournal entries`);
  return memoryEntries;
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