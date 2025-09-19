import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleSlidesRequest {
  action: 'create' | 'list' | 'open' | 'rename' | 'delete' | 'add_slide' | 'add_text' | 'add_image' | 'add_shape' | 'update_layout';
  presentationId?: string;
  title?: string;
  newTitle?: string;
  slideIndex?: number;
  content?: {
    text?: string;
    imageUrl?: string;
    shapeType?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  layoutId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Google Slides function called');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user email from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    console.log('User authenticated:', user.email);

    // Get Google tokens for the user
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('get_google_tokens_for_user', { p_user_email: user.email });

    if (tokenError || !tokenData || tokenData.length === 0) {
      throw new Error('No valid Google tokens found. Please reconnect your Google account.');
    }

    const googleToken = tokenData[0];
    console.log('Got Google tokens for user');

    // Parse request body
    const body: GoogleSlidesRequest = await req.json();
    console.log('Request body:', body);

    let result;

    switch (body.action) {
      case 'create':
        result = await createPresentation(googleToken.access_token, body.title || 'New Presentation');
        break;
      case 'list':
        result = await listPresentations(googleToken.access_token);
        break;
      case 'open':
        if (!body.presentationId) throw new Error('Presentation ID required');
        result = await openPresentation(googleToken.access_token, body.presentationId);
        break;
      case 'rename':
        if (!body.presentationId || !body.newTitle) throw new Error('Presentation ID and new title required');
        result = await renamePresentation(googleToken.access_token, body.presentationId, body.newTitle);
        break;
      case 'delete':
        if (!body.presentationId) throw new Error('Presentation ID required');
        result = await deletePresentation(googleToken.access_token, body.presentationId);
        break;
      case 'add_slide':
        if (!body.presentationId) throw new Error('Presentation ID required');
        result = await addSlide(googleToken.access_token, body.presentationId, body.slideIndex);
        break;
      case 'add_text':
        if (!body.presentationId || !body.content?.text) throw new Error('Presentation ID and text content required');
        result = await addText(googleToken.access_token, body.presentationId, body.content);
        break;
      case 'add_image':
        if (!body.presentationId || !body.content?.imageUrl) throw new Error('Presentation ID and image URL required');
        result = await addImage(googleToken.access_token, body.presentationId, body.content);
        break;
      case 'add_shape':
        if (!body.presentationId || !body.content?.shapeType) throw new Error('Presentation ID and shape type required');
        result = await addShape(googleToken.access_token, body.presentationId, body.content);
        break;
      case 'update_layout':
        if (!body.presentationId || !body.layoutId) throw new Error('Presentation ID and layout ID required');
        result = await updateLayout(googleToken.access_token, body.presentationId, body.layoutId, body.slideIndex);
        break;
      default:
        throw new Error('Invalid action');
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in google-slides function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function createPresentation(accessToken: string, title: string) {
  const response = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create presentation: ${error}`);
  }

  const presentation = await response.json();
  console.log('Created presentation:', presentation.presentationId);
  
  return {
    id: presentation.presentationId,
    title: presentation.title,
    url: `https://docs.google.com/presentation/d/${presentation.presentationId}/edit`,
    slides: presentation.slides?.map((slide: any) => ({
      id: slide.objectId,
      index: slide.slideProperties?.notesPage ? undefined : presentation.slides.indexOf(slide)
    })) || []
  };
}

async function listPresentations(accessToken: string) {
  // Google Slides API doesn't have a direct list endpoint, so we use Drive API to find presentations
  const response = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.presentation%27&pageSize=100&fields=files(id%2Cname%2CcreatedTime%2CmodifiedTime)', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list presentations: ${error}`);
  }

  const data = await response.json();
  
  return data.files?.map((file: any) => ({
    id: file.id,
    title: file.name,
    url: `https://docs.google.com/presentation/d/${file.id}/edit`,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime
  })) || [];
}

async function openPresentation(accessToken: string, presentationId: string) {
  const response = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to open presentation: ${error}`);
  }

  const presentation = await response.json();
  
  return {
    id: presentation.presentationId,
    title: presentation.title,
    url: `https://docs.google.com/presentation/d/${presentation.presentationId}/edit`,
    slides: presentation.slides?.map((slide: any, index: number) => ({
      id: slide.objectId,
      index: index,
      layouts: slide.slideProperties?.layoutObjectId
    })) || [],
    layouts: presentation.layouts?.map((layout: any) => ({
      id: layout.objectId,
      displayName: layout.layoutProperties?.displayName,
      name: layout.layoutProperties?.name
    })) || []
  };
}

