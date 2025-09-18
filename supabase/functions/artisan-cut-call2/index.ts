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

// Load artisan cut process from processes bucket
async function loadArtisanCutProcess(): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('processes')
      .download('artisan-cut-extraction.txt');

    if (error || !data) {
      console.log('ℹ️ No artisan cut process found');
      return 'Extract the essence of this conversation into a concise, strategic insight.';
    }

    const content = await data.text();
    return content || 'Extract the essence of this conversation into a concise, strategic insight.';
  } catch (error) {
    console.error('❌ Error loading artisan cut process:', error);
    return 'Extract the essence of this conversation into a concise, strategic insight.';
  }
}

const callOpenAI = async (model: string, messages: ChatMessage[]) => {
  const requestBody: any = {
    model,
    messages,
    stream: false // Call 2 is not streamed
  };

  // Handle different model parameters
  if (model.startsWith('gpt-5') || model.startsWith('gpt-4.1') || model.startsWith('o3') || model.startsWith('o4')) {
    requestBody.max_completion_tokens = 4000;
  } else {
    requestBody.max_tokens = 4000;
    requestBody.temperature = 0.1; // Lower temperature for processing
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

  return await response.json();
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
    const { 
      entryId,
      userId, // Add userId parameter  
      userInput, 
      personaResponse,
      userPersona = 'Boss',
      aiPersona,
      model = 'gpt-4o-mini'
    } = await req.json();

    console.log('🔍 Call 2 - Artisan Cut Processing:', {
      entryId,
      userId,
      userPersona,
      aiPersona,
      userInputLength: userInput?.length || 0,
      personaResponseLength: personaResponse?.length || 0
    });

    if (!userInput || !personaResponse) {
      throw new Error('User input and persona response are required');
    }

    // Load artisan cut processing instructions
    const artisanCutProcess = await loadArtisanCutProcess();
    
    // Build Call 2 messages
    const chatMessages: ChatMessage[] = [
      {
        role: 'system',
        content: artisanCutProcess
      },
      {
        role: 'user',
        content: `User Question: ${userInput}\n\nPersona Response: ${personaResponse}\n\nExtract essence following artisan cut protocol above.`
      }
    ];

    console.log('🚀 Calling OpenAI for artisan cut processing...');
    console.log('📤 Sending to OpenAI:', JSON.stringify(chatMessages, null, 2));
    
    const openAIResponse = await callOpenAI(model, chatMessages);
    console.log('📥 OpenAI response:', JSON.stringify(openAIResponse, null, 2));

    const processedContent = openAIResponse.choices?.[0]?.message?.content;
    
    if (!processedContent) {
      throw new Error('No content received from OpenAI');
    }

    // Parse the artisan cut essence - extract Boss and Persona parts
    const lines = processedContent.trim().split('\n').filter(line => line.trim());
    let bossEssence = '';
    let personaEssence = '';
    
    for (const line of lines) {
      if (line.startsWith('Boss: ')) {
        bossEssence = line.replace('Boss: ', '').trim();
      } else if (line.includes(': ')) {
        // Extract persona essence (format: "PersonaName: content")
        const colonIndex = line.indexOf(': ');
        if (colonIndex > 0) {
          personaEssence = line.substring(colonIndex + 2).trim();
        }
      }
    }

    // Fallback if parsing fails - use the full processed content
    if (!bossEssence && !personaEssence) {
      bossEssence = userInput;
      personaEssence = processedContent;
    }

    // Save only the artisan cut essence to journal_entries table
    const { data: journalEntry, error: saveError } = await supabase
      .from('journal_entries')
      .insert({
        entry_id: entryId,
        user_id: userId, // Add user ID for RLS
        user_message_content: bossEssence || processedContent,
        user_message_persona: userPersona,
        ai_response_content: personaEssence || processedContent,
        ai_response_persona: aiPersona,
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
    console.log('✅ Call 2 complete in', Math.round(processingTime), 'ms - Artisan cut saved to journal_entries');

    return new Response(JSON.stringify({ 
      success: true,
      journalEntry,
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