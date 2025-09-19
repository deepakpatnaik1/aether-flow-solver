import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
    slideId?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  layoutId?: string;
}

interface Presentation {
  id: string;
  title: string;
  url: string;
  createdTime?: string;
  modifiedTime?: string;
  slides?: Array<{
    id: string;
    index: number;
    layouts?: string;
  }>;
  layouts?: Array<{
    id: string;
    displayName: string;
    name: string;
  }>;
}

export const useGoogleSlides = () => {
  const { toast } = useToast();

  const callSlidesAPI = async (request: GoogleSlidesRequest): Promise<any> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('google-slides', {
        body: request,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.data;
    } catch (error: any) {
      console.error('Google Slides API error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to perform Google Slides operation",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Create a new presentation
  const createPresentation = async (title?: string): Promise<Presentation> => {
    const result = await callSlidesAPI({
      action: 'create',
      title: title || 'New Presentation'
    });
    
    toast({
      title: "Success",
      description: `Created presentation: ${result.title}`,
    });
    
    return result;
  };

  // List all presentations
  const listPresentations = async (): Promise<Presentation[]> => {
    return await callSlidesAPI({ action: 'list' });
  };

  // Open an existing presentation
  const openPresentation = async (presentationId: string): Promise<Presentation> => {
    return await callSlidesAPI({
      action: 'open',
      presentationId
    });
  };

  // Rename a presentation
  const renamePresentation = async (presentationId: string, newTitle: string): Promise<void> => {
    await callSlidesAPI({
      action: 'rename',
      presentationId,
      newTitle
    });
    
    toast({
      title: "Success",
      description: `Renamed presentation to: ${newTitle}`,
    });
  };

  // Delete a presentation
  const deletePresentation = async (presentationId: string): Promise<void> => {
    await callSlidesAPI({
      action: 'delete',
      presentationId
    });
    
    toast({
      title: "Success",
      description: "Presentation deleted successfully",
    });
  };

  // Add a new slide
  const addSlide = async (presentationId: string, insertionIndex?: number): Promise<{ slideId: string; url: string }> => {
    const result = await callSlidesAPI({
      action: 'add_slide',
      presentationId,
      slideIndex: insertionIndex
    });
    
    toast({
      title: "Success",
      description: "New slide added successfully",
    });
    
    return result;
  };

  // Add text to a slide
  const addText = async (
    presentationId: string, 
    text: string, 
    options?: {
      slideId?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    }
  ): Promise<{ textBoxId: string }> => {
    const result = await callSlidesAPI({
      action: 'add_text',
      presentationId,
      content: {
        text,
        ...options
      }
    });
    
    toast({
      title: "Success",
      description: "Text added to slide",
    });
    
    return result;
  };

  // Add image to a slide
  const addImage = async (
    presentationId: string,
    imageUrl: string,
    options?: {
      slideId?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    }
  ): Promise<{ imageId: string }> => {
    const result = await callSlidesAPI({
      action: 'add_image',
      presentationId,
      content: {
        imageUrl,
        ...options
      }
    });
    
    toast({
      title: "Success",
      description: "Image added to slide",
    });
    
    return result;
  };

  // Add shape to a slide
  const addShape = async (
    presentationId: string,
    shapeType: string,
    options?: {
      slideId?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    }
  ): Promise<{ shapeId: string }> => {
    const result = await callSlidesAPI({
      action: 'add_shape',
      presentationId,
      content: {
        shapeType,
        ...options
      }
    });
    
    toast({
      title: "Success",
      description: "Shape added to slide",
    });
    
    return result;
  };

  // Update slide layout
  const updateLayout = async (
    presentationId: string,
    layoutId: string,
    slideIndex?: number
  ): Promise<{ slideId: string; layoutId: string }> => {
    const result = await callSlidesAPI({
      action: 'update_layout',
      presentationId,
      layoutId,
      slideIndex
    });
    
    toast({
      title: "Success",
      description: "Slide layout updated",
    });
    
    return result;
  };

  return {
    createPresentation,
    listPresentations,
    openPresentation,
    renamePresentation,
    deletePresentation,
    addSlide,
    addText,
    addImage,
    addShape,
    updateLayout
  };
};