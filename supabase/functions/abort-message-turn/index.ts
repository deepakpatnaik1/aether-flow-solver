import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

  try {
    const { entryId } = await req.json();
    
    console.log('🗑️ Abort request - Cleaning up entry_id:', entryId);

    if (!entryId) {
      throw new Error('Entry ID is required');
    }

    // Delete from superjournal_entries (aborted messages never reach journal_entries)
    const { error: superjournalError } = await supabase
      .from('superjournal_entries')
      .delete()
      .eq('entry_id', entryId);

    if (superjournalError) {
      console.error('❌ Error deleting from superjournal_entries:', superjournalError);
    } else {
      console.log('✅ Deleted from superjournal_entries');
    }

    // Note: No need to delete from journal_entries since aborted messages never reach Call 2

    // Delete ephemeral attachments associated with this message
    const { error: attachmentError } = await supabase
      .from('ephemeral_attachments')
      .delete()
      .eq('message_id', entryId);

    if (attachmentError) {
      console.error('❌ Error deleting ephemeral attachments:', attachmentError);
    } else {
      console.log('✅ Deleted ephemeral attachments');
    }

    console.log('🎯 Message turn cleanup complete for entry_id:', entryId);

    return new Response(JSON.stringify({ 
      success: true,
      entryId,
      message: 'Message turn aborted and cleaned up successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Abort cleanup error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});