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
  const journalKey = 'superjournal/superjournal.jsonl';
  const r2Endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${journalKey}`;
  
  try {
    // First, try to get existing journal
    let existingContent = '';
    try {
      const emptyBodyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const getHeaders = await signR2Request('GET', r2Endpoint, {
        'host': `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        'x-amz-content-sha256': emptyBodyHash
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

    // Upload updated journal - use exact same headers that will be signed
    const putHeaders = await signR2Request('PUT', r2Endpoint, {
      'host': `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      'content-type': 'application/jsonl',
      'content-length': updatedContent.length.toString(),
      'x-amz-content-sha256': contentHash
    }, updatedContent);
    
    console.log('🔐 PUT headers for R2:', putHeaders);
    
    const putResponse = await fetch(r2Endpoint, {
      method: 'PUT',
      headers: putHeaders,
      body: updatedContent
    });
    
    if (!putResponse.ok) {
      const errorText = await putResponse.text();
      console.error('❌ R2 PUT failed:', putResponse.status, errorText);
      throw new Error(`Failed to upload journal: ${putResponse.status} ${errorText}`);
    }
    
    console.log('✅ Journal entry saved to R2');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error saving to superjournal:', error);
    throw error;
  }
}

async function loadSuperjournal(): Promise<JournalEntry[]> {
  // Try new filename first, then fall back to old filename
  const journalKeys = ['superjournal/superjournal.jsonl', 'superjournal/journal.jsonl'];
  
  for (const journalKey of journalKeys) {
    const r2Endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${journalKey}`;
    
    try {
      const emptyBodyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const getHeaders = await signR2Request('GET', r2Endpoint, {
        'host': `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        'x-amz-content-sha256': emptyBodyHash
      });

      console.log('🔍 Attempting to load from R2:', r2Endpoint);
      
      const response = await fetch(r2Endpoint, {
        method: 'GET',
        headers: getHeaders
      });

      console.log('📡 R2 GET response status:', response.status);

      if (response.ok) {
        // Found entries in this file, process them

        const content = await response.text();
        console.log('📖 Raw journal content length:', content.length);
        console.log('📄 First 200 chars:', content.substring(0, 200));
        
        const entries: JournalEntry[] = [];
        const lines = content.trim().split('\n');
        
        console.log('📊 Processing', lines.length, 'lines from journal');
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const entry = JSON.parse(line);
              entries.push(entry);
            } catch (parseError) {
              console.warn('⚠️ Failed to parse journal line:', line, parseError);
            }
          }
        }
        
        console.log('✅ Successfully loaded', entries.length, 'journal entries from', journalKey);
        
        // If we found entries in the old filename, migrate them to the new filename
        if (journalKey.includes('journal.jsonl') && entries.length > 0) {
          console.log('🔄 Migrating entries from old filename to new filename...');
          try {
            // Save all entries to the new filename
            const newJournalKey = 'superjournal/superjournal.jsonl';
            const newR2Endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${newJournalKey}`;
            const migratedContent = entries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
            
            // Calculate content hash
            const encoder = new TextEncoder();
            const contentBytes = encoder.encode(migratedContent);
            const contentHashArray = await crypto.subtle.digest('SHA-256', contentBytes);
            const contentHash = Array.from(new Uint8Array(contentHashArray))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
            
            const putHeaders = await signR2Request('PUT', newR2Endpoint, {
              'host': `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
              'content-type': 'application/jsonl',
              'content-length': migratedContent.length.toString(),
              'x-amz-content-sha256': contentHash
            }, migratedContent);
            
            const putResponse = await fetch(newR2Endpoint, {
              method: 'PUT',
              headers: putHeaders,
              body: migratedContent
            });
            
            if (putResponse.ok) {
              console.log('✅ Successfully migrated entries to new filename');
            } else {
              console.warn('⚠️ Failed to migrate entries:', putResponse.status);
            }
          } catch (migrateError) {
            console.error('❌ Error migrating entries:', migrateError);
          }
        }
        
        return entries;
      } else if (response.status === 404) {
        console.log('📝 No file found at', journalKey);
        continue; // Try next filename
      } else {
        throw new Error(`Failed to load journal from ${journalKey}: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ Error loading from', journalKey, ':', error);
      continue; // Try next filename
    }
  }
  
  // If we get here, no files were found
  console.log('📝 No superjournal files found, returning empty array');
  return [];
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