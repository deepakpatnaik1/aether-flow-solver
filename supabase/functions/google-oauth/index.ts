import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Google OAuth callback called with method:', req.method);
    console.log('Request URL:', req.url);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse query parameters from URL
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    
    console.log('OAuth parameters:', { code: code ? 'present' : 'missing', state: state ? 'present' : 'missing', error });
    
    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }
    
    if (!code) {
      throw new Error('Authorization code is required');
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = `https://suncgglbheilkeimwuxt.supabase.co/functions/v1/google-oauth`;
    
    console.log('Using redirect URI:', redirectUri);

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    const userInfo = await userInfoResponse.json();

    // SECURITY FIX: Store tokens using secure function instead of direct table access
    const storeResult = await supabaseClient.rpc('store_google_tokens', {
      p_user_email: userInfo.email,
      p_access_token: tokens.access_token,
      p_refresh_token: tokens.refresh_token,
      p_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      p_scope: tokens.scope
    });

    if (storeResult.error) {
      console.error('Database error:', storeResult.error);
      throw new Error('Failed to store tokens');
    }

    console.log('OAuth success, redirecting user back to app');
    
    // Redirect back to the app with success
    const appUrl = 'https://f29e4c08-30c0-496d-946c-bdd3be783b28.lovableproject.com/?auth=success';
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': appUrl,
      },
    });

  } catch (error) {
    console.error('Error in google-oauth function:', error);
    
    // Redirect back to the app with error
    const appUrl = `https://f29e4c08-30c0-496d-946c-bdd3be783b28.lovableproject.com/?auth=error&message=${encodeURIComponent(error.message)}`;
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': appUrl,
      },
    });
  }
});