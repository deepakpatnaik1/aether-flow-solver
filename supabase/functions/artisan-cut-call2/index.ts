import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ArtisanCutResponse {
  boss_essence: string;
  persona_name: 'gunnar' | 'samara' | 'kirby' | 'stefan';
  persona_essence: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function loadArtisanCutProcess(): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('processes')
      .download('artisan-cut-extraction.txt');
    
    if (error || !data) {
      console.log('ℹ️ No artisan cut process found, using default');
      return getDefaultProcess();
    }
    
    const content = await data.text();
    return content || getDefaultProcess();
  } catch (error) {
    console.error('❌ Error loading artisan cut process:', error);
    return getDefaultProcess();
  }
}

function getDefaultProcess(): string {
  return `Extract and preserve the essence of each exchange between Boss and the personas. Output ONLY a JSON object with this structure:
{
  "boss_essence": "[The actual essence of what Boss said or asked, preserving their voice]",
  "persona_name": "[Exact name: gunnar, samara, kirby, or stefan]", 
  "persona_essence": "[The core wisdom/response from the persona, preserving their distinctive style]"
}`;
}

const callOpenAI = async (model: string, messages: ChatMessage[]): Promise<ArtisanCutResponse> => {
  const requestBody: any = {
    model,
    messages,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "artisan_cut_extraction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            boss_essence: {
              type: "string",
              description: "The actual essence of what Boss said or asked, preserving their voice"
            },
            persona_name: {
              type: "string",
              enum: ["gunnar", "samara", "kirby", "stefan"],
              description: "Name of the AI persona (lowercase)"
            },
            persona_essence: {
              type: "string", 
              description: "The core wisdom/response from the persona, preserving their distinctive style"
            }
          },
          required: ["boss_essence", "persona_name", "persona_essence"],
          additionalProperties: false
        }
      }
    }
  };

  // Handle model-specific parameters
  if (model.startsWith('gpt-5') || model.startsWith('gpt-4.1') || model.startsWith('o3') || model.startsWith('o4')) {
    requestBody.max_completion_tokens = 4000;
  } else {
    requestBody.max_tokens = 4000;
    requestBody.temperature = 0.1;
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

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content received from OpenAI');
  }

  try {
    return JSON.parse(content) as ArtisanCutResponse;
  } catch (parseError) {
    console.error('❌ Failed to parse OpenAI response as JSON:', parseError);
    console.error('Raw content:', content);
    throw new Error('OpenAI returned invalid JSON despite structured output');
  }
};

serve(async (req) => {
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
    
    const { 
      entryId,
      userId, 
      userInput, 
      personaResponse,
      userPersona = 'Boss',
      aiPersona,
      model = 'gpt-4o-mini'
    } = await req.json();

    console.log('🔍 Call 2 - Artisan Cut Processing (Structured):', {
      entryId,
      userId,
      userPersona,
      aiPersona,
      userInputLength: userInput?.length || 0,
      personaResponseLength: personaResponse?.length || 0,
      model
    });

    if (!userInput || !personaResponse || !aiPersona) {
      throw new Error('User input, persona response, and AI persona are required');
    }

    const artisanCutProcess = await loadArtisanCutProcess();

    const chatMessages: ChatMessage[] = [
      {
        role: 'system',
        content: artisanCutProcess
      },
      {
        role: 'user',
        content: `Boss Input: ${userInput}\n\nPersona Response (${aiPersona}): ${personaResponse}`
      }
    ];

    console.log('🚀 Calling OpenAI with Structured Outputs...');
    const extractedData = await callOpenAI(model, chatMessages);
    
    console.log('📥 Structured extraction result:', extractedData);

    // Save to journal_entries with the extracted structured data
    const { data: journalEntry, error: saveError } = await supabase
      .from('journal_entries')
      .insert({
        entry_id: entryId,
        user_id: userId, 
        user_message_content: extractedData.boss_essence,
        user_message_persona: userPersona,
        ai_response_content: extractedData.persona_essence,
        ai_response_persona: extractedData.persona_name,
        ai_response_model: model,
        user_message_attachments: []
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Error saving to journal_entries:', saveError);
      throw new Error(`Failed to save journal entry: ${saveError.message}`);
    }

    const processingTime = performance.now() - requestStartTime;
    console.log('✅ Call 2 complete in', Math.round(processingTime), 'ms - Structured artisan cut saved');

    return new Response(JSON.stringify({ 
      success: true,
      journalEntry,
      extractedData,
      processingTime: Math.round(processingTime)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Call 2 error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});