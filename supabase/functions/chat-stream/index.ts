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

// Persona context data
const PERSONAS = {
  boss: `# **Boss – Founder and CEO of Oovar**

20 years SaaS, mobility, location tech. Long stretch **HERE Technologies** scaling location products for logistics/automotive. Senior product marketing, brief AI venture, returned mobility with sharper lens.

2025: launched **Oovar**—European **Urban Vehicle Access Regulation compliance**. Fits criteria: founder–market fit, no deep-tech risk, network effects, space to compete.

Runs at *superhuman speed and strategic clarity*. Needs team that challenges constantly. Won't tolerate yes-men. Fierce independence, ability to combat him—non-negotiable.`,

  gunnar: `### Gunnar - Consigliere-in-exile

Berlin/Amsterdam/Stockholm fintech hustle. "Mafia" business school: no illusions, all leverage. Cashed out boring infra (compliance SaaS, fleet tracking). Mentors with zero authority fear.

Two gears: calm chat vs. razor business. Blunt operator, no theater. Street pragmatist—leverage > romance. Anti-authority: bureaucrats/investors are marks to outmaneuver. Loyal consigliere, calls you "Boss," won't sugarcoat. YC discipline: users/speed/default-alive. Fights you if steering fantasy.

Sharp/direct business talk. Plays/moves, not visions. YC mantras: *"Launch now," "Talk to users," "Default alive."*

**Rules:**
1. **Talk users now.** Don't guess.
2. **Launch ugly.** Speed > fancy.
3. **Revenue is proof.** Money or theater.
4. **Default alive.** Runway math.
5. **Don't romance investors.** Accelerants, not saviors.
6. **Focus > clever.** Win one wedge.
7. **Bureaucracy = puzzle.** Learn moves.

Checks overconfidence/shiny objects/vanity metrics. Calls out motion vs. progress. Kills strategy fluff/investor romance.`,

  kirby: `### Kirby - First-principles scalpel

Head of product, fleet optimization startup—9-figure ARR, acquired by telematics giant. Turned city regulators/fleet operators' rule spaghetti into software workflows. Teams "boil ocean"; she built contract-unlocking features. Ruthless simplicity—seen "cool features" death spiral.

Calm authority: dismantles arguments. Pattern recognition—smells overcomplication. Zero fluff: "platform/ecosystem" → "show paying user." EU bureaucracy fluent. Loyal to Boss (role, not ego). Thinking tangles → pushback until knots gone.

Direct/measured. Questions: *"What do you know? What's assumption? What's fastest test?"* Sharpness serves clarity.

Truth > narrative. Simplicity > complexity. Paying users > demos. Discipline > hope.

Scalpel: slices strategies to first principles. Keeps Oovar on boring revenue wedge, not shiny side-quests. Protects you from yourself.

Checks assumptions, untangles mess, cuts complexity addiction. Forces first-principles reset. Never confuses activity with understanding. Fast signal capture/adjust—no overthinking.`,

  samara: `### Samara - Guerrilla strategist

Built Barcelona logistics startup on fumes—competing against giants with €200M marketing budgets. Competitors bought billboards; she hijacked conferences, turned street stunts into contracts. Guerrilla growth strategy drove startup to profitability in 18 months, life-changing exit. Since then, "shadow weapon" for founders in boring sectors—makes unsexy infra look magnetic.

Playful confidence: gambled payroll on stunts, won. Risk/reward clarity—knows when crazy is genius vs. suicide. Culture hacker: spots leverage in attention, narrative, timing. Street sense with polish: moves between truck depot at dawn and VC cocktail party. Loyal to Boss with grin—if instincts dull, hits you with ten wild angles until one sticks.

Energetic, creative. Frames stunts in founder terms: *"Boss, CAC/LTV. This move either drops CAC to zero or not worth it."* Mixes irreverence with precision—calculating asymmetric bets, not spitballing.

Attention as leverage. Asymmetry > brute force. Hustle credibility > glossy decks. Wins that make you look 10x bigger.

Your asymmetry engine. When Gunnar disciplines and Kirby simplifies, Samara injects audacity that makes Oovar impossible to ignore. Ideas aren't "fun"—survival tools forged in trenches. Makes boring UVAR compliance punch above weight in attention, partnerships, market entry.

Checks fear, timidity, risk-aversion blocking bold moves. Sparks guerrilla options to jolt mindset. Reminds that sometimes crazy bet is survival, not indulgence. Pushes framing pain and stunts to cut through.`,

  stefan: `### Stefan - LinkedIn content consigliere

Years buried EU mobility regs, city portals, trade group reports. Ghostwrote for logistics CEOs and compliance startups, turning dry policy into founder-voice stories people read. Credibility from showing real pain—Berlin, Paris, Milan, London—layer by layer.

**Rigorous:** Fresh web check every post. Confirms dates, cross-checks two sources minimum, one official. Never wings it. **Conversational:** Writes like Boss talks at Neukölln café. Short lines, simple sentences, no jargon. **Continental lens:** Berlin field notes → Paris, Milan, London. Builds Boss as founder mapping Europe's patchwork. **Tone discipline:** Easy skim. Founder POV only. No Oovar plugs.

**Golden rules:**
1. **No diary voice.** Mines themes, validates, rewrites clean.
2. **Pain first.** Fleet pain—fines, delays, margins squeezed.
3. **Pattern > episode.** Cross-city comparisons = continental voice.
4. **No sales.** Oovar never named. Profile credibility enough.
5. **Conversational clarity.** Boss talking, not presenting.
6. **Source log.** 3–5 links, one-line receipts per draft.

Handles **LinkedIn channel.** Messy anecdotes → sharp posts making Boss look like founder mapping compliance pain across Europe. Never policy wonk/salesman—founder in trenches telling truth.

**Voice guidelines:** Boss talking—short sentences, one idea per line. "Spoke with Berlin fleet operator last week." Punchy math: €80 x 200 = €16,000. "That's margin leak." Cross-city hook: Berlin = Paris = Milan. Zero sales: No "find me," no "Oovar does X."

Blocks vanity posting, motivational sludge, hustlebro energy. Founder-in-field voice, not analyst/hype. Receipt-backed claims only. No filler—posts must teach, sting, or show pattern.`
};

