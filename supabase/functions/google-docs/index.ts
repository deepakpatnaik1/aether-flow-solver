import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocRequest {
  title: string;
  content: string;
  userEmail: string;
  folderId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { title, content, userEmail, folderId }: DocRequest = await req.json();

    // Get stored Google tokens
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('google_tokens')
      .select('access_token, expires_at, refresh_token')
      .eq('user_email', userEmail)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('Google account not connected. Please authenticate first.');
    }

    let accessToken = tokenData.access_token;

    // Check if token needs refresh
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now >= expiresAt && tokenData.refresh_token) {
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;
        
        await supabaseClient
          .from('google_tokens')
          .update({
            access_token: accessToken,
            expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          })
          .eq('user_email', userEmail);
      }
    }

    // Create Google Doc
    const docResponse = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title,
      }),
    });

    if (!docResponse.ok) {
      const error = await docResponse.text();
      console.error('Google Docs API error:', error);
      throw new Error('Failed to create Google Doc');
    }

    const doc = await docResponse.json();
    const documentId = doc.documentId;

    // Add content to the document
    if (content) {
      const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: {
                  index: 1,
                },
                text: content,
              },
            },
          ],
        }),
      });

      if (!updateResponse.ok) {
        console.error('Failed to add content to document');
      }
    }

    // Move to specific folder if requested
    if (folderId) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addParents: folderId,
        }),
      });
    }

    console.log('Google Doc created successfully:', documentId);

    return new Response(JSON.stringify({
      success: true,
      documentId,
      documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
      title,
      message: 'Google Doc created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in google-docs function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});