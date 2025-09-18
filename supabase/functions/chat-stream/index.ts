import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

// Supabase Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Load Boss profile from boss bucket
async function loadBossProfile(): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('boss')
      .download('Boss.txt');

    if (error) {
      console.log('ℹ️ No boss profile found');
      return '';
    }

    const text = await data.text();
    return text;
  } catch (error) {
    console.error('❌ Error loading boss profile:', error);
    return '';
  }
}

// Load active persona profile from personas bucket
async function loadPersonaProfile(personaName: string): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('personas')
      .download(`${personaName}.txt`);

    if (error) {
      console.log(`ℹ️ No persona profile found for ${personaName}`);
      return '';
    }

    const text = await data.text();
    return text;
  } catch (error) {
    console.error('❌ Error loading persona profile:', error);
    return '';
  }
}

// Load CALL 1 complete data package for the LLM
async function loadCall1DataPackage(personaName: string): Promise<string> {
  try {
    const startTime = performance.now();
    console.log('🚀 Loading Call 1 complete data package...');
    
    // Load ALL required data sources in parallel INCLUDING Google connection status
    const [
      turnProtocolResult,
      bossResult,
      personaResult,
      pastJournalsContent,
      persistentAttachmentsResult,
      ephemeralAttachmentsResult,
      journalEntriesResult
    ] = await Promise.all([
      supabase.storage.from('processes').download('turn-protocol.md'),
      loadBossProfile(),
      loadPersonaProfile(personaName),
      supabase.storage.from('past-journals').download('Past Journals.txt').then(r => r.data ? r.data.text() : '').catch(() => ''),
      supabase.storage.from('persistent-attachments').list(),
      supabase.from('ephemeral_attachments').select('*').limit(1),
      supabase.from('journal_entries').select('*').order('timestamp', { ascending: true })
    ]);

    // Build the complete Call 1 context package
    const turnProtocolContent = turnProtocolResult.data ? await turnProtocolResult.data.text() : '';
    // Transform bucket files to match expected format
    const transformedPersistentAttachments = (persistentAttachmentsResult.data || []).map(file => {
      const pathParts = file.name.split('/');
      const category = pathParts.length > 1 ? pathParts[0] : 'uncategorized';
      const fileName = pathParts[pathParts.length - 1];
      return {
        category: category,
        original_name: fileName,
        file_type: file.metadata?.mimetype || 'application/octet-stream'
      };
    });

    const call1Context = buildCall1Context(
      { content: turnProtocolContent },
      bossResult,
      personaResult,
      pastJournalsContent || '',
      transformedPersistentAttachments,
      ephemeralAttachmentsResult.data || [],
      journalEntriesResult.data || []
    );

    const loadTime = performance.now() - startTime;
    console.log('✅ Call 1 data package loaded in', Math.round(loadTime), 'ms:', {
      turnProtocol: turnProtocolContent ? 'loaded' : 'missing',
      boss: bossResult ? 'loaded' : 'missing',
      persona: personaResult ? 'loaded' : 'missing',
      pastJournals: pastJournalsContent ? pastJournalsContent.length : 0,
      persistentAttachments: persistentAttachmentsResult.data?.length || 0,
      ephemeralAttachments: ephemeralAttachmentsResult.data?.length || 0,
      journalEntries: journalEntriesResult.data?.length || 0,
      contextSize: call1Context.length
    });

    return call1Context;
  } catch (error) {
    console.error('❌ Error loading Call 1 data package:', error);
    return '';
  }
}

