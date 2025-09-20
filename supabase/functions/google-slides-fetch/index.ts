import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    console.log('🚀 Google Slides fetch function started');
    const requestBody = await req.json();
    console.log('📋 Request body:', requestBody);
    
    const { presentationUrl } = requestBody;
    
    if (!presentationUrl) {
      console.error('❌ No presentation URL provided');
      throw new Error('Presentation URL is required');
    }
    
    console.log('🔍 Processing URL:', presentationUrl);
    
    // Extract presentation ID from URL
    const presentationIdMatch = presentationUrl.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
    if (!presentationIdMatch) {
      console.error('❌ Invalid URL format:', presentationUrl);
      throw new Error('Invalid Google Slides URL format');
    }
    
    const presentationId = presentationIdMatch[1];
    console.log('🎯 Extracted presentation ID:', presentationId);

    // Get Google API key from secrets
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!googleApiKey) {
      console.error('❌ Google API key not found in environment');
      throw new Error('Google API key not configured');
    }
    console.log('✅ Google API key found');

    // Fetch presentation from Google Slides API
    const apiUrl = `https://slides.googleapis.com/v1/presentations/${presentationId}?key=${googleApiKey}`;
    console.log('🌐 Making API call to:', apiUrl);
    
    const response = await fetch(apiUrl);
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase configuration missing');
      throw new Error('Supabase configuration missing');
    }
    console.log('✅ Supabase configuration found');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create filename from title or use presentation ID
    const filename = `${sanitizeFilename(presentation.title || presentationId)}.md`;
    const filePath = `presentations/${filename}`;
    console.log('💾 Saving to storage path:', filePath);
    
    // Upload to persistent-attachments bucket
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
    console.error('❌ Google Slides fetch error:', error);
    console.error('❌ Error stack:', error.stack);
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