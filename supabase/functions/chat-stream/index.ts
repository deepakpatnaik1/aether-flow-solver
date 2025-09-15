import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

// EdgeRuntime for background tasks
declare const EdgeRuntime: {
  waitUntil(promise: Promise<any>): void;
};

// Supabase Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface JournalEntry {
  id: string;
  timestamp: string;
  bossInput: string;
  personaResponse: string;
  persona: string; // Add persona field
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Load personas from Supabase database
async function loadPersonas(): Promise<Record<string, string>> {
  try {
    const { data: personas, error } = await supabase
      .from('personas')
      .select('name, description');

    if (error) {
      console.error('❌ Error loading personas:', error);
      return getDefaultPersonas();
    }

    const personaMap: Record<string, string> = {};
    personas?.forEach(persona => {
      personaMap[persona.name] = persona.description;
    });

    console.log('📋 Loaded personas from database:', Object.keys(personaMap));
    return personaMap;
  } catch (error) {
    console.error('❌ Error loading personas:', error);
    return getDefaultPersonas();
  }
}

// Fallback personas in case database is unavailable
function getDefaultPersonas(): Record<string, string> {
  return {
    boss: "You are Boss - direct, strategic, focused on results and business outcomes.",
    gunnar: "You are Gunnar - a startup advisor with a no-nonsense approach. You combine technical knowledge with business acumen, giving direct and actionable advice.",
    samara: "You are Samara - analytical and strategic, focused on growth and optimization.",
    kirby: "You are Kirby - creative and innovative, with a focus on user experience and design thinking.",
    stefan: "You are Stefan - technical and methodical, focused on implementation and execution."
  };
}

// Load turn-protocol instructions
async function loadTurnProtocol(): Promise<string> {
  try {
    const { data: process, error } = await supabase
      .from('processes')
      .select('content')
      .eq('name', 'turn-protocol')
      .single();

    if (error) {
      console.error('❌ Error loading turn-protocol:', error);
      return '';
    }

    return process?.content || '';
  } catch (error) {
    console.error('❌ Error loading turn-protocol:', error);
    return '';
  }
}

// Load Boss profile from boss table
async function loadBossProfile(): Promise<string> {
  try {
    const { data: boss, error } = await supabase
      .from('boss')
      .select('name, description')
      .single();

    if (error) {
      console.error('❌ Error loading boss profile:', error);
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
      console.error('❌ Error loading persona profile:', error);
      return '';
    }

    return persona ? `# ${persona.name}\n\n${persona.description}` : '';
  } catch (error) {
    console.error('❌ Error loading persona profile:', error);
    return '';
  }
}

// Load relevant knowledge from knowledge_entries table
async function loadRelevantKnowledge(userMessage: string, personaName: string): Promise<string> {
  try {
    // Get recent conversations and key strategic context - simplified query
    const { data: knowledge, error } = await supabase
      .from('knowledge_entries')
      .select('title, content, entry_type, tags')
      .in('entry_type', ['conversation', 'strategy', 'decision'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log('ℹ️ Error loading knowledge:', error);
      return '';
    }

    if (!knowledge || knowledge.length === 0) {
      return '';
    }

    let knowledgeContext = '\n## Relevant Context from Previous Conversations:\n\n';
    
    for (const entry of knowledge) {
      knowledgeContext += `### ${entry.title}\n${entry.content.substring(0, 500)}...\n\n`;
    }

    return knowledgeContext;
  } catch (error) {
    console.error('❌ Error loading knowledge:', error);
    return '';
  }
}

// Load full journal table
async function loadFullJournal(): Promise<string> {
  try {
    const { data: entries, error } = await supabase
      .from('journal_entries')
      .select('*')
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('❌ Error loading full journal:', error);
      return '';
    }

    return JSON.stringify(entries || [], null, 2);
  } catch (error) {
    console.error('❌ Error loading full journal:', error);
    return '';
  }
}

// Load latest ephemeral attachment
async function loadLatestEphemeralAttachment(): Promise<string> {
  try {
    const { data: attachments, error } = await supabase
      .from('ephemeral_attachments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Error loading latest ephemeral attachment:', error);
      return '';
    }

    return JSON.stringify(attachments?.[0] || {}, null, 2);
  } catch (error) {
    console.error('❌ Error loading latest ephemeral attachment:', error);
    return '';
  }
}

// Load all persistent attachments
async function loadPersistentAttachments(): Promise<string> {
  try {
    const { data: attachments, error } = await supabase
      .from('persistent_attachments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error loading persistent attachments:', error);
      return '';
    }

    return JSON.stringify(attachments || [], null, 2);
  } catch (error) {
    console.error('❌ Error loading persistent attachments:', error);
    return '';
  }
}

// Load artisan cut instructions from Supabase
async function loadArtisanCutInstructions(): Promise<string> {
  try {
    const { data: process, error } = await supabase
      .from('processes')
      .select('content')
      .eq('name', 'artisan-cut-extraction')
      .single();

    if (error) {
      console.error('❌ Error loading artisan cut instructions:', error);
      return '';
    }

    if (!process) {
      console.log('📋 No artisan cut instructions found');
      return '';
    }

    console.log('📋 Loaded artisan cut instructions:', process.content.length, 'chars');
    return process.content;
    
  } catch (error) {
    console.error('❌ Error loading artisan cut instructions:', error);
    return '';
  }
}

