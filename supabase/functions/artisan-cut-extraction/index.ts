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

// Load artisan cut rules from processes table
async function loadArtisanCutRules(): Promise<string> {
  try {
    const { data: process, error } = await supabase
      .from('processes')
      .select('content')
      .eq('name', 'artisan-cut-extraction')
      .single();

    if (error) {
      console.log('ℹ️ No artisan cut process found, using default rules');
      return DEFAULT_ARTISAN_CUT_RULES;
    }

    return process?.content || DEFAULT_ARTISAN_CUT_RULES;
  } catch (error) {
    console.error('❌ Error loading artisan cut rules:', error);
    return DEFAULT_ARTISAN_CUT_RULES;
  }
}

const DEFAULT_ARTISAN_CUT_RULES = `
# Artisan Cut Extraction Rules

Extract essence ONLY from the question-response pair.

## Boss Input Processing
CAPTURE: Decision points, emotional states, strategic questions, business updates, learning moments, fears/concerns, goals, resource needs, market insights, financial decisions
DISCARD: Greetings, politeness fillers, grammar padding, conversational connectors, confirmations

## Persona Response Processing
CAPTURE: Strategic advice, mentoring insights, course corrections, pattern recognition, framework applications, risk assessments, growth insights, leadership guidance, market observations, founder psychology
DISCARD: Technical explanations, definitions, historical info, how-to instructions, code examples, generic market data, process descriptions, tool comparisons

## Output Format
Boss: [essence of user question - core concept without fillers]
[Persona]: [essence of strategic wisdom with key details and persona attribution]

Maximum 2 lines output. Minimal tokens - concept level only.
`;

