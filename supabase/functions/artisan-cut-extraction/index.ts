import "https:
import { serve } from "https:
import { createClient } from 'https:
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
async function loadArtisanCutRules(): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('processes')
      .download('artisan-cut-extraction.md');
    if (error || !data) {
      console.log('ℹ️ No artisan cut process found, using default rules');
      return DEFAULT_ARTISAN_CUT_RULES;
    }
    const content = await data.text();
    return content || DEFAULT_ARTISAN_CUT_RULES;
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
const callOpenAI = async (messages: ChatMessage[], model: string) => {
  console.log('🔍 About to call OpenAI with model:', model);
  console.log('🔍 Message count:', messages.length);
  const requestBody: any = {
    model,
    messages
  };
  if (model.startsWith('gpt-5') || model.startsWith('gpt-4.1') || model.startsWith('o3') || model.startsWith('o4')) {
    requestBody.max_completion_tokens = 4000;
  } else {
    requestBody.max_tokens = 4000;
    requestBody.temperature = 0.1; 
  }
  console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
  const response = await fetch('https:
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
    const artisanCutRules = await loadArtisanCutRules();
    const systemMessage = `Extract the essence of this conversation into exactly 2 lines:
Line 1: Boss: [core question/concern without greetings or filler]
Line 2: ${aiPersona}: [key strategic insight/advice in their distinct style]
Keep it minimal - capture only the essential business insight.`;
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemMessage
      },
      {
        role: 'user',
        content: `User Question: ${userQuestion}
Persona Response: ${personaResponse}
Extract essence following artisan cut protocol above.`
      }
    ];
    console.log('🚀 Calling OpenAI for artisan cut extraction...');
    console.log('📤 Sending to OpenAI:', JSON.stringify(messages, null, 2));
    const openaiResponse = await callOpenAI(messages, model);
    console.log('📥 Full OpenAI response:', JSON.stringify(openaiResponse, null, 2));
    if (openaiResponse.error) {
      console.error('❌ OpenAI API Error:', openaiResponse.error);
      throw new Error(`OpenAI API Error: ${openaiResponse.error.message || openaiResponse.error}`);
    }
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
      throw new Error('OpenAI returned empty content - artisan cut extraction failed');
    }
    const lines = extractedEssence.split('\n').filter(line => line.trim());
    console.log('📝 Parsed lines:', lines);
    console.log('📝 Raw essence before parsing:', JSON.stringify(extractedEssence));
    let bossEssence = '';
    let personaEssence = '';
    if (lines.length >= 2) {
      bossEssence = lines[0].replace(/^boss:\s*/i, '').trim();
      personaEssence = lines[1].replace(/^(gunnar|samara|kirby|stefan):\s*/i, '').trim();
      console.log('✅ Simple parsing - Boss:', bossEssence, 'Persona:', personaEssence);
    }
    if (!bossEssence || !personaEssence) {
      for (const line of lines) {
        console.log('🔍 Processing line:', line);
        const trimmedLine = line.trim();
        if (trimmedLine.toLowerCase().startsWith('boss:')) {
          bossEssence = trimmedLine.substring(5).trim();
          console.log('👤 Found boss essence:', bossEssence);
        } 
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
    if (!bossEssence || !personaEssence) {
      console.error('❌ Artisan cut extraction failed - not saving empty content');
      throw new Error('Failed to extract essence from conversation');
    }
    const { error: journalError } = await supabase
      .from('journal_entries')
      .insert({
        entry_id: entryId,
        timestamp: new Date(new Date().getTime() + (2 * 60 * 60 * 1000)).toISOString(), 
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