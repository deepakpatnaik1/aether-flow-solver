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
    console.log('google-auth-url function called');
    
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    console.log('Client ID found:', clientId ? 'Yes' : 'No');
    
    if (!clientId) {
      console.error('Google Client ID not configured');
      throw new Error('Google Client ID not configured');
    }

    const redirectUri = `https://suncgglbheilkeimwuxt.supabase.co/functions/v1/google-oauth`;
    console.log('Redirect URI:', redirectUri);
    
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/presentations',
      'https://www.googleapis.com/auth/drive.file',
      'email',
      'profile'
    ].join(' ');

    const state = crypto.randomUUID();
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${encodeURIComponent(state)}`;

    console.log('Generated auth URL:', authUrl);

    return new Response(JSON.stringify({
      authUrl,
      state,
      clientId: clientId.substring(0, 10) + '...', // Show partial for verification
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in google-auth-url function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});