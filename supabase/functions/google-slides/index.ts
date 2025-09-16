import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlideRequest {
  title: string;
  slides: Array<{
    title?: string;
    content?: string;
    bullets?: string[];
  }>;
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

    const { title, slides, userEmail, folderId }: SlideRequest = await req.json();

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

    // Create Google Slides presentation
    const presentationResponse = await fetch('https://slides.googleapis.com/v1/presentations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title,
      }),
    });

    if (!presentationResponse.ok) {
      const error = await presentationResponse.text();
      console.error('Google Slides API error:', error);
      throw new Error('Failed to create Google Slides presentation');
    }

    const presentation = await presentationResponse.json();
    const presentationId = presentation.presentationId;

    // Add slides content
    if (slides && slides.length > 0) {
      const requests = [];

      // Remove the default slide first if we have custom slides
      if (presentation.slides && presentation.slides.length > 0) {
        requests.push({
          deleteObject: {
            objectId: presentation.slides[0].objectId,
          },
        });
      }

      // Add new slides
      slides.forEach((slide, index) => {
        const slideId = `slide_${index}`;
        
        // Create slide
        requests.push({
          createSlide: {
            objectId: slideId,
            slideLayoutReference: {
              predefinedLayout: 'TITLE_AND_BODY',
            },
          },
        });

        // Add title if provided
        if (slide.title) {
          requests.push({
            insertText: {
              objectId: `${slideId}_title`,
              text: slide.title,
            },
          });
        }

        // Add content
        let contentText = '';
        if (slide.content) {
          contentText += slide.content;
        }
        if (slide.bullets && slide.bullets.length > 0) {
          if (contentText) contentText += '\n\n';
          contentText += slide.bullets.map(bullet => `• ${bullet}`).join('\n');
        }

        if (contentText) {
          requests.push({
            insertText: {
              objectId: `${slideId}_body`,
              text: contentText,
            },
          });
        }
      });

      // Execute all requests
      const updateResponse = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      if (!updateResponse.ok) {
        console.error('Failed to update slides content');
      }
    }

    // Move to specific folder if requested
    if (folderId) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${presentationId}`, {
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

    console.log('Google Slides created successfully:', presentationId);

    return new Response(JSON.stringify({
      success: true,
      presentationId,
      presentationUrl: `https://docs.google.com/presentation/d/${presentationId}/edit`,
      title,
      slideCount: slides.length,
      message: 'Google Slides presentation created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in google-slides function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});