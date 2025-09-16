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

// Load ALL context data for the LLM
async function loadRelevantKnowledge(): Promise<string> {
  try {
    console.log('📚 Loading all context data...');
    
    // Load all context sources in parallel
    const [
      pastJournalsResult,
      journalEntriesResult,
      ephemeralAttachmentsResult,
      persistentAttachmentsResult
    ] = await Promise.all([
      supabase.from('past_journals_full').select('title, content').order('created_at', { ascending: false }),
      supabase.from('journal_entries').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('ephemeral_attachments').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('persistent_attachments').select('*').order('created_at', { ascending: false })
    ]);

    let knowledgeContext = '\n## Complete Context Package:\n\n';
    
    // Past Journals Full
    if (pastJournalsResult.data && pastJournalsResult.data.length > 0) {
      knowledgeContext += '### Past Journal Entries (Full Content):\n';
      for (const entry of pastJournalsResult.data) {
        knowledgeContext += `**${entry.title}**\n${entry.content}\n\n`;
      }
    }

    // Recent Journal Entries 
    if (journalEntriesResult.data && journalEntriesResult.data.length > 0) {
      knowledgeContext += '### Recent Conversation History:\n';
      for (const entry of journalEntriesResult.data) {
        knowledgeContext += `**Turn ${entry.entry_id}** (${entry.timestamp})\n`;
        knowledgeContext += `User (${entry.user_message_persona}): ${entry.user_message_content}\n`;
        knowledgeContext += `AI (${entry.ai_response_persona}, ${entry.ai_response_model}): ${entry.ai_response_content}\n\n`;
      }
    }

    // Recent Ephemeral Attachments
    if (ephemeralAttachmentsResult.data && ephemeralAttachmentsResult.data.length > 0) {
      knowledgeContext += '### Recent Chat Attachments:\n';
      for (const attachment of ephemeralAttachmentsResult.data) {
        knowledgeContext += `- ${attachment.original_name} (${attachment.file_type}, ${attachment.file_size} bytes) - ${attachment.created_at}\n`;
      }
      knowledgeContext += '\n';
    }

    // All Persistent Attachments
    if (persistentAttachmentsResult.data && persistentAttachmentsResult.data.length > 0) {
      knowledgeContext += '### Available Knowledge Assets:\n';
      const categories = [...new Set(persistentAttachmentsResult.data.map(a => a.category))];
      for (const category of categories) {
        knowledgeContext += `**${category.toUpperCase()}:**\n`;
        const categoryFiles = persistentAttachmentsResult.data.filter(a => a.category === category);
        for (const file of categoryFiles) {
          knowledgeContext += `- ${file.original_name} (${file.file_type})\n`;
        }
        knowledgeContext += '\n';
      }
    }

    console.log('✅ Context package loaded:', {
      pastJournals: pastJournalsResult.data?.length || 0,
      journalEntries: journalEntriesResult.data?.length || 0, 
      ephemeralAttachments: ephemeralAttachmentsResult.data?.length || 0,
      persistentAttachments: persistentAttachmentsResult.data?.length || 0
    });

    return knowledgeContext;
  } catch (error) {
    console.error('❌ Error loading complete context:', error);
    return '';
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
    const { messages, model = 'gpt-5-2025-08-07', persona = 'gunnar' } = await req.json();
    console.log('Received request:', { 
      messagesCount: messages?.length, 
      model, 
      persona
    });

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    console.log('🔄 Loading context...');
    
    // Load context components
    const [
      bossProfile, 
      personaProfile,
      knowledgeContext
    ] = await Promise.all([
      loadBossProfile(),
      loadPersonaProfile(persona.charAt(0).toUpperCase() + persona.slice(1)),
      loadRelevantKnowledge()
    ]);
    
    console.log('✅ Context loaded');
    
    // Build system message with profiles and context
    const systemMessage = `${bossProfile}

${personaProfile}

${knowledgeContext}

## Current Context:
You are responding as ${persona}. Draw upon the boss profile, your persona description, and relevant knowledge from previous conversations to provide contextually-aware responses that maintain consistency with past discussions and decisions.

Stay in character while being helpful. Reference specific past conversations, decisions, or strategies when relevant to the current discussion.`;
    
    const chatMessages: ChatMessage[] = [
      {
        role: 'system',
        content: systemMessage
      },
      ...messages
    ];

    console.log('🚀 Starting streaming response with persona:', persona);
    
    // Log detailed message info for debugging
    console.log('📝 System message length:', systemMessage.length);
    console.log('📝 Total messages to OpenAI:', chatMessages.length);
    console.log('📝 Message breakdown:', chatMessages.map((msg, idx) => ({
      index: idx,
      role: msg.role,
      contentLength: msg.content.length,
      contentPreview: msg.content.slice(0, 100) + (msg.content.length > 100 ? '...' : '')
    })));
    
    const streamingResponse = await callOpenAI(model, chatMessages, true);

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