import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { MessageList } from './MessageList';
import { PersonaBadge } from './PersonaBadge';
import { FileUploadModal } from './FileUploadModal';
import { Upload, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useChat } from '@/hooks/useChat';
import { useToast } from '@/components/ui/use-toast';
import { getBerlinTime } from '@/lib/timezone';

interface Message {
  id: string;
  content: string;
  persona: string;
  timestamp: Date;
  isUser?: boolean;
  attachments?: {
    fileName: string;
    publicUrl: string;
    originalName: string;
    size: number;
    type: string;
  }[];
  model?: string;
}

interface ChatInterfaceProps {
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ className = '' }) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('claude-opus-4-1-20250805');
  const [selectedPersona, setSelectedPersona] = useState('gunnar');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{
    fileName: string;
    publicUrl: string;
    originalName: string;
    size: number;
    type: string;
  }[]>([]);
  
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    messages,
    journal,
    setMessages,
    setJournal,
  } = useChat();

  const models = [
    { id: 'claude-opus-4-1-20250805', name: 'Claude Opus 4.1' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  ];

  const personas = [
    { id: 'gunnar', name: 'Gunnar' },
    { id: 'kirby', name: 'Kirby' },
    { id: 'samara', name: 'Samara' },
    { id: 'stefan', name: 'Stefan' },
  ];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleFileSelect = (files: File[]) => {
    console.log('📎 Files selected:', files.map(f => f.name));
    setPendingFiles(files);
    setShowUploadModal(true);
  };

  const handleFileUpload = async (files: File[], category: string, customPath?: string) => {
    console.log('📤 Starting file upload:', files.map(f => f.name), 'Category:', category);
    
    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`file-${index}`, file, file.name);
      });
      formData.append('category', category);
      if (customPath) {
        formData.append('customPath', customPath);
      }

      const response = await supabase.functions.invoke('upload-file', {
        body: formData,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { uploadResults } = response.data;
      console.log('✅ Upload successful:', uploadResults);
      
      const newFiles = uploadResults.map((result: any) => ({
        fileName: result.fileName,
        publicUrl: result.publicUrl,
        originalName: result.originalName,
        size: result.size,
        type: result.type
      }));
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
      
      toast({
        title: "Upload successful",
        description: `${files.length} file(s) uploaded successfully`,
      });

      // If persona, boss, or journal files were uploaded, process them into database entries
      if (category === 'persona' || category === 'boss' || category === 'journal') {
        console.log(`Processing ${category} files for database conversion...`);
        try {
          const functionName = category === 'journal' ? 'process-journal-upload' : 'process-persona-upload';
          const processResponse = await supabase.functions.invoke(functionName, {
            body: { uploadResults, category }
          });
          
          if (processResponse.error) {
            console.error(`Error processing ${category} files:`, processResponse.error);
          } else {
            console.log(`✅ ${category} files processed successfully:`, processResponse.data);
          }
        } catch (error) {
          console.error(`Error invoking processing function for ${category}:`, error);
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleSendMessage = async () => {
    console.log('🚀 handleSendMessage called, message:', message, 'isLoading:', isLoading);
    if (!message.trim() || isLoading) return;

    console.log('✅ Proceeding with message send');
    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: message,
      persona: 'Boss',
      timestamp: getBerlinTime(),
      isUser: true,
      attachments: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    };

    setMessage('');
    setUploadedFiles([]);
    setMessages(prev => {
      console.log('📝 Adding user message to existing messages:', prev.length);
      return [...prev, userMessage];
    });
    setIsLoading(true);
    console.log('📝 User message added to UI, starting AI response...');

    // Create AI message placeholder
    const aiMessageId = crypto.randomUUID();
    const aiMessage: Message = {
      id: aiMessageId,
      content: '',
      persona: selectedPersona || 'gunnar',
      timestamp: getBerlinTime(),
      isUser: false
    };

    setMessages(prev => {
      console.log('🤖 Adding AI placeholder to messages:', prev.length);
      return [...prev, aiMessage];
    });

    try {
      // Simple response - you can integrate with any AI service here
      // For now, just a placeholder response
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate thinking
      
      const response = `Hello! I'm ${personas.find(p => p.id === selectedPersona)?.name || 'Gunnar'}. I received your message: "${userMessage.content.substring(0, 50)}${userMessage.content.length > 50 ? '...' : ''}"

This is now a simplified chat system. The complex Call 1/Call 2 functionality has been removed. You can integrate this with any AI service you prefer.`;
      
      // Update the AI message with the response
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: response }
          : msg
      ));

    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        content: 'Sorry, I encountered an error while processing your request.',
        persona: selectedPersona || 'gunnar',
        timestamp: getBerlinTime(),
        isUser: false
      };
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId ? errorMessage : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    console.log('🔵 handleKeyDown triggered, key:', e.key, 'shiftKey:', e.shiftKey);
    if (e.key === 'Enter' && !e.shiftKey) {
      console.log('✅ Enter key detected - calling handleSendMessage');
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-background via-background to-background/95 ${className}`}>
      {/* Header */}
      <div className="flex-none p-4 border-b border-border/40 bg-card/30 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <PersonaBadge persona={selectedPersona} />
            <div className="text-sm text-muted-foreground">
              {messages.length} messages
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="model-select" className="text-sm whitespace-nowrap">Model:</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="model-select" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="persona-select" className="text-sm whitespace-nowrap">Persona:</Label>
              <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                <SelectTrigger id="persona-select" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {personas.map((persona) => (
                    <SelectItem key={persona.id} value={persona.id}>
                      {persona.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} />
      </div>

      {/* File attachments preview */}
      {uploadedFiles.length > 0 && (
        <div className="flex-none p-2 border-t border-border/40 bg-muted/20">
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => (
              <Card key={index} className="p-2 text-xs">
                <CardContent className="p-0">
                  <div className="flex items-center gap-1">
                    <span className="truncate max-w-32">{file.originalName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                    >
                      ×
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-none p-4 border-t border-border/40 bg-card/30 backdrop-blur-sm">
        <div className="flex items-end gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => document.getElementById('file-input')?.click()}
            className="shrink-0"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <input
            id="file-input"
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) {
                handleFileSelect(files);
              }
            }}
          />
          <div className="flex-1">
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading}
              className="min-h-[40px] resize-none"
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isLoading}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={(files, category, customPath) => handleFileUpload(Array.from(files), category, customPath)}
        files={pendingFiles as unknown as FileList}
      />
    </div>
  );
};

export default ChatInterface;