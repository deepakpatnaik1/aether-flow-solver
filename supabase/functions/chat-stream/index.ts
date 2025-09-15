import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY');
const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID');
const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME');

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface JournalEntry {
  id: string;
  timestamp: string;
  bossInput: string;
  personaResponse: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple persona contexts
const PERSONAS = {
  boss: "You are Boss - direct, strategic, focused on results and business outcomes.",
  gunnar: "You are Gunnar - a startup advisor with a no-nonsense approach. You combine technical knowledge with business acumen, giving direct and actionable advice.",
  samara: "You are Samara - analytical and strategic, focused on growth and optimization.",
  kirby: "You are Kirby - creative and innovative, with a focus on user experience and design thinking.",
  stefan: "You are Stefan - technical and methodical, focused on implementation and execution."
};

// Helper function to sign R2 requests (simplified version)
async function signR2Request(method: string, url: string, headers: Record<string, string> = {}, body?: string) {
  const encoder = new TextEncoder();
  const lowerHeaders: Record<string, string> = {};
  const actualHeaders: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    lowerHeaders[key.toLowerCase()] = value;
    actualHeaders[key] = value;
  }
  
  const urlObj = new URL(url);
  const canonicalUri = urlObj.pathname;
  const canonicalQuerystring = urlObj.search.slice(1);
  
  const canonicalHeaders = Object.entries(lowerHeaders)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('\n');
    
  const signedHeaders = Object.keys(lowerHeaders).sort().join(';');

  const payloadHash = body 
    ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(body))))
        .map(b => b.toString(16).padStart(2, '0')).join('')
    : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const canonicalRequest = [method, canonicalUri, canonicalQuerystring, canonicalHeaders + '\n', signedHeaders, payloadHash].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = timestamp.slice(0, 8);
  const credentialScope = `${date}/auto/s3/aws4_request`;
  
  const stringToSign = [
    algorithm, timestamp, credentialScope,
    Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest))))
      .map(b => b.toString(16).padStart(2, '0')).join('')
  ].join('\n');

  // HMAC signature chain
  const kDate = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', encoder.encode('AWS4' + R2_SECRET_ACCESS_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(date));
  const kRegion = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', new Uint8Array(kDate), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode('auto'));
  const kService = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', new Uint8Array(kRegion), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode('s3'));
  const kSigning = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', new Uint8Array(kService), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode('aws4_request'));
  const signature = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', new Uint8Array(kSigning), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(stringToSign)))).map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    ...actualHeaders,
    'Authorization': `${algorithm} Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'X-Amz-Date': timestamp,
  };
}

// Load journal content for system memory
async function loadJournalContent(): Promise<string> {
  if (!R2_ACCESS_KEY_ID) return '';
  
  try {
    const journalKey = 'journal/journal.jsonl';
    const r2Endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${journalKey}`;
    
    const emptyBodyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const getHeaders = await signR2Request('GET', r2Endpoint, {
      'host': `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      'x-amz-content-sha256': emptyBodyHash
    });

    const response = await fetch(r2Endpoint, { method: 'GET', headers: getHeaders });
    
    if (response.ok) {
      const content = await response.text();
      console.log('📚 Loaded journal content for system memory:', content.length, 'chars');
      return content;
    }
  } catch (error) {
    console.log('📝 No journal found or error loading:', error);
  }
  
  return '';
}

// Load artisan cut instructions
async function loadArtisanCutInstructions(): Promise<string> {
  if (!R2_ACCESS_KEY_ID) return '';
  
  try {
    const instructionsKey = 'processes/artisan-cut-extraction.md';
    const r2Endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${instructionsKey}`;
    
    const emptyBodyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const getHeaders = await signR2Request('GET', r2Endpoint, {
      'host': `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      'x-amz-content-sha256': emptyBodyHash
    });

    const response = await fetch(r2Endpoint, { method: 'GET', headers: getHeaders });
    
    if (response.ok) {
      const content = await response.text();
      console.log('📋 Loaded artisan cut instructions:', content.length, 'chars');
      return content;
    }
  } catch (error) {
    console.log('📋 No artisan cut instructions found:', error);
  }
  
  return '';
}

// Save journal entry via background task
async function saveJournalEntry(entry: JournalEntry) {
  try {
    const journalKey = 'journal/journal.jsonl';
    const r2Endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${journalKey}`;
    
    // Get existing content
    let existingContent = '';
    try {
      const emptyBodyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const getHeaders = await signR2Request('GET', r2Endpoint, {
        'host': `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        'x-amz-content-sha256': emptyBodyHash
      });
      
      const getResponse = await fetch(r2Endpoint, { method: 'GET', headers: getHeaders });
      if (getResponse.ok) {
        existingContent = await getResponse.text();
      }
    } catch (error) {
      console.log('Creating new journal file');
    }
    
    // Append new entry
    const newLine = JSON.stringify(entry) + '\n';
    const updatedContent = existingContent + newLine;
    
    // Calculate content hash
    const encoder = new TextEncoder();
    const contentBytes = encoder.encode(updatedContent);
    const contentHashArray = await crypto.subtle.digest('SHA-256', contentBytes);
    const contentHash = Array.from(new Uint8Array(contentHashArray))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // Upload updated journal
    const putHeaders = await signR2Request('PUT', r2Endpoint, {
      'host': `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      'content-type': 'application/jsonl',
      'content-length': updatedContent.length.toString(),
      'x-amz-content-sha256': contentHash
    }, updatedContent);
    
    const putResponse = await fetch(r2Endpoint, {
      method: 'PUT',
      headers: putHeaders,
      body: updatedContent
    });
    
    if (putResponse.ok) {
      console.log('✅ Journal entry saved:', entry.id);
    } else {
      console.error('❌ Failed to save journal entry:', putResponse.status);
    }
  } catch (error) {
    console.error('❌ Error saving journal entry:', error);
  }
}

const callOpenAI = async (model: string, messages: ChatMessage[], stream: boolean = false) => {
  const requestBody: any = {
    model,
    messages,
    stream
  };

  // Handle different model parameters
  if (model.startsWith('gpt-5') || model.startsWith('gpt-4.1') || model.startsWith('o3') || model.startsWith('o4')) {
    requestBody.max_completion_tokens = 4000;
  } else {
    requestBody.max_tokens = 4000;
    requestBody.temperature = 0.7;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  if (stream) {
    return response;
  } else {
    return await response.json();
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!OPENAI_API_KEY) {
    console.error('OpenAI API key not configured');
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { messages, model = 'gpt-5-2025-08-07', persona = 'gunnar', turnId } = await req.json();
    console.log('Received request:', { 
      messagesCount: messages?.length, 
      model, 
      persona,
      turnId
    });

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    // Generate turnId if not provided (for linking superjournal and journal)
    const conversationTurnId = turnId || crypto.randomUUID();
    
    // Load cumulative journal content for system memory
    const journalContent = await loadJournalContent();
    
    // Build enhanced system context with journal memory
    const personaContext = PERSONAS[persona as keyof typeof PERSONAS] || PERSONAS.gunnar;
    const journalMemory = journalContent ? `\n\nCUMULATIVE STRATEGIC MEMORY:\n${journalContent}` : '';
    
    const chatMessages: ChatMessage[] = [
      {
        role: 'system',
        content: personaContext + journalMemory
      },
      ...messages
    ];

    // Capture user message for Call 2
    const userMessage = messages[messages.length - 1]?.content || '';

    console.log('🚀 CALL 1: Starting streaming response with persona:', persona);
    const streamingResponse = await callOpenAI(model, chatMessages, true);

    // Create a streaming response
    const encoder = new TextEncoder();
    let fullAIResponse = ''; // Capture full response for Call 2
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = streamingResponse.body?.getReader();
          if (!reader) {
            throw new Error('No response body available');
          }

          console.log('🌊 Starting to read streaming response...');
          let totalChunks = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log(`✅ CALL 1 Streaming complete! Processed ${totalChunks} chunks`);
              
              // 🎯 CALL 2: Trigger artisan cut extraction as background task
              if (fullAIResponse.trim()) {
                console.log('🔄 CALL 2: Starting artisan cut extraction...');
                // Use background task processing
                processArtisanCut(conversationTurnId, userMessage, fullAIResponse, persona).catch(error => {
                  console.error('❌ Background artisan cut failed:', error);
                });
              }
              
              break;
            }

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            totalChunks++;

            console.log(`📦 Chunk ${totalChunks}: ${lines.length} lines`);

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  console.log('🏁 OpenAI stream finished');
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content;
                  
                  if (delta) {
                    fullAIResponse += delta; // Accumulate for Call 2
                    console.log(`📝 Sending delta: "${delta}"`);
                    // Stream the delta to frontend
                    const streamData = JSON.stringify({ 
                      type: 'content_delta', 
                      delta: delta,
                      turnId: conversationTurnId
                    }) + '\n';
                    controller.enqueue(encoder.encode(streamData));
                  }
                } catch (parseError) {
                  console.error('❌ Error parsing streaming chunk:', parseError);
                }
              }
            }
          }

          // Send completion signal with turnId
          const finalData = JSON.stringify({
            type: 'complete',
            turnId: conversationTurnId
          }) + '\n';
          controller.enqueue(encoder.encode(finalData));
          
          controller.close();

        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            error: error.message
          }) + '\n';
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      }
    });

    // 🎯 CALL 2: Background artisan cut processing function
    async function processArtisanCut(turnId: string, userMsg: string, aiResponse: string, persona: string) {
      try {
        console.log('🔥 CALL 2: Processing artisan cut for turn:', turnId);
        
        // Load artisan cut instructions
        const artisanInstructions = await loadArtisanCutInstructions();
        
        if (!artisanInstructions) {
          console.warn('⚠️ No artisan cut instructions found, skipping Call 2');
          return;
        }

        // Prepare Call 2 messages with all required inputs
        const call2Messages: ChatMessage[] = [
          {
            role: 'system',
            content: artisanInstructions
          },
          {
            role: 'user',
            content: `**User Question**: ${userMsg}\n\n**Persona Response**: ${aiResponse}\n\n**Artisan Cut Rules**: Apply the extraction rules to compress this question-response pair into strategic essence.`
          }
        ];

        console.log('🤖 CALL 2: Sending to OpenAI for artisan cut extraction...');
        
        // Call 2: Non-streaming call for artisan cut
        const artisanResponse = await callOpenAI('gpt-5-2025-08-07', call2Messages, false);
        const artisanCut = artisanResponse.choices[0]?.message?.content || '';
        
        if (artisanCut.trim()) {
          console.log('✨ CALL 2: Generated artisan cut:', artisanCut.substring(0, 100) + '...');
          
          // Parse the artisan cut to extract boss input and persona response
          const lines = artisanCut.trim().split('\n');
          let bossInput = '';
          let personaResponse = '';
          
          for (const line of lines) {
            if (line.startsWith('Boss:')) {
              bossInput = line.substring(5).trim();
            } else if (line.toLowerCase().includes(persona.toLowerCase() + ':')) {
              personaResponse = line.substring(line.indexOf(':') + 1).trim();
            }
          }

          // Save to journal.jsonl
          const journalEntry: JournalEntry = {
            id: turnId, // Same ID as superjournal for linking
            timestamp: new Date().toISOString(),
            bossInput: bossInput || userMsg.substring(0, 50), // Fallback to truncated user message
            personaResponse: personaResponse || artisanCut.trim()
          };

          await saveJournalEntry(journalEntry);
          console.log('💾 CALL 2: Saved journal entry:', turnId);
          
        } else {
          console.warn('⚠️ CALL 2: No artisan cut generated');
        }
        
      } catch (error) {
        console.error('❌ CALL 2: Error in artisan cut processing:', error);
      }
    }

    return new Response(stream, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Request error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});