// Build complete Call 1 context package with all required data
function buildCall1Context(
  turnProtocol: any, 
  bossContent: string, 
  personaContent: string, 
  pastJournalsContent: string, 
  persistentAttachments: any[], 
  ephemeralAttachments: any[],
  journalEntries: any[]
): string {
  let context = '';
  
  // 1. Turn Protocol (comes first and includes everything in the list)
  if (turnProtocol && turnProtocol.content) {
    context += `# TURN PROTOCOL\n\n${turnProtocol.content}\n\n`;
    context += `This protocol governs how to use all the following context data:\n\n`;
  }
  
  // 2. Boss Profile
  if (bossContent) {
    context += `## BOSS PROFILE\n\n${bossContent}\n\n`;
  }

  // 3. Active Persona Profile
  if (personaContent) {
    context += `## ACTIVE PERSONA\n\n${personaContent}\n\n`;
  }

  // 4. Past Journals (consolidated content from file)
  if (pastJournalsContent.trim()) {
    context += `## PAST JOURNALS\n`;
    context += `${pastJournalsContent}\n\n`;
  }

  // 5. Journal Entries (chronological conversation history)
  if (journalEntries.length > 0) {
    context += `## JOURNAL ENTRIES (CONVERSATION HISTORY)\n`;
    journalEntries.forEach(entry => {
      const timestamp = new Date(entry.timestamp).toLocaleString('en-US', {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      context += `\n**${timestamp}** | ${entry.user_message_persona} → ${entry.ai_response_persona}\n`;
      context += `**User:** ${entry.user_message_content}\n`;
      context += `**${entry.ai_response_persona}:** ${entry.ai_response_content}\n`;
      context += `---\n`;
    });
    context += '\n';
  }

  // 6. Persistent Attachments Table (entire table)
  if (persistentAttachments.length > 0) {
    context += `## PERSISTENT ATTACHMENTS\n`;
    const categories = [...new Set(persistentAttachments.map(a => a.category))];
    categories.forEach(category => {
      const categoryFiles = persistentAttachments.filter(a => a.category === category);
      context += `### ${category.toUpperCase()}\n`;
      categoryFiles.forEach(file => {
        context += `- **${file.original_name}** (${file.file_type})\n`;
      });
      context += '\n';
    });
  }

  // 7. Ephemeral Attachments (latest row only)
  if (ephemeralAttachments.length > 0) {
    context += `## LATEST EPHEMERAL ATTACHMENT\n`;
    const attachment = ephemeralAttachments[0];
    context += `- **${attachment.original_name}** (${attachment.file_type})\n`;
    if (attachment.message_id) {
      context += `  Message ID: ${attachment.message_id}\n`;
    }
    context += '\n';
  }

  return context;
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

// [REMOVED] All Google service execution logic - will be replaced with clean LLM function calling

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
    const requestStartTime = performance.now();
    const { messages, model = 'gpt-4o-mini', persona = 'gunnar' } = await req.json();
    console.log('📋 CALL 1 - Request received:', { 
      messagesCount: messages?.length, 
      model, 
      persona
    });

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    // CALL 1: Load complete data package
    console.log('🔄 Loading Call 1 complete data package...');
    const call1Context = await loadCall1DataPackage(persona);
    
    // Build system message with complete context
    const systemMessage = call1Context + `\n## USER QUESTION\nThe user is asking the following question to ${persona}:\n\n`;
    
    console.log('📝 System message size:', systemMessage.length, 'characters');
    
    const chatMessages: ChatMessage[] = [
      {
        role: 'system',
        content: systemMessage
      },
      ...messages
    ];

    console.log('🚀 Starting OpenAI call with persona:', persona);
    const contextLoadTime = performance.now() - requestStartTime;
    console.log('✅ Context loaded in', Math.round(contextLoadTime), 'ms');
    
    const streamingResponse = await callOpenAI(model, chatMessages, true);

    console.log('🏁 CALL 1 TOTAL TIME:', Math.round(performance.now() - requestStartTime), 'ms');

    // Create ultra-fast streaming response
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = streamingResponse.body?.getReader();
          if (!reader) {
            throw new Error('No response body available');
          }

          console.log('🌊 Starting streaming...');
          let fullPersonaResponse = ''; // Collect the complete response
          let turnId = crypto.randomUUID(); // Generate unique turn ID

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('✅ Stream complete!');
              
              // TRIGGER CALL 2 automatically in background
              if (fullPersonaResponse.trim()) {
                console.log('🚀 Triggering Call 2 - Artisan Cut Processing...');
                
                // Background Call 2 - don't await, let it run silently
                fetch('https://suncgglbheilkeimwuxt.supabase.co/functions/v1/artisan-cut-call2', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
                  },
                  body: JSON.stringify({
                    entryId: turnId,
                    userInput: userMessage?.content || 'No user input',
                    personaResponse: fullPersonaResponse,
                    userPersona: 'Boss',
                    aiPersona: persona,
                    model: model
                  })
                }).catch(error => {
                  console.error('❌ Call 2 failed:', error);
                });
              }
              
              break;
            }

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content;
                  
                  if (delta) {
                    fullPersonaResponse += delta; // Accumulate complete response
                    
                    // Stream to UI immediately  
                    controller.enqueue(encoder.encode(JSON.stringify({ 
                      type: 'content_delta', 
                      delta: delta,
                      turnId: turnId
                    }) + '\n'));
                  }
                } catch (parseError) {
                  // Silent fail for speed
                }
              }
            }
          }

          // Completion signal
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'complete',
            turnId: turnId
          }) + '\n'));
          
          controller.close();

        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'error',
            error: error.message
          }) + '\n'));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Request error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});