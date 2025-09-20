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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Google Slides fetch function started');
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('📋 Request body received:', JSON.stringify(requestBody));
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }
    
    const { presentationUrl } = requestBody;
    
    if (!presentationUrl) {
      console.error('❌ No presentation URL provided');
      throw new Error('Presentation URL is required');
    }
    
    console.log('🔍 Processing URL:', presentationUrl);
    
    // Extract presentation ID from URL
    let presentationId;
    try {
      const presentationIdMatch = presentationUrl.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
      if (!presentationIdMatch) {
        console.error('❌ Invalid URL format:', presentationUrl);
        throw new Error('Invalid Google Slides URL format');
      }
      presentationId = presentationIdMatch[1];
      console.log('🎯 Extracted presentation ID:', presentationId);
    } catch (regexError) {
      console.error('❌ URL parsing error:', regexError);
      throw new Error('Failed to parse Google Slides URL');
    }

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
    
    let response;
    let presentation: GoogleSlidesPresentation;
    
    try {
      response = await fetch(apiUrl);
      console.log('📊 Google API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Google Slides API error:', response.status, errorText);
        throw new Error(`Google Slides API error: ${response.status} - ${errorText}`);
      }

      presentation = await response.json();
      console.log('📊 Fetched presentation:', presentation.title, 'with', presentation.slides?.length || 0, 'slides');
    } catch (fetchError) {
      console.error('❌ API fetch error:', fetchError);
      throw new Error(`Failed to fetch from Google Slides API: ${fetchError.message}`);
    }

    // Convert to markdown format
    let markdown;
    try {
      markdown = convertPresentationToMarkdown(presentation, presentationUrl);
      console.log('📝 Generated markdown length:', markdown.length);
    } catch (markdownError) {
      console.error('❌ Markdown conversion error:', markdownError);
      throw new Error(`Failed to convert presentation to markdown: ${markdownError.message}`);
    }

    // Save to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase configuration missing');
      throw new Error('Supabase configuration missing');
    }
    console.log('✅ Supabase configuration found');

    let supabase;
    try {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    } catch (clientError) {
      console.error('❌ Supabase client creation error:', clientError);
      throw new Error(`Failed to create Supabase client: ${clientError.message}`);
    }
    
    // Create filename from title or use presentation ID
    const filename = `${sanitizeFilename(presentation.title || presentationId)}.md`;
    const filePath = `presentations/${filename}`;
    console.log('💾 Saving to storage path:', filePath);
    
    // Upload to persistent-attachments bucket
    try {
      const { error: uploadError } = await supabase.storage
        .from('persistent-attachments')
        .upload(filePath, new Blob([markdown], { type: 'text/markdown' }), {
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        throw new Error(`Failed to save presentation: ${uploadError.message}`);
      }
    } catch (storageError) {
      console.error('❌ Storage operation error:', storageError);
      throw new Error(`Storage operation failed: ${storageError.message}`);
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
      error: error.message,
      stack: error.stack
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