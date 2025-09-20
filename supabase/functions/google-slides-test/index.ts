import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Google Slides TEST function started');
    
    const requestBody = await req.json();
    console.log('📋 Request body received:', requestBody);
    
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    console.log('🔑 Google API Key exists:', !!googleApiKey);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    console.log('🔑 Supabase config exists:', !!supabaseUrl, !!supabaseServiceKey);
    
    // Simple test response
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Test function working!',
      hasGoogleApiKey: !!googleApiKey,
      hasSupabaseConfig: !!(supabaseUrl && supabaseServiceKey)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Test function error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});