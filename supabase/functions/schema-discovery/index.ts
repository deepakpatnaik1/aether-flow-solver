// Edge function to discover the actual database schema
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Starting schema discovery...');
    const results: any[] = [];

    // Test 1: Try journal_entries with minimal data
    try {
      console.log('Testing journal_entries insert...');

      const { data, error } = await supabase
        .from('journal_entries')
        .insert({ test: 'value' })
        .select();

      results.push({
        test: 'journal_entries_minimal',
        success: !error,
        error: error?.message,
        data: data
      });
    } catch (e) {
      results.push({
        test: 'journal_entries_minimal',
        success: false,
        error: e.message
      });
    }

    // Test 2: Try different column names
    const columnsToTry = ['content', 'text', 'message', 'data', 'entry'];

    for (const col of columnsToTry) {
      try {
        const testData = { [col]: 'test value' };

        const { data, error } = await supabase
          .from('journal_entries')
          .insert(testData)
          .select();

        results.push({
          test: `journal_entries_${col}`,
          success: !error,
          error: error?.message,
          data: data
        });

        if (!error) {
          console.log(`✅ SUCCESS: journal_entries accepts column: ${col}`);
          break; // Stop on first success
        }
      } catch (e) {
        results.push({
          test: `journal_entries_${col}`,
          success: false,
          error: e.message
        });
      }
    }

    // Test 3: Check what tables actually exist
    const tablesToCheck = ['journal_entries', 'personas', 'processes', 'conversations', 'chat_messages'];

    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        results.push({
          test: `table_${table}`,
          success: !error,
          error: error?.message,
          exists: !error,
          sampleData: data?.[0] ? Object.keys(data[0]) : null
        });
      } catch (e) {
        results.push({
          test: `table_${table}`,
          success: false,
          error: e.message,
          exists: false
        });
      }
    }

    console.log('🏁 Schema discovery complete');

    return new Response(JSON.stringify({
      success: true,
      results: results,
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Schema discovery error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});