import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    console.log('🚀 Google OAuth callback function started');
    console.log('📝 Full request URL:', req.url);
    
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log('📋 URL Parameters:', { code: code ? 'present' : 'missing', state: state ? 'present' : 'missing', error });

    if (error) {
      console.error('❌ OAuth error from Google:', error);
      throw new Error(`OAuth error: ${error}`);
    }

    if (!code || !state) {
      console.error('❌ Missing parameters:', { code: !!code, state: !!state });
      throw new Error('Missing authorization code or state');
    }

    console.log('✅ Received authorization code and state');

    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!googleClientId || !googleClientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    const redirectUri = `${supabaseUrl}/functions/v1/google-oauth-callback`;

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Successfully exchanged code for tokens');

    // Store tokens securely in Supabase
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Get the authorized user ID (boss-only application)
    console.log('👤 Looking up authorized user...');
    const { data: user, error: userError } = await supabase.auth.admin.listUsers();
    console.log('👤 User lookup result:', { userCount: user?.users?.length || 0, error: userError });
    
    const authorizedUser = user?.users?.find(u => u.email === 'deepakpatnaik1@gmail.com');
    
    if (!authorizedUser) {
      console.error('❌ Authorized user not found in:', user?.users?.map(u => ({ id: u.id, email: u.email })));
      throw new Error('Authorized user not found');
    }
    
    console.log('✅ Found authorized user:', { id: authorizedUser.id, email: authorizedUser.email });
    
    console.log('💾 Preparing to store tokens for user:', authorizedUser.id);
    
    // First check if user already has tokens and delete them
    const { error: deleteError } = await supabase
      .from('google_tokens')
      .delete()
      .eq('user_id', authorizedUser.id);
    
    if (deleteError) {
      console.log('⚠️ Could not delete existing tokens (might not exist):', deleteError);
    }
    
    const tokenPayload = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      token_type: tokenData.token_type || 'Bearer',
      scope: tokenData.scope,
      user_id: authorizedUser.id
    };
    
    console.log('💾 Inserting tokens with payload:', { ...tokenPayload, access_token: 'REDACTED', refresh_token: 'REDACTED' });
    
    const { data: insertedToken, error: storageError } = await supabase
      .from('google_tokens')
      .insert(tokenPayload)
      .select()
      .single();

    if (storageError) {
      console.error('❌ Failed to store tokens:', storageError);
      throw new Error(`Token storage failed: ${storageError.message}`);
    }
    
    console.log('✅ Successfully stored tokens:', { id: insertedToken.id, expires_at: insertedToken.expires_at });

    // Redirect back to the app with success
    const redirectUrl = `${Deno.env.get('APP_URL') || 'http://localhost:5173'}?oauth_success=true`;
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl
      }
    });

  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    
    // Redirect back to app with error
    const redirectUrl = `${Deno.env.get('APP_URL') || 'http://localhost:5173'}?oauth_error=${encodeURIComponent(error.message)}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl
      }
    });
  }
});