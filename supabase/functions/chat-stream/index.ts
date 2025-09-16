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

// Load Boss profile from boss table
async function loadBossProfile(): Promise<string> {
  try {
    const { data: boss, error } = await supabase
      .from('boss')
      .select('name, description')
      .single();

    if (error) {
      console.log('ℹ️ No boss profile found');
      return '';
    }

    return boss ? `# ${boss.name}\n\n${boss.description}` : '';
  } catch (error) {
    console.error('❌ Error loading boss profile:', error);
    return '';
  }
}

// Load active persona profile from personas table
async function loadPersonaProfile(personaName: string): Promise<string> {
  try {
    const { data: persona, error } = await supabase
      .from('personas')
      .select('name, description')
      .eq('name', personaName)
      .single();

    if (error) {
      console.log(`ℹ️ No persona profile found for ${personaName}`);
      return '';
    }

    return persona ? `# ${persona.name}\n\n${persona.description}` : '';
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
    
    // Load ALL required data sources in parallel
    const [
      turnProtocolResult,
      bossResult,
      personaResult,
      pastJournalsResult,
      persistentAttachmentsResult,
      ephemeralAttachmentsResult
    ] = await Promise.all([
      supabase.from('processes').select('*').eq('name', 'turn-protocol').single(),
      supabase.from('boss').select('*').single(),
      supabase.from('personas').select('*').eq('name', personaName).single(),
      supabase.from('past_journals_full').select('*').order('created_at', { ascending: false }),
      supabase.from('persistent_attachments').select('*').order('created_at', { ascending: false }),
      supabase.from('ephemeral_attachments').select('*').order('created_at', { ascending: false }).limit(1)
    ]);

    // Build the complete Call 1 context package
    const call1Context = buildCall1Context(
      turnProtocolResult.data,
      bossResult.data,
      personaResult.data,
      pastJournalsResult.data || [],
      persistentAttachmentsResult.data || [],
      ephemeralAttachmentsResult.data || []
    );

    const loadTime = performance.now() - startTime;
    console.log('✅ Call 1 data package loaded in', Math.round(loadTime), 'ms:', {
      turnProtocol: turnProtocolResult.data ? 'loaded' : 'missing',
      boss: bossResult.data ? 'loaded' : 'missing',
      persona: personaResult.data ? 'loaded' : 'missing',
      pastJournals: pastJournalsResult.data?.length || 0,
      persistentAttachments: persistentAttachmentsResult.data?.length || 0,
      ephemeralAttachments: ephemeralAttachmentsResult.data?.length || 0,
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
  boss: any, 
  persona: any, 
  pastJournals: any[], 
  persistentAttachments: any[], 
  ephemeralAttachments: any[]
): string {
  let context = '';
  
  // 1. Turn Protocol (comes first and includes everything in the list)
  if (turnProtocol) {
    context += `# TURN PROTOCOL\n\n${turnProtocol.content}\n\n`;
    context += `This protocol governs how to use all the following context data:\n\n`;
  }
  
  // 2. Boss Profile
  if (boss) {
    context += `## BOSS PROFILE\n`;
    context += `**Name:** ${boss.name}\n`;
    context += `**Description:** ${boss.description}\n\n`;
  }

  // 3. Active Persona Profile
  if (persona) {
    context += `## ACTIVE PERSONA: ${persona.name}\n`;
    context += `**Description:** ${persona.description}\n\n`;
  }

  // 4. Past Journals Full Table (entire table)
  if (pastJournals.length > 0) {
    context += `## PAST JOURNALS\n`;
    pastJournals.forEach(journal => {
      context += `### ${journal.title}\n`;
      context += `**Type:** ${journal.entry_type}\n`;
      context += `**Created:** ${journal.created_at}\n`;
      if (journal.tags && journal.tags.length > 0) {
        context += `**Tags:** ${journal.tags.join(', ')}\n`;
      }
      context += `**Content:**\n${journal.content}\n\n`;
    });
  }

  // 5. Persistent Attachments Table (entire table)
  if (persistentAttachments.length > 0) {
    context += `## PERSISTENT ATTACHMENTS\n`;
    const categories = [...new Set(persistentAttachments.map(a => a.category))];
    categories.forEach(category => {
      const categoryFiles = persistentAttachments.filter(a => a.category === category);
      context += `### ${category.toUpperCase()}\n`;
      categoryFiles.forEach(file => {
        context += `- **${file.original_name}** (${file.file_type}) - ${file.file_size} bytes\n`;
        context += `  Created: ${file.created_at}\n`;
      });
      context += '\n';
    });
  }

  // 6. Ephemeral Attachments (latest row only)
  if (ephemeralAttachments.length > 0) {
    context += `## LATEST EPHEMERAL ATTACHMENT\n`;
    const attachment = ephemeralAttachments[0];
    context += `- **${attachment.original_name}** (${attachment.file_type}) - ${attachment.file_size} bytes\n`;
    context += `  Created: ${attachment.created_at}\n`;
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

          console.log('🌊 INSTANT streaming active...');

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('✅ INSTANT stream complete!');
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
                    // INSTANT forward - zero processing delay
                    controller.enqueue(encoder.encode(JSON.stringify({ 
                      type: 'content_delta', 
                      delta: delta
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
            type: 'complete'
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