// Save journal entry to Supabase database
async function saveJournalEntry(entry: JournalEntry) {
  try {
    const { error } = await supabase
      .from('journal_entries')
      .insert({
        entry_id: entry.id, // Links to superjournal_entries.entry_id
        timestamp: entry.timestamp,
        user_message_content: entry.bossInput,
        user_message_persona: 'Boss', // Always Boss for user messages
        user_message_attachments: [], // No attachments in artisan cuts
        ai_response_content: entry.personaResponse,
        ai_response_persona: entry.persona, // Use the actual persona name
        ai_response_model: 'gpt-5-2025-08-07' // Model used for artisan cut generation
      });

    if (error) {
      console.error('❌ Failed to save journal entry:', error);
      return;
    }

    console.log('✅ Journal entry saved to database:', entry.id);
    
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
    
    // Capture user question first
    const actualQuestion = messages[messages.length - 1]?.content || '';
    
    console.log('🔄 Loading all Call 1 components...');
    
    // Load all 9 required components for Call 1
    const [
      turnProtocol,
      bossProfile, 
      personaProfile,
      knowledgeContext,
      fullJournal,
      latestEphemeralAttachment,
      persistentAttachments
    ] = await Promise.all([
      loadTurnProtocol(),
      loadBossProfile(),
      loadPersonaProfile(persona.charAt(0).toUpperCase() + persona.slice(1)), // Normalize case
      loadRelevantKnowledge(actualQuestion, persona),
      loadFullJournal(),
      loadLatestEphemeralAttachment(),
      loadPersistentAttachments()
    ]);
    
    console.log('✅ All Call 1 components loaded');
    
    // Build Call 1 payload with all 9 components
    const streamingConfig = {
      stream: true,
      model: model,
      max_completion_tokens: model.startsWith('gpt-5') || model.startsWith('gpt-4.1') || model.startsWith('o3') || model.startsWith('o4') ? 4000 : undefined,
      max_tokens: !model.startsWith('gpt-5') && !model.startsWith('gpt-4.1') && !model.startsWith('o3') && !model.startsWith('o4') ? 4000 : undefined,
      temperature: !model.startsWith('gpt-5') && !model.startsWith('gpt-4.1') && !model.startsWith('o3') && !model.startsWith('o4') ? 0.7 : undefined
    };

    // Capture user question
    const actualQuestion = messages[messages.length - 1]?.content || '';
    
    // Assemble the 9 components according to specification
    const call1SystemContent = `[1] TURN-PROTOCOL INSTRUCTIONS:
${turnProtocol}

[2] BOSS PROFILE:
${bossProfile}

[3] ACTIVE PERSONA PROFILE:
${personaProfile}

[3.5] RELEVANT KNOWLEDGE FROM PREVIOUS CONVERSATIONS:
${knowledgeContext}

[4] MODEL NAME:
${model}

[5] FULL JOURNAL TABLE:
${fullJournal}

[6] LATEST EPHEMERAL ATTACHMENT:
${latestEphemeralAttachment}

[7] FULL PERSISTENT ATTACHMENTS:
${persistentAttachments}

[8] STREAMING CONFIG:
${JSON.stringify(streamingConfig, null, 2)}

[9] ACTUAL QUESTION FROM BOSS:
${actualQuestion}`;
    
    const chatMessages: ChatMessage[] = [
      {
        role: 'system',
        content: call1SystemContent
      },
      ...messages
    ];

    // Capture user message for Call 2
    const userMessage = messages[messages.length - 1]?.content || '';
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
                console.log('📋 Full AI Response length:', fullAIResponse.length);
                console.log('📋 User message:', userMessage.substring(0, 100));
                console.log('📋 Persona:', persona);
                console.log('📋 Turn ID:', conversationTurnId);
                // Use EdgeRuntime.waitUntil for proper background task processing
                EdgeRuntime.waitUntil(
                  processArtisanCut(conversationTurnId, userMessage, fullAIResponse, persona).catch(error => {
                    console.error('❌ Background artisan cut failed:', error);
                  })
                );
              } else {
                console.log('⚠️ No AI response to process for artisan cut');
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
        console.log('🔥 CALL 2: User message length:', userMsg.length);
        console.log('🔥 CALL 2: AI response length:', aiResponse.length);
        console.log('🔥 CALL 2: Persona:', persona);
        
        // Load artisan cut instructions from database
        console.log('📋 Loading artisan cut instructions...');
        const artisanInstructions = await loadArtisanCutInstructions();
        console.log('📋 Artisan instructions loaded, length:', artisanInstructions.length);
        
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
        console.log('🤖 CALL 2: Messages prepared, calling OpenAI...');
        
        // Call 2: Non-streaming call for artisan cut
        const artisanResponse = await callOpenAI('gpt-5-2025-08-07', call2Messages, false);
        console.log('🤖 CALL 2: OpenAI response received');
        const artisanCut = artisanResponse.choices[0]?.message?.content || '';
        console.log('🤖 CALL 2: Artisan cut content:', artisanCut.substring(0, 200));
        
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

          console.log('📝 CALL 2: Parsed - Boss input:', bossInput);
          console.log('📝 CALL 2: Parsed - Persona response:', personaResponse);

          // Save to journal_entries in Supabase
          const journalEntry: JournalEntry = {
            id: turnId, // Same ID as superjournal for linking
            timestamp: new Date().toISOString(),
            bossInput: bossInput || userMsg.substring(0, 50), // Fallback to truncated user message
            personaResponse: personaResponse || artisanCut.trim(),
            persona: persona // Pass the actual persona name
          };

          console.log('💾 CALL 2: Saving journal entry:', journalEntry.id);
          await saveJournalEntry(journalEntry);
          console.log('💾 CALL 2: Saved journal entry:', turnId);
          
        } else {
          console.warn('⚠️ CALL 2: No artisan cut generated');
        }
        
      } catch (error) {
        console.error('❌ CALL 2: Error in artisan cut processing:', error);
        console.error('❌ CALL 2: Error stack:', error.stack);
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