const callOpenAI = async (messages: ChatMessage[]) => {
  console.log('🔍 About to call OpenAI with model: gpt-5-mini-2025-08-07');
  console.log('🔍 Message count:', messages.length);
  
  const requestBody = {
    model: 'gpt-5-mini-2025-08-07', // Fast model for extraction
    messages,
    max_completion_tokens: 200 // Keep it short
    // No temperature parameter - GPT-5 models don't support it
  };

  console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log('📥 OpenAI response status:', response.status);
  console.log('📥 OpenAI response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log('📥 Full OpenAI result:', JSON.stringify(result, null, 2));
  return result;
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
    const startTime = performance.now();
    const { userQuestion, personaResponse, entryId, userPersona, aiPersona, model } = await req.json();
    
    console.log('🔍 Call 2 - Artisan Cut Extraction:', { 
      entryId, 
      userPersona, 
      aiPersona,
      userQuestionLength: userQuestion?.length,
      personaResponseLength: personaResponse?.length
    });

    if (!userQuestion || !personaResponse || !entryId) {
      throw new Error('Missing required fields: userQuestion, personaResponse, entryId');
    }

    // Load artisan cut rules
    const artisanCutRules = await loadArtisanCutRules();
    
    // Build focused system message
    const systemMessage = `Extract key insights from this conversation in exactly 2 lines:

Line 1: Boss: [core question/concern from user]
Line 2: ${aiPersona}: [key insight/advice from response]

Be extremely concise. Each line under 100 characters.`;

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: `User: ${userQuestion}

AI: ${personaResponse}

Extract 2 lines as specified above.`
      }
    ];

    console.log('🚀 Calling OpenAI for artisan cut extraction...');
    console.log('📤 Sending to OpenAI:', JSON.stringify(messages, null, 2));
    
    const openaiResponse = await callOpenAI(messages);
    console.log('📥 Full OpenAI response:', JSON.stringify(openaiResponse, null, 2));
    
    const extractedEssence = openaiResponse.choices?.[0]?.message?.content?.trim() || '';

    console.log('✨ Extracted essence (raw):', extractedEssence);
    console.log('✨ Extracted essence length:', extractedEssence.length);
    console.log('✨ Extracted essence type:', typeof extractedEssence);
    
    if (!extractedEssence) {
      console.error('❌ OpenAI returned empty content');
      console.log('🔍 Response structure:', {
        choices: openaiResponse.choices?.length || 'undefined',
        firstChoice: openaiResponse.choices?.[0] || 'undefined',
        message: openaiResponse.choices?.[0]?.message || 'undefined',
        content: openaiResponse.choices?.[0]?.message?.content || 'undefined'
      });
      
      // Try to use the original input as fallback
      console.log('🔄 Using input as fallback since OpenAI returned nothing');
      const fallbackBoss = userQuestion;
      const fallbackPersona = personaResponse.length > 200 ? personaResponse.substring(0, 200) + '...' : personaResponse;
      
      const { error: journalError } = await supabase
        .from('journal_entries')
        .insert({
          entry_id: entryId,
          timestamp: new Date(new Date().getTime() + (2 * 60 * 60 * 1000)).toISOString(),
          user_message_content: fallbackBoss,
          user_message_persona: userPersona,
          ai_response_content: fallbackPersona,
          ai_response_persona: aiPersona,
          ai_response_model: model,
          user_message_attachments: []
        });

      if (journalError) {
        console.error('❌ Error saving fallback to journal:', journalError);
        throw new Error(`Failed to save fallback: ${journalError.message}`);
      }

      const totalTime = performance.now() - startTime;
      console.log('✅ Fallback saved in', Math.round(totalTime), 'ms');

      return new Response(JSON.stringify({ 
        success: true,
        entryId,
        extractedEssence: '',
        bossEssence: fallbackBoss,
        personaEssence: fallbackPersona,
        processingTime: Math.round(totalTime),
        usedFallback: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse the essence to separate Boss and Persona parts
    const lines = extractedEssence.split('\n').filter(line => line.trim());
    console.log('📝 Parsed lines:', lines);
    console.log('📝 Raw essence before parsing:', JSON.stringify(extractedEssence));
    
    let bossEssence = '';
    let personaEssence = '';

    // First, try simple line-by-line assignment if we have 2+ lines
    if (lines.length >= 2) {
      bossEssence = lines[0].replace(/^boss:\s*/i, '').trim();
      personaEssence = lines[1].replace(/^(gunnar|samara|kirby|stefan):\s*/i, '').trim();
      console.log('✅ Simple parsing - Boss:', bossEssence, 'Persona:', personaEssence);
    }
    
    // If that didn't work, try more sophisticated parsing
    if (!bossEssence || !personaEssence) {
      for (const line of lines) {
        console.log('🔍 Processing line:', line);
        const trimmedLine = line.trim();
        
        // Look for Boss: or boss: at start of line
        if (trimmedLine.toLowerCase().startsWith('boss:')) {
          bossEssence = trimmedLine.substring(5).trim();
          console.log('👤 Found boss essence:', bossEssence);
        } 
        // Look for any persona name followed by colon
        else if (trimmedLine.toLowerCase().includes('gunnar:') || 
                 trimmedLine.toLowerCase().includes('samara:') ||
                 trimmedLine.toLowerCase().includes('kirby:') ||
                 trimmedLine.toLowerCase().includes('stefan:')) {
          personaEssence = trimmedLine.trim();
          console.log('🤖 Found persona essence:', personaEssence);
        }
      }
    }

    console.log('📊 After parsing - Boss:', bossEssence, 'Persona:', personaEssence);

    // Ultimate fallback - use the entire response if we have something
    if ((!bossEssence || !personaEssence) && extractedEssence.trim()) {
      console.log('⚠️ Using ultimate fallback');
      if (!bossEssence) {
        bossEssence = userQuestion;
        console.log('🔄 Using full user question as boss essence');
      }
      if (!personaEssence) {
        personaEssence = extractedEssence.trim();
        console.log('🔄 Using full extracted essence as persona essence');
      }
    }

    console.log('🎯 Final essences - Boss:', bossEssence, 'Persona:', personaEssence);

    // Only save if we have proper extracted content
    if (!bossEssence || !personaEssence) {
      console.error('❌ Artisan cut extraction failed - not saving empty content');
      throw new Error('Failed to extract essence from conversation');
    }

    // Save artisan cut to journal_entries
    const { error: journalError } = await supabase
      .from('journal_entries')
      .insert({
        entry_id: entryId,
        timestamp: new Date(new Date().getTime() + (2 * 60 * 60 * 1000)).toISOString(), // Berlin time (UTC+2)
        user_message_content: bossEssence,
        user_message_persona: userPersona,
        ai_response_content: personaEssence,
        ai_response_persona: aiPersona,
        ai_response_model: model,
        user_message_attachments: []
      });

    if (journalError) {
      console.error('❌ Error saving artisan cut to journal:', journalError);
      throw new Error(`Failed to save artisan cut: ${journalError.message}`);
    }

    const totalTime = performance.now() - startTime;
    console.log('✅ Call 2 complete in', Math.round(totalTime), 'ms - Artisan cut saved to journal_entries');

    return new Response(JSON.stringify({ 
      success: true,
      entryId,
      extractedEssence,
      bossEssence,
      personaEssence,
      processingTime: Math.round(totalTime)
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