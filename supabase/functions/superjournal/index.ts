import "https:
import { serve } from "https:
import { createClient } from 'https:
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
interface JournalEntry {
  id: string;
  timestamp: string;
  userMessage: {
    content: string;
    persona: string;
    attachments?: any[];
  };
  aiResponse: {
    content: string;
    persona: string;
    model: string;
  };
}
async function appendToSuperjournal(entry: JournalEntry) {
  try {
    console.log('💾 Saving entry to superjournal DB:', entry.id);
    const { error } = await supabase
      .from('superjournal_entries')
      .insert({
        entry_id: entry.id,
        timestamp: entry.timestamp,
        user_message_content: entry.userMessage.content,
        user_message_persona: entry.userMessage.persona,
        user_message_attachments: entry.userMessage.attachments || [],
        ai_response_content: entry.aiResponse.content,
        ai_response_persona: entry.aiResponse.persona,
        ai_response_model: entry.aiResponse.model
      });
    if (error) {
      throw new Error(`Failed to save to database: ${error.message}`);
    }
    console.log('✅ Journal entry saved to Supabase');
    return { success: true };
  } catch (error) {
    console.error('❌ Error saving to superjournal DB:', error);
    throw error;
  }
}
async function loadSuperjournal(): Promise<JournalEntry[]> {
  try {
    console.log('📖 Loading superjournal from Supabase...');
    const { data: entries, error } = await supabase
      .from('superjournal_entries')
      .select('*')
      .order('timestamp', { ascending: true });
    if (error) {
      throw new Error(`Failed to load from database: ${error.message}`);
    }
    const journalEntries: JournalEntry[] = (entries || []).map(entry => ({
      id: entry.entry_id,
      timestamp: entry.timestamp,
      userMessage: {
        content: entry.user_message_content,
        persona: entry.user_message_persona,
        attachments: entry.user_message_attachments
      },
      aiResponse: {
        content: entry.ai_response_content,
        persona: entry.ai_response_persona,
        model: entry.ai_response_model
      }
    }));
    console.log(`📋 Found ${journalEntries.length} superjournal entries in DB`);
    return journalEntries;
  } catch (error) {
    console.error('❌ Error loading from DB, starting fresh:', error);
    return [];
  }
}
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    if (req.method === 'POST' && action === 'append') {
      const entry: JournalEntry = await req.json();
      console.log('📝 Appending journal entry:', entry.id, 'user content:', entry.userMessage.content.substring(0, 50));
      await appendToSuperjournal(entry);
      console.log('✅ Successfully appended journal entry:', entry.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (req.method === 'GET' && action === 'load') {
      console.log('📖 Loading superjournal...');
      const entries = await loadSuperjournal();
      console.log(`📋 Found ${entries.length} superjournal entries`);
      return new Response(JSON.stringify({ entries }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use ?action=append (POST) or ?action=load (GET)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Request error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});