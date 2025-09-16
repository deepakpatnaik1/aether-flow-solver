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

// Load OPTIMIZED context data for the LLM - SPEED FOCUSED
async function loadRelevantKnowledge(): Promise<string> {
  try {
    const startTime = performance.now();
    console.log('🚀 Loading optimized context data...');
    
    // Load ALL context sources (except ephemeral - only latest)
    const [
      pastJournalsResult,
      journalEntriesResult,
      ephemeralAttachmentsResult,
      persistentAttachmentsResult
    ] = await Promise.all([
      supabase.from('past_journals_full').select('title, content').order('created_at', { ascending: false }),
      supabase.from('journal_entries').select('entry_id, timestamp, user_message_content, ai_response_content, user_message_persona, ai_response_persona').order('created_at', { ascending: false }),
      supabase.from('ephemeral_attachments').select('original_name, file_type, file_size').order('created_at', { ascending: false }).limit(1),
      supabase.from('persistent_attachments').select('original_name, file_type, category').order('created_at', { ascending: false })
    ]);

    // Build detailed knowledge context with ALL data
    const knowledgeContext = buildKnowledgeContext(
      pastJournalsResult.data || [],
      journalEntriesResult.data || [],
      ephemeralAttachmentsResult.data || [],
      persistentAttachmentsResult.data || []
    );

    const loadTime = performance.now() - startTime;
    console.log('⚡ SPEED OPTIMIZED Context loaded in', Math.round(loadTime), 'ms:', {
      pastJournals: pastJournalsResult.data?.length || 0,
      journalEntries: journalEntriesResult.data?.length || 0, 
      ephemeralAttachments: ephemeralAttachmentsResult.data?.length || 0,
      persistentAttachments: persistentAttachmentsResult.data?.length || 0,
      contextSize: knowledgeContext.length
    });

    return knowledgeContext;
  } catch (error) {
    console.error('❌ Error loading context:', error);
    return '';
  }
}

// Full detailed context builder - ALL data with complete formatting
function buildKnowledgeContext(pastJournals: any[], journalEntries: any[], ephemeralAttachments: any[], persistentAttachments: any[]): string {
  let context = '\n## Knowledge Context:\n\n';
  
  // Past journals with full content
  if (pastJournals.length > 0) {
    context += '### Past Journal Entries:\n';
    pastJournals.forEach(journal => {
      context += `#### ${journal.title}\n`;
      context += `${journal.content}\n\n`;
    });
  }

  // Full conversation history
  if (journalEntries.length > 0) {
    context += '### Conversation History:\n';
    journalEntries.forEach(entry => {
      context += `**${entry.entry_id}** (${entry.timestamp})\n`;
      context += `User (${entry.user_message_persona}): ${entry.user_message_content}\n`;
      context += `AI (${entry.ai_response_persona}): ${entry.ai_response_content}\n\n`;
    });
  }

  // Ephemeral attachments (latest only)
  if (ephemeralAttachments.length > 0) {
    context += '### Latest Ephemeral Attachment:\n';
    ephemeralAttachments.forEach(attachment => {
      context += `- ${attachment.original_name} (${attachment.file_type}, ${attachment.file_size} bytes)\n`;
    });
    context += '\n';
  }

  // All persistent attachments by category
  if (persistentAttachments.length > 0) {
    context += '### Persistent Attachments:\n';
    const categories = [...new Set(persistentAttachments.map(a => a.category))];
    categories.forEach(category => {
      const categoryFiles = persistentAttachments.filter(a => a.category === category);
      context += `#### ${category}:\n`;
      categoryFiles.forEach(file => {
        context += `- ${file.original_name} (${file.file_type})\n`;
      });
      context += '\n';
    });
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
    const { messages, model = 'gpt-5-2025-08-07', persona = 'gunnar' } = await req.json();
    console.log('⚡ PERFORMANCE TRACKING - Request received:', { 
      messagesCount: messages?.length, 
      model, 
      persona,
      timestamp: new Date(new Date().getTime() + (2 * 60 * 60 * 1000)).toISOString() // Berlin time (UTC+2)
    });

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    const contextStartTime = performance.now();
    console.log('🔄 Loading context...');
    
    // Load context components with performance tracking
    const [
      bossProfile, 
      personaProfile,
      knowledgeContext
    ] = await Promise.all([
      loadBossProfile(),
      loadPersonaProfile(persona.charAt(0).toUpperCase() + persona.slice(1)),
      loadRelevantKnowledge()
    ]);
    
    const contextLoadTime = performance.now() - contextStartTime;
    console.log('✅ Context loaded in', Math.round(contextLoadTime), 'ms');
    
    // Build COMPACT system message
    const systemMessage = `${bossProfile}\n${personaProfile}\n${knowledgeContext}\n\n## Instructions:\nYou are ${persona}. 

CRITICAL: Match your persona's communication style exactly:
- If described as "sharp/direct" → be concise and to-the-point
- If described as "blunt" → no fluff or filler
- If described as giving "short" responses → keep responses brief
- Quality over quantity - make every word count

Stay authentic to your character's voice and personality. Use context when relevant but don't be verbose unless your persona specifically calls for detailed explanations.`;
    
    const chatMessages: ChatMessage[] = [
      {
        role: 'system',
        content: systemMessage
      },
      ...messages  // Include the actual user messages!
    ];

    const openaiStartTime = performance.now();
    console.log('🚀 Starting OpenAI call with persona:', persona);
    console.log('📝 System message size:', systemMessage.length, 'characters');
    
    const streamingResponse = await callOpenAI(model, chatMessages, true);
    const openaiCallTime = performance.now() - openaiStartTime;
    console.log('⚡ OpenAI call completed in', Math.round(openaiCallTime), 'ms');

    const totalRequestTime = performance.now() - requestStartTime;
    console.log('🏁 TOTAL REQUEST TIME:', Math.round(totalRequestTime), 'ms');

    // Create a streaming response
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = streamingResponse.body?.getReader();
          if (!reader) {
            throw new Error('No response body available');
          }

          console.log('🌊 Starting to read streaming response...');

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('✅ Streaming complete!');
              break;
            }

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

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
                    // Stream the delta to frontend
                    const streamData = JSON.stringify({ 
                      type: 'content_delta', 
                      delta: delta
                    }) + '\n';
                    controller.enqueue(encoder.encode(streamData));
                  }
                } catch (parseError) {
                  console.error('❌ Error parsing streaming chunk:', parseError);
                }
              }
            }
          }

          // Send completion signal
          const finalData = JSON.stringify({
            type: 'complete'
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