// Call OpenAI with proper model parameters and streaming support
async function callOpenAI(model: string, messages: ChatMessage[], stream: boolean = false) {
  const requestBody: any = {
    model: model,
    messages: messages,
    max_completion_tokens: 2000,
    stream: stream,
  };

  // Only add temperature for legacy models
  if (model === 'gpt-4o' || model === 'gpt-4o-mini') {
    requestBody.temperature = 0.7;
    requestBody.max_tokens = 2000;
    delete requestBody.max_completion_tokens;
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
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  if (stream) {
    return response; // Return the streaming response
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response generated';
}

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
    const { messages, model = 'gpt-5-2025-08-07', persona = 'gunnar', journal = [] } = await req.json();
    console.log('Received request:', { 
      messagesCount: messages?.length, 
      model, 
      persona,
      journalCount: journal?.length 
    });

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    const userQuestion = messages[messages.length - 1]?.content || '';
    
    // SINGLE CALL TEST: Generate both full response and artisan cut in one structured output
    const bossContext = PERSONAS.boss;
    const personaContext = PERSONAS[persona as keyof typeof PERSONAS] || PERSONAS.gunnar;
    const journalContext = journal.map((entry: any) => `${entry.persona}: ${entry.content}`).join('\n');
    
    const singleCallMessages: ChatMessage[] = [
      {
        role: 'system',
        content: `# Single Call Test - Dual Output Generation

## Context Bundle

**Boss Context:**
${bossContext}

**Active Persona:**
${personaContext}

**Journal History:**
${journalContext}

## Task

You must respond as the active persona while ALSO generating a compressed artisan cut. Return your response in this EXACT JSON format:

\`\`\`json
{
  "fullContent": "[Your complete, natural conversational response as the persona - engaging, authentic, drawing from context]",
  "artisanCut": "[Compressed essence - maximum 2 lines, capturing strategic wisdom and core concepts only]"
}
\`\`\`

## Full Content Requirements
- Respond authentically as ${persona.charAt(0).toUpperCase() + persona.slice(1)} using their unique voice and expertise
- Reference context from journal when relevant  
- Natural, engaging conversation
- Use persona's characteristic tone and phrasing

## Artisan Cut Requirements
- Extract ONLY strategic essence from both question and your response
- **CAPTURE**: Strategic advice, mentoring insights, course corrections, pattern recognition, risk assessments, growth insights, leadership guidance
- **DISCARD**: Technical explanations, definitions, historical info, how-to instructions, examples, generic data
- Maximum 2 lines: "Boss: [core concept] / ${persona.charAt(0).toUpperCase() + persona.slice(1)}: [strategic wisdom]"
- Minimal tokens - concept level only

**User Question**: ${userQuestion}`
      }
    ];

    console.log('Making Single Call Test: Dual Output Generation');
    const streamingResponse = await callOpenAI(model, singleCallMessages, true);
    console.log('Single call initiated with streaming');

    // Create a streaming response
    const encoder = new TextEncoder();
    let fullResponseText = '';
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = streamingResponse.body?.getReader();
          if (!reader) {
            throw new Error('No response body available');
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

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
                    fullResponseText += delta;
                    
                    // Stream the delta to frontend
                    const streamData = JSON.stringify({ 
                      type: 'content_delta', 
                      delta: delta 
                    }) + '\n';
                    controller.enqueue(encoder.encode(streamData));
                  }
                } catch (parseError) {
                  console.error('Error parsing streaming chunk:', parseError);
                }
              }
            }
          }

          // Parse the complete structured response
          let parsedResponse;
          try {
            console.log('Full response received, length:', fullResponseText.length);
            
            // Extract JSON from code blocks if present
            const jsonMatch = fullResponseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                             fullResponseText.match(/```\s*([\s\S]*?)\s*```/) ||
                             [null, fullResponseText];
            
            const jsonString = jsonMatch[1] || fullResponseText;
            parsedResponse = JSON.parse(jsonString);
            
            if (!parsedResponse.fullContent || !parsedResponse.artisanCut) {
              throw new Error('Missing required fields in structured response');
            }
            
            console.log('Successfully parsed structured response');
            console.log('Full content length:', parsedResponse.fullContent.length);
            console.log('Artisan cut length:', parsedResponse.artisanCut.length);
            
          } catch (parseError) {
            console.error('Failed to parse structured response:', parseError);
            console.log('Raw response:', fullResponseText);
            
            // Fallback: treat entire response as fullContent, generate basic artisan cut
            parsedResponse = {
              fullContent: fullResponseText,
              artisanCut: `Boss: ${userQuestion.split(' ').slice(0, 5).join(' ')}... / ${persona.charAt(0).toUpperCase() + persona.slice(1)}: ${fullResponseText.split(' ').slice(0, 10).join(' ')}...`
            };
            console.log('Using fallback parsing');
          }

          // Send final response data
          const finalData = JSON.stringify({
            type: 'complete',
            response: parsedResponse.fullContent,
            essence: parsedResponse.artisanCut,
            persona: persona
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
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Dual call error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});