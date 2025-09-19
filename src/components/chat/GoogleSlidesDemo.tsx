import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGoogleSlides } from '@/hooks/useGoogleSlides';
import { ExternalLink, Plus, Edit, Trash2, FileSliders } from 'lucide-react';

interface Presentation {
  id: string;
  title: string;
  url: string;
  createdTime?: string;
  modifiedTime?: string;
}

export const GoogleSlidesDemo: React.FC = () => {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [selectedPresentation, setSelectedPresentation] = useState<string>('');
  const [newTitle, setNewTitle] = useState('');
  const [renameTitle, setRenameTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    createPresentation,
    listPresentations,
    openPresentation,
    renamePresentation,
    deletePresentation,
    addSlide,
    addText,
    addImage,
    addShape
  } = useGoogleSlides();

  const handleListPresentations = async () => {
    setIsLoading(true);
    try {
      const list = await listPresentations();
      setPresentations(list);
    } catch (error) {
      console.error('Error listing presentations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePresentation = async () => {
    if (!newTitle.trim()) return;
    
    setIsLoading(true);
    try {
      const presentation = await createPresentation(newTitle);
      setPresentations(prev => [...prev, presentation]);
      setNewTitle('');
    } catch (error) {
      console.error('Error creating presentation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRename = async (presentationId: string) => {
    if (!renameTitle.trim()) return;
    
    setIsLoading(true);
    try {
      await renamePresentation(presentationId, renameTitle);
      setPresentations(prev => prev.map(p => 
        p.id === presentationId ? { ...p, title: renameTitle } : p
      ));
      setRenameTitle('');
    } catch (error) {
      console.error('Error renaming presentation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (presentationId: string) => {
    setIsLoading(true);
    try {
      await deletePresentation(presentationId);
      setPresentations(prev => prev.filter(p => p.id !== presentationId));
    } catch (error) {
      console.error('Error deleting presentation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSlide = async () => {
    if (!selectedPresentation) return;
    
    setIsLoading(true);
    try {
      await addSlide(selectedPresentation);
    } catch (error) {
      console.error('Error adding slide:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddText = async () => {
    if (!selectedPresentation || !textContent.trim()) return;
    
    setIsLoading(true);
    try {
      await addText(selectedPresentation, textContent, {
        x: 100,
        y: 100,
        width: 400,
        height: 100
      });
      setTextContent('');
    } catch (error) {
      console.error('Error adding text:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddImage = async () => {
    if (!selectedPresentation || !imageUrl.trim()) return;
    
    setIsLoading(true);
    try {
      await addImage(selectedPresentation, imageUrl, {
        x: 200,
        y: 200,
        width: 300,
        height: 200
      });
      setImageUrl('');
    } catch (error) {
      console.error('Error adding image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddShape = async () => {
    if (!selectedPresentation) return;
    
    setIsLoading(true);
    try {
      await addShape(selectedPresentation, 'RECTANGLE', {
        x: 150,
        y: 300,
        width: 200,
        height: 100
      });
    } catch (error) {
      console.error('Error adding shape:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSliders className="h-6 w-6" />
            Google Slides Integration Demo
          </CardTitle>
          <CardDescription>
            Test Google Slides functionality that your personas can use
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manage" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manage">Manage Presentations</TabsTrigger>
              <TabsTrigger value="content">Add Content</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manage" className="space-y-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="New presentation title..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                  <Button 
                    onClick={handleCreatePresentation}
                    disabled={!newTitle.trim() || isLoading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </div>

                <Button 
                  onClick={handleListPresentations}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  Refresh Presentations List
                </Button>

                <div className="space-y-2">
                  {presentations.map((presentation) => (
                    <Card key={presentation.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{presentation.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            ID: {presentation.id.substring(0, 20)}...
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(presentation.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPresentation(presentation.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(presentation.id)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {selectedPresentation === presentation.id && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="flex gap-2">
                            <Input
                              placeholder="New title..."
                              value={renameTitle}
                              onChange={(e) => setRenameTitle(e.target.value)}
                            />
                            <Button
                              onClick={() => handleRename(presentation.id)}
                              disabled={!renameTitle.trim() || isLoading}
                              size="sm"
                            >
                              Rename
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="content" className="space-y-4">
              {selectedPresentation ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">
                      Working with presentation: {presentations.find(p => p.id === selectedPresentation)?.title || 'Unknown'}
                    </p>
                  </div>

                  <Button 
                    onClick={handleAddSlide}
                    disabled={isLoading}
                    className="w-full"
                  >
                    Add New Slide
                  </Button>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Text content to add..."
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                      />
                      <Button
                        onClick={handleAddText}
                        disabled={!textContent.trim() || isLoading}
                      >
                        Add Text
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Image URL..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                      />
                      <Button
                        onClick={handleAddImage}
                        disabled={!imageUrl.trim() || isLoading}
                      >
                        Add Image
                      </Button>
                    </div>

                    <Button
                      onClick={handleAddShape}
                      disabled={isLoading}
                      variant="outline"
                      className="w-full"
                    >
                      Add Rectangle Shape
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  Select a presentation from the "Manage Presentations" tab to add content
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};