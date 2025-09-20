import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlideTextElement {
  textRun?: {
    content?: string;
  };
}

interface SlideShape {
  text?: {
    textElements?: SlideTextElement[];
  };
}

interface SlidePageElement {
  shape?: SlideShape;
}

interface Slide {
  objectId?: string;
  pageElements?: SlidePageElement[];
}

interface GoogleSlidesPresentation {
  presentationId: string;
  title?: string;
  slides?: Slide[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Google Slides OAuth fetch function started');
    
    const requestBody = await req.json();
    const { presentationUrl } = requestBody;
    
    if (!presentationUrl) {
      throw new Error('Presentation URL is required');
    }

    console.log('🔍 Processing URL:', presentationUrl);
    
    // Extract presentation ID from URL
    const presentationIdMatch = presentationUrl.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
    if (!presentationIdMatch) {
      throw new Error('Invalid Google Slides URL format');
    }
    const presentationId = presentationIdMatch[1];
    console.log('🎯 Extracted presentation ID:', presentationId);

    // Get stored OAuth tokens
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    const { data: tokens, error: tokenError } = await supabase
      .from('google_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokens) {
      throw new Error('No valid Google OAuth tokens found. Please authenticate first.');
    }

    console.log('✅ Found OAuth tokens');

    // Check if token is expired and refresh if needed
    let accessToken = tokens.access_token;
    if (new Date(tokens.expires_at) <= new Date()) {
      console.log('🔄 Token expired, refreshing...');
      
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          refresh_token: tokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;
        
        // Update stored token
        await supabase
          .from('google_tokens')
          .update({
            access_token: accessToken,
            expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
          })
          .eq('id', tokens.id);
          
        console.log('✅ Token refreshed');
      } else {
        throw new Error('Failed to refresh OAuth token. Please re-authenticate.');
      }
    }

    // Fetch presentation from Google Slides API using OAuth token
    const apiUrl = `https://slides.googleapis.com/v1/presentations/${presentationId}`;
    console.log('🌐 Making API call to:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📊 Google API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Google Slides API error:', response.status, errorText);
      throw new Error(`Google Slides API error: ${response.status} - ${errorText}`);
    }

    const presentation: GoogleSlidesPresentation = await response.json();
    console.log('📊 Fetched presentation:', presentation.title, 'with', presentation.slides?.length || 0, 'slides');

    // Convert to markdown format
    const markdown = convertPresentationToMarkdown(presentation, presentationUrl);
    console.log('📝 Generated markdown length:', markdown.length);

    // Save to Supabase Storage
    const filename = `${sanitizeFilename(presentation.title || presentationId)}.md`;
    const filePath = `presentations/${filename}`;
    console.log('💾 Saving to storage path:', filePath);
    
    const { error: uploadError } = await supabase.storage
      .from('persistent-attachments')
      .upload(filePath, new Blob([markdown], { type: 'text/markdown' }), {
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      throw new Error(`Failed to save presentation: ${uploadError.message}`);
    }

    console.log('✅ Successfully saved Google Slides presentation');

    return new Response(JSON.stringify({ 
      success: true, 
      title: presentation.title,
      filename: filename,
      path: filePath
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Google Slides OAuth fetch error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function convertPresentationToMarkdown(presentation: GoogleSlidesPresentation, url: string): string {
  let markdown = `# ${presentation.title || 'Untitled Presentation'}\n\n`;
  markdown += `**Source:** ${url}\n`;
  markdown += `**Presentation ID:** ${presentation.presentationId}\n\n`;
  
  if (!presentation.slides || presentation.slides.length === 0) {
    markdown += '*No slides found in presentation.*\n';
    return markdown;
  }

  presentation.slides.forEach((slide, index) => {
    markdown += `## Slide ${index + 1}\n\n`;
    
    if (slide.pageElements) {
      slide.pageElements.forEach(element => {
        if (element.shape?.text?.textElements) {
          element.shape.text.textElements.forEach(textElement => {
            if (textElement.textRun?.content) {
              const content = textElement.textRun.content.trim();
              if (content) {
                markdown += `${content}\n\n`;
              }
            }
          });
        }
      });
    }
    
    markdown += '---\n\n';
  });

  return markdown;
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 100)
    .toLowerCase();
}