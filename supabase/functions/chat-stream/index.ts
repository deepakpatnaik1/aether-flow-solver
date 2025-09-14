import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { messages, model = 'gpt-5-2025-08-07' } = await req.json();
    console.log('Received request:', { messagesCount: messages?.length, model });

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    // Use the correct parameter for GPT-5 models
    const requestBody: any = {
      model: model,
      messages: messages,
      max_completion_tokens: 2000,
    };

    // Only add temperature for legacy models
    if (model === 'gpt-4o' || model === 'gpt-4o-mini') {
      requestBody.temperature = 0.7;
      requestBody.max_tokens = 2000; // Use max_tokens for legacy models
      delete requestBody.max_completion_tokens;
    }

    console.log('Calling OpenAI API with model:', model);

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
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI API response received successfully');

    const content = data.choices?.[0]?.message?.content || 'No response generated';

    return new Response(JSON.stringify({ response: content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});