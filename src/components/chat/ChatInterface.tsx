import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, ChevronDown, Chrome } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageList } from './MessageList';
import { PersonaBadge } from './PersonaBadge';
import { FileUploadModal } from './FileUploadModal';
import GoogleIntegration from './GoogleIntegration';
import UserProfile from './UserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useChat } from '@/hooks/useChat';
import { useGoogleConnection } from '@/hooks/useGoogleConnection';
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
}

const ChatInterface = () => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    messages,
    journal,
    setMessages,
    setJournal,
    saveToSuperjournal,
  } = useChat();

  const { isConnected: isGoogleConnected, userEmail: googleUserEmail } = useGoogleConnection();

  const models = [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast)' },
    { id: 'gpt-4o', name: 'GPT-4o (Balanced)' },
    { id: 'gpt-5-2025-08-07', name: 'GPT-5 (Most Capable)' },
    { id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini' },
    { id: 'gpt-4.1-2025-04-14', name: 'GPT-4.1' },
    { id: 'o3-2025-04-16', name: 'O3 Reasoning' }
  ];

  const personas = [
    { id: 'gunnar', name: 'Gunnar' },
    { id: 'samara', name: 'Samara' },
    { id: 'kirby', name: 'Kirby' },
    { id: 'stefan', name: 'Stefan' }
  ];

  // Load model from localStorage on mount
  useEffect(() => {
    const storedModel = localStorage.getItem('selectedModel');
    if (storedModel && models.some(m => m.id === storedModel)) {
      setSelectedModel(storedModel);
    }
  }, []);

  // Load persona from localStorage on mount
  useEffect(() => {
    const storedPersona = localStorage.getItem('selectedPersona');
    if (storedPersona && personas.some(p => p.id === storedPersona)) {
      setSelectedPersona(storedPersona);
    }
  }, []);

  // Save model to localStorage whenever it changes
  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem('selectedModel', selectedModel);
    }
  }, [selectedModel]);

  // Save persona to localStorage whenever it changes
  useEffect(() => {
    if (selectedPersona) {
      localStorage.setItem('selectedPersona', selectedPersona);
    }
  }, [selectedPersona]);

  // Focus management
  useEffect(() => {
    const handleWindowFocus = () => {
      inputRef.current?.focus();
    };

    window.addEventListener('focus', handleWindowFocus);
    inputRef.current?.focus();

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Sync persona dropdown with input text
  useEffect(() => {
    const addressingMatch = message.match(/^(Gunnar|Samara|Kirby|Stefan),?\s*/i);
    if (addressingMatch) {
      const persona = addressingMatch[1].toLowerCase();
      if (selectedPersona !== persona) {
        setSelectedPersona(persona);
      }
    }
    // Keep current persona while typing - never auto-clear
  }, [message, selectedPersona]);

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      setPendingFiles(files);
      setShowUploadModal(true);
    }
  };

  const handleFileUpload = async (files: FileList, category: string, customPath?: string) => {
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
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

      return response.data;
    });

    try {
      const uploadResults = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...uploadResults]);
      setPendingFiles(null);
      
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
      id: Date.now().toString(),
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

    // Create AI message placeholder for streaming
    const aiMessageId = crypto.randomUUID();
    const aiMessage: Message = {
      id: aiMessageId,
      content: '', // Start empty for streaming
      persona: selectedPersona || 'gunnar',
      timestamp: getBerlinTime(),
      isUser: false
    };

    setMessages(prev => {
      console.log('🤖 Adding AI placeholder to messages:', prev.length);
      return [...prev, aiMessage];
    });

    try {
      // Format messages for OpenAI API
      const formattedMessages = [...messages, userMessage].map(msg => ({
        role: msg.isUser ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));
      
      // Use direct fetch for streaming support
      const response = await fetch('https://suncgglbheilkeimwuxt.supabase.co/functions/v1/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1bmNnZ2xiaGVpbGtlaW13dXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzQzNDEsImV4cCI6MjA3MzQ1MDM0MX0.Ua6POs3Agm3cuZOWzrQSrVG7w7rC3a49C38JclWQ9wA',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1bmNnZ2xiaGVpbGtlaW13dXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzQzNDEsImV4cCI6MjA3MzQ1MDM0MX0.Ua6POs3Agm3cuZOWzrQSrVG7w7rC3a49C38JclWQ9wA',
        },
        body: JSON.stringify({
          messages: formattedMessages,
          model: selectedModel,
          persona: selectedPersona || 'gunnar',
          turnId: crypto.randomUUID()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body available');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamingContent = '';
      let receivedTurnId = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // INSTANT processing - no buffer delays
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              const parsed = JSON.parse(line);
              
              if (parsed.type === 'content_delta' && parsed.delta) {
                streamingContent += parsed.delta;
                if (parsed.turnId) receivedTurnId = parsed.turnId;
                
                // INSTANT UI update - zero delay
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId ? { ...msg, content: streamingContent } : msg
                ));
                
              } else if (parsed.type === 'complete') {
                if (parsed.turnId) receivedTurnId = parsed.turnId;
              } else if (parsed.type === 'error') {
                throw new Error(parsed.error);
              }
            } catch (parseError) {
              // Silent fail for speed
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Save conversation turn to superjournal database
      const finalAiMessage = {
        ...aiMessage,
        content: streamingContent
      };
      
      try {
        const saved = await saveToSuperjournal(userMessage, finalAiMessage, selectedModel, receivedTurnId);
        if (!saved) {
          console.warn('⚠️ Failed to save conversation to superjournal');
        } else {
          console.log('✅ Successfully saved conversation turn');
        }
      } catch (saveError) {
        console.error('💥 Error during save attempt:', saveError);
      }

    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, I encountered an error while processing your request.',
        persona: selectedPersona || 'gunnar',
        timestamp: getBerlinTime(),
        isUser: false
      };
      
      // Replace the placeholder AI message with error message
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

  const handlePersonaSelect = (personaId: string) => {
    const persona = personas.find(p => p.id === personaId);
    if (persona) {
      setSelectedPersona(personaId);
      setMessage(`${persona.name}, `);
      // Focus input after dropdown closes
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Minimal User Profile */}
      <div className="absolute top-2 right-2 z-10">
        <UserProfile />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} />
      </div>

      {/* Input Bar */}
      <div className="input-bar-container">
        <div className="input-bar-content">
          <div className="flex flex-col gap-2 flex-1">
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-background/50 rounded border">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 bg-background rounded px-3 py-1 text-sm border">
                    <span className="truncate max-w-32">{file.originalName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-4 w-4"
                      onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="chat-input flex-1 pl-4"
              />
              
               <Button 
                onClick={() => {
                  console.log('🔴 Send button clicked!');
                  handleSendMessage();
                }}
                disabled={!message.trim() || isLoading}
                className="send-btn focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Model Selection Controls */}
          <div className="model-controls">
            <div className="model-selectors">
              <Button
                variant="ghost"
                size="sm"
                className="attachment-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <div className="status-indicator" />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileSelect(e.target.files);
                  }
                }}
              />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="model-selector">
                    <ChevronDown className="h-3 w-3 mr-1" />
                    {models.find(m => m.id === selectedModel)?.name || 'GPT-5'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-background border" onCloseAutoFocus={(e) => e.preventDefault()}>
                  {models.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id);
                        // Focus input after model selection
                        setTimeout(() => {
                          inputRef.current?.focus();
                        }, 0);
                      }}
                    >
                      {model.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="model-selector">
                    <ChevronDown className="h-3 w-3 mr-1" />
                    {selectedPersona ? personas.find(p => p.id === selectedPersona)?.name : 'Persona'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-background border" onCloseAutoFocus={(e) => e.preventDefault()}>
                  {personas.map((persona) => (
                    <DropdownMenuItem
                      key={persona.id}
                      onClick={() => handlePersonaSelect(persona.id)}
                    >
                      {persona.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleFileUpload}
        files={pendingFiles}
      />

      <Dialog open={showGoogleModal} onOpenChange={setShowGoogleModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Google Workspace Integration</DialogTitle>
            <DialogDescription>
              Connect your Google account and create emails, documents, and presentations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <GoogleIntegration />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatInterface;
