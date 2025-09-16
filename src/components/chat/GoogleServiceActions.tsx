import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, FileText, Presentation, Send, Plus, Trash2 } from 'lucide-react';

interface GoogleServiceActionsProps {
  userEmail: string;
}

const GoogleServiceActions: React.FC<GoogleServiceActionsProps> = ({ userEmail }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Gmail state
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    body: '',
  });

  // Google Docs state
  const [docData, setDocData] = useState({
    title: '',
    content: '',
  });

  // Google Slides state
  const [slideData, setSlideData] = useState({
    title: '',
    slides: [{ title: '', content: '', bullets: [''] }],
  });

  const sendEmail = async () => {
    if (!emailData.to || !emailData.subject || !emailData.body) {
      toast({
        title: "Missing information",
        description: "Please fill in all email fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-gmail', {
        body: {
          to: emailData.to,
          subject: emailData.subject,
          body: emailData.body,
          isHtml: true,
          userEmail,
        },
      });

      if (error) throw error;

      toast({
        title: "Email sent successfully!",
        description: `Email sent via Gmail to ${emailData.to}`,
      });

      setEmailData({ to: '', subject: '', body: '' });
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Failed to send email",
        description: error.message || "Please check your Google connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createDocument = async () => {
    if (!docData.title || !docData.content) {
      toast({
        title: "Missing information",
        description: "Please provide both title and content for the document.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-docs', {
        body: {
          title: docData.title,
          content: docData.content,
          userEmail,
        },
      });

      if (error) throw error;

      toast({
        title: "Document created successfully!",
        description: (
          <div className="flex flex-col gap-2">
            <span>Google Doc "{docData.title}" has been created.</span>
            <a 
              href={data.documentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Open Document →
            </a>
          </div>
        ),
      });

      setDocData({ title: '', content: '' });
    } catch (error: any) {
      console.error('Error creating document:', error);
      toast({
        title: "Failed to create document",
        description: error.message || "Please check your Google connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createPresentation = async () => {
    if (!slideData.title || slideData.slides.length === 0) {
      toast({
        title: "Missing information",
        description: "Please provide a title and at least one slide.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-slides', {
        body: {
          title: slideData.title,
          slides: slideData.slides.map(slide => ({
            title: slide.title,
            content: slide.content,
            bullets: slide.bullets.filter(bullet => bullet.trim() !== ''),
          })),
          userEmail,
        },
      });

      if (error) throw error;

      toast({
        title: "Presentation created successfully!",
        description: (
          <div className="flex flex-col gap-2">
            <span>Google Slides "{slideData.title}" has been created.</span>
            <a 
              href={data.presentationUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Open Presentation →
            </a>
          </div>
        ),
      });

      setSlideData({
        title: '',
        slides: [{ title: '', content: '', bullets: [''] }],
      });
    } catch (error: any) {
      console.error('Error creating presentation:', error);
      toast({
        title: "Failed to create presentation",
        description: error.message || "Please check your Google connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addSlide = () => {
    setSlideData(prev => ({
      ...prev,
      slides: [...prev.slides, { title: '', content: '', bullets: [''] }],
    }));
  };

  const removeSlide = (index: number) => {
    if (slideData.slides.length > 1) {
      setSlideData(prev => ({
        ...prev,
        slides: prev.slides.filter((_, i) => i !== index),
      }));
    }
  };

  const updateSlide = (index: number, field: string, value: string) => {
    setSlideData(prev => ({
      ...prev,
      slides: prev.slides.map((slide, i) => 
        i === index ? { ...slide, [field]: value } : slide
      ),
    }));
  };

  const addBullet = (slideIndex: number) => {
    setSlideData(prev => ({
      ...prev,
      slides: prev.slides.map((slide, i) => 
        i === slideIndex 
          ? { ...slide, bullets: [...slide.bullets, ''] }
          : slide
      ),
    }));
  };

  const updateBullet = (slideIndex: number, bulletIndex: number, value: string) => {
    setSlideData(prev => ({
      ...prev,
      slides: prev.slides.map((slide, i) => 
        i === slideIndex 
          ? { 
              ...slide, 
              bullets: slide.bullets.map((bullet, j) => 
                j === bulletIndex ? value : bullet
              )
            }
          : slide
      ),
    }));
  };

  const removeBullet = (slideIndex: number, bulletIndex: number) => {
    setSlideData(prev => ({
      ...prev,
      slides: prev.slides.map((slide, i) => 
        i === slideIndex 
          ? { 
              ...slide, 
              bullets: slide.bullets.filter((_, j) => j !== bulletIndex)
            }
          : slide
      ),
    }));
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Google Workspace Actions</CardTitle>
        <CardDescription>
          Create emails, documents, and presentations using your connected Google account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Gmail
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Docs
            </TabsTrigger>
            <TabsTrigger value="slides" className="flex items-center gap-2">
              <Presentation className="h-4 w-4" />
              Slides
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email-to">To</Label>
                <Input
                  id="email-to"
                  type="email"
                  placeholder="recipient@example.com"
                  value={emailData.to}
                  onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  placeholder="Email subject"
                  value={emailData.subject}
                  onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="email-body">Message</Label>
                <Textarea
                  id="email-body"
                  placeholder="Email content..."
                  rows={8}
                  value={emailData.body}
                  onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
                />
              </div>
              <Button onClick={sendEmail} disabled={isLoading} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                {isLoading ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="docs" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="doc-title">Document Title</Label>
                <Input
                  id="doc-title"
                  placeholder="My Document"
                  value={docData.title}
                  onChange={(e) => setDocData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="doc-content">Content</Label>
                <Textarea
                  id="doc-content"
                  placeholder="Document content..."
                  rows={12}
                  value={docData.content}
                  onChange={(e) => setDocData(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
              <Button onClick={createDocument} disabled={isLoading} className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                {isLoading ? 'Creating...' : 'Create Document'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="slides" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="slide-title">Presentation Title</Label>
                <Input
                  id="slide-title"
                  placeholder="My Presentation"
                  value={slideData.title}
                  onChange={(e) => setSlideData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Slides</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSlide}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Slide
                  </Button>
                </div>

                {slideData.slides.map((slide, slideIndex) => (
                  <Card key={slideIndex} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Slide {slideIndex + 1}</h4>
                        {slideData.slides.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeSlide(slideIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div>
                        <Label>Slide Title</Label>
                        <Input
                          placeholder="Slide title"
                          value={slide.title}
                          onChange={(e) => updateSlide(slideIndex, 'title', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label>Content</Label>
                        <Textarea
                          placeholder="Slide content..."
                          rows={3}
                          value={slide.content}
                          onChange={(e) => updateSlide(slideIndex, 'content', e.target.value)}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Bullet Points</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addBullet(slideIndex)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Bullet
                          </Button>
                        </div>
                        
                        {slide.bullets.map((bullet, bulletIndex) => (
                          <div key={bulletIndex} className="flex items-center gap-2 mb-2">
                            <Input
                              placeholder="Bullet point"
                              value={bullet}
                              onChange={(e) => updateBullet(slideIndex, bulletIndex, e.target.value)}
                            />
                            {slide.bullets.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeBullet(slideIndex, bulletIndex)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Button onClick={createPresentation} disabled={isLoading} className="w-full">
                <Presentation className="h-4 w-4 mr-2" />
                {isLoading ? 'Creating...' : 'Create Presentation'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default GoogleServiceActions;