async function renamePresentation(accessToken: string, presentationId: string, newTitle: string) {
  // Use Drive API to rename the presentation
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${presentationId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: newTitle
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to rename presentation: ${error}`);
  }

  return { success: true, newTitle };
}

async function deletePresentation(accessToken: string, presentationId: string) {
  // Use Drive API to delete the presentation
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${presentationId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete presentation: ${error}`);
  }

  return { success: true, deleted: true };
}

async function addSlide(accessToken: string, presentationId: string, insertionIndex?: number) {
  const requests = [{
    createSlide: {
      insertionIndex: insertionIndex || 1,
      slideLayoutReference: {
        predefinedLayout: 'BLANK'
      }
    }
  }];

  const response = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to add slide: ${error}`);
  }

  const result = await response.json();
  const slideId = result.replies?.[0]?.createSlide?.objectId;
  
  return { 
    success: true, 
    slideId,
    url: `https://docs.google.com/presentation/d/${presentationId}/edit#slide=id.${slideId}`
  };
}

async function addText(accessToken: string, presentationId: string, content: any) {
  const textBoxId = `textbox_${Date.now()}`;
  
  const requests = [
    {
      createShape: {
        objectId: textBoxId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: content.slideId || await getFirstSlideId(accessToken, presentationId),
          size: {
            width: { magnitude: content.width || 400, unit: 'PT' },
            height: { magnitude: content.height || 100, unit: 'PT' }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: content.x || 100,
            translateY: content.y || 100,
            unit: 'PT'
          }
        }
      }
    },
    {
      insertText: {
        objectId: textBoxId,
        text: content.text,
        insertionIndex: 0
      }
    }
  ];

  const response = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to add text: ${error}`);
  }

  return { success: true, textBoxId };
}

async function addImage(accessToken: string, presentationId: string, content: any) {
  const imageId = `image_${Date.now()}`;
  
  const requests = [{
    createImage: {
      objectId: imageId,
      url: content.imageUrl,
      elementProperties: {
        pageObjectId: content.slideId || await getFirstSlideId(accessToken, presentationId),
        size: {
          width: { magnitude: content.width || 300, unit: 'PT' },
          height: { magnitude: content.height || 200, unit: 'PT' }
        },
        transform: {
          scaleX: 1,
          scaleY: 1,
          translateX: content.x || 100,
          translateY: content.y || 100,
          unit: 'PT'
        }
      }
    }
  }];

  const response = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to add image: ${error}`);
  }

  return { success: true, imageId };
}

async function addShape(accessToken: string, presentationId: string, content: any) {
  const shapeId = `shape_${Date.now()}`;
  
  const requests = [{
    createShape: {
      objectId: shapeId,
      shapeType: content.shapeType,
      elementProperties: {
        pageObjectId: content.slideId || await getFirstSlideId(accessToken, presentationId),
        size: {
          width: { magnitude: content.width || 200, unit: 'PT' },
          height: { magnitude: content.height || 200, unit: 'PT' }
        },
        transform: {
          scaleX: 1,
          scaleY: 1,
          translateX: content.x || 100,
          translateY: content.y || 100,
          unit: 'PT'
        }
      }
    }
  }];

  const response = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to add shape: ${error}`);
  }

  return { success: true, shapeId };
}

async function updateLayout(accessToken: string, presentationId: string, layoutId: string, slideIndex?: number) {
  const slideId = slideIndex !== undefined ? 
    await getSlideIdByIndex(accessToken, presentationId, slideIndex) :
    await getFirstSlideId(accessToken, presentationId);
    
  const requests = [{
    updateSlideProperties: {
      objectId: slideId,
      slideProperties: {
        layoutObjectId: layoutId
      },
      fields: 'layoutObjectId'
    }
  }];

  const response = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update layout: ${error}`);
  }

  return { success: true, slideId, layoutId };
}

async function getFirstSlideId(accessToken: string, presentationId: string): Promise<string> {
  const presentation = await openPresentation(accessToken, presentationId);
  if (!presentation.slides || presentation.slides.length === 0) {
    throw new Error('No slides found in presentation');
  }
  return presentation.slides[0].id;
}

async function getSlideIdByIndex(accessToken: string, presentationId: string, index: number): Promise<string> {
  const presentation = await openPresentation(accessToken, presentationId);
  if (!presentation.slides || presentation.slides.length <= index) {
    throw new Error(`Slide at index ${index} not found`);
  }
  return presentation.slides[index].id;
}