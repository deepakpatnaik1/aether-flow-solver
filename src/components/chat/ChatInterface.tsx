import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageList } from './MessageList';
import { PersonaBadge } from './PersonaBadge';
import { FileUploadModal } from './FileUploadModal';
import { AbortButton } from './AbortButton';
import UserMenu from '@/components/UserMenu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useChat } from '@/hooks/useChat';
import { getBerlinTime } from '@/lib/timezone';
import { toast } from 'sonner';

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
    type: string;
  }[];
}

const ChatInterface = () => {
  const { user, loading: authLoading } = useAuth();
  const { messages, journal, setMessages, setJournal, isDataLoading, saveToSuperjournal } = useChat(user?.id);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTurnId, setCurrentTurnId] = useState<string | null>(null);
  const [currentUserMessageId, setCurrentUserMessageId] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // Initialize from localStorage with true persistence - no defaults after first choice
  const [selectedModel, setSelectedModel] = useState(() => {
    const storedModel = localStorage.getItem('selectedModel');
    console.log('🔄 Initializing model from localStorage:', storedModel);
    const models = [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-5-2025-08-07', name: 'GPT-5' },
      { id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini' },
      { id: 'gpt-4.1-2025-04-14', name: 'GPT-4.1' },
      { id: 'o3-2025-04-16', name: 'O3 Reasoning' }
    ];
    // Only use default for very first time ever - after that, persist whatever was chosen
    if (storedModel && models.some(m => m.id === storedModel)) {
      console.log('✅ Using stored model:', storedModel);
      return storedModel;
    } else if (storedModel === null) {
      // First time ever - use default and immediately save it
      console.log('🆕 First time - using default model: gpt-4o-mini');
      localStorage.setItem('selectedModel', 'gpt-4o-mini');
      return 'gpt-4o-mini';
    } else {
      // Invalid stored value - keep what they had or use current selection
      console.log('⚠️ Invalid stored model, keeping existing or default');
      return 'gpt-4o-mini';
    }
  });
  
  const [selectedPersona, setSelectedPersona] = useState<string>(() => {
    const storedPersona = localStorage.getItem('selectedPersona');
    console.log('🔄 Initializing persona from localStorage:', storedPersona);
    const personas = [
      { id: 'gunnar', name: 'Gunnar' },
      { id: 'samara', name: 'Samara' },
      { id: 'kirby', name: 'Kirby' },
      { id: 'stefan', name: 'Stefan' }
    ];
    // Only use default for very first time ever - after that, persist whatever was chosen
    if (storedPersona && personas.some(p => p.id === storedPersona)) {
      console.log('✅ Using stored persona:', storedPersona);
      return storedPersona;
    } else if (storedPersona === null) {
      // First time ever - use default and immediately save it
      console.log('🆕 First time - using default persona: gunnar');
      localStorage.setItem('selectedPersona', 'gunnar');
      return 'gunnar';
    } else {
      // Invalid stored value - keep what they had or use current selection
      console.log('⚠️ Invalid stored persona, keeping existing or default');
      return 'gunnar';
    }
  });
  
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const models = [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-5-2025-08-07', name: 'GPT-5' },
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

  // Save to localStorage whenever values change - true persistence
  useEffect(() => {
    console.log('💾 Saving model to localStorage:', selectedModel);
    localStorage.setItem('selectedModel', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    console.log('💾 Saving persona to localStorage:', selectedPersona);
    localStorage.setItem('selectedPersona', selectedPersona);
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
      console.log('🎯 Persona detected in message:', persona);
      if (selectedPersona !== persona) {
        console.log('🔄 Switching persona from', selectedPersona, 'to', persona);
        setSelectedPersona(persona);
      }
    } else {
      console.log('📝 No persona in message, keeping current:', selectedPersona);
    }
    // Keep current persona while typing - never auto-clear
  }, [message, selectedPersona]);

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      setPendingFiles(files);
      setShowUploadModal(true);
    }
  };

  const handleAbort = async () => {
    // Store the IDs we need to remove before clearing them
    const userMsgId = currentUserMessageId;
    const aiMsgId = currentTurnId;
    
    // Cancel the fetch request
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    
    // Clear tracking state immediately
    setCurrentUserMessageId(null);
    setCurrentTurnId(null);
    setIsLoading(false);
    
    // Remove both user and AI messages from UI
    setMessages(prev => prev.filter(msg => 
      msg.id !== userMsgId && msg.id !== aiMsgId
    ));
    
    // Clean up backend data if we have a turn ID
    if (currentTurnId) {
      try {
        await supabase.functions.invoke('abort-message-turn', {
          body: { entryId: currentTurnId }
        });
        
        toast.success('Message aborted successfully');
      } catch (error) {
        console.error('❌ Error during abort cleanup:', error);
        toast.error('Failed to clean up aborted message');
      }
    }
    
    // Reset states
    setCurrentTurnId(null);
    setCurrentUserMessageId(null);
    setIsLoading(false);
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
        // Process files for database conversion
        try {
          const functionName = category === 'journal' ? 'process-journal-upload' : 'process-persona-upload';
          const processResponse = await supabase.functions.invoke(functionName, {
            body: { uploadResults, category }
          });
          
          if (processResponse.error) {
            // Handle processing error silently
          } else {
            // Files processed successfully
          }
        } catch (error) {
          // Handle processing function error silently
        }
      }
    } catch (error) {
      // Handle upload error silently
    }
  };

  const extractGoogleSlidesUrls = (messageText: string): string[] => {
    const googleSlidesRegex = /https:\/\/docs\.google\.com\/presentation\/d\/[a-zA-Z0-9-_]+(?:\/[^?\s]*)?(?:\?[^#\s]*)?(?:#[^\s]*)?/g;
    return messageText.match(googleSlidesRegex) || [];
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const messageToSend = message.trim();
    
    // Check for Google Slides URLs and fetch them
    const googleSlidesUrls = extractGoogleSlidesUrls(messageToSend);
    if (googleSlidesUrls.length > 0) {
      try {
        for (const url of googleSlidesUrls) {
          console.log('🎯 Fetching Google Slides:', url);
          const response = await supabase.functions.invoke('google-slides-fetch', {
            body: { presentationUrl: url }
          });
          
          if (response.error) {
            console.error('Google Slides fetch error:', response.error);
            toast.error(`Failed to fetch Google Slides: ${response.error.message}`);
          } else {
            console.log('✅ Google Slides fetched:', response.data);
            toast.success(`Google Slides "${response.data.title}" saved to persistent attachments`);
          }
        }
      } catch (error) {
        console.error('Google Slides integration error:', error);
        toast.error('Failed to process Google Slides links');
      }
    }

    const userMessageId = Date.now().toString();
    const userMessage: Message = {
      id: userMessageId,
      content: messageToSend,
      persona: 'Boss',
      timestamp: getBerlinTime(),
      isUser: true,
      attachments: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    };

    console.log('📤 Creating user message with ID:', userMessageId);

    setMessage('');
    setUploadedFiles([]);
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Create AI message placeholder for streaming
    const aiMessageId = crypto.randomUUID();
    console.log('🤖 Creating AI message with ID:', aiMessageId);
    
    // Set tracking IDs BEFORE adding AI message
    setCurrentTurnId(aiMessageId);
    setCurrentUserMessageId(userMessageId);
    
    const aiMessage: Message = {
      id: aiMessageId,
      content: '', // Start empty for streaming
      persona: selectedPersona,
      timestamp: getBerlinTime(),
      isUser: false
    };

    setMessages(prev => [...prev, aiMessage]);

    try {
      // Format messages for OpenAI API
      const formattedMessages = [...messages, userMessage].map(msg => ({
        role: msg.isUser ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));
      
      console.log('🚀 Sending to backend - Model:', selectedModel, 'Persona:', selectedPersona);
      
      // For Supabase functions, we need to handle streaming differently
      // Since functions.invoke doesn't support streaming, we'll use fetch with auth headers
      const { data: { session } } = await supabase.auth.getSession();
      
      // Create abort controller for this request
      const controller = new AbortController();
      setAbortController(controller);
      
      const fetchResponse = await fetch('https://suncgglbheilkeimwuxt.supabase.co/functions/v1/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1bmNnZ2xiaGVpbGtlaW13dXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzQzNDEsImV4cCI6MjA3MzQ1MDM0MX0.Ua6POs3Agm3cuZOWzrQSrVG7w7rC3a49C38JclWQ9wA',
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: formattedMessages,
          model: selectedModel,
          persona: selectedPersona,
          userMessage: userMessage,
          turnId: aiMessageId
        }),
      });

      if (!fetchResponse.ok) {
        throw new Error(`HTTP error! status: ${fetchResponse.status}`);
      }

      if (!fetchResponse.body) {
        throw new Error('No response body available');
      }

      const reader = fetchResponse.body.getReader();
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

      // Backend now handles all superjournal writes - no frontend persistence needed

    } catch (error) {
      // Check if error is due to abort
      if (error.name === 'AbortError') {
        console.log('🛑 Request was aborted by user');
        return; // Don't show error message for user-initiated aborts
      }
      // Handle error silently
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, I encountered an error while processing your request.',
        persona: selectedPersona,
        timestamp: getBerlinTime(),
        isUser: false
      };
      
      // Replace the placeholder AI message with error message
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId ? errorMessage : msg
      ));
    } finally {
      setIsLoading(false);
      setCurrentTurnId(null);
      setCurrentUserMessageId(null);
      setAbortController(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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

  if (authLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">
            {authLoading ? 'Authenticating...' : 'Loading your messages...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-semibold text-foreground">Your Messages Are Protected</h2>
          <p className="text-muted-foreground max-w-md">
            Your chat history is safely stored and protected by authentication. 
            Please log in to access your messages.
          </p>
          <p className="text-sm text-muted-foreground">
            Don't worry - all your previous conversations are preserved and will load once you authenticate.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background relative">
      <div className="absolute top-4 right-4 z-50">
        <UserMenu />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} />
      </div>

      {/* Input Bar */}
      <div className="input-bar-container">
        <div className="input-bar-content">
          <div className={`flex flex-col flex-1 ${uploadedFiles.length > 0 ? 'gap-1' : ''}`}>
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-background/50 rounded border">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 bg-background rounded px-3 py-1 text-xxs border">
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
            <div className="flex items-center gap-1 ml-3 relative">
              <AbortButton 
                onAbort={handleAbort}
                isVisible={isLoading}
              />
              
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="chat-input flex-1 transition-all duration-200 focus:border-primary focus:ring-0"
              />
              
              <Button 
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
                className="send-btn focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/10 hover:text-primary"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Model Selection Controls */}
          <div className="model-controls">
            <div className="model-selectors justify-between w-full">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="attachment-btn hover:bg-primary/10 hover:text-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
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
                    <Button variant="ghost" size="sm" className="model-selector hover:bg-primary/5 hover:text-primary text-xs">
                      <ChevronDown className="h-3 w-3 mr-1" />
                      {models.find(m => m.id === selectedModel)?.name || 'GPT-5'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-background border text-xs" onCloseAutoFocus={(e) => e.preventDefault()}>
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
                        className="text-xs"
                      >
                        {model.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="model-selector hover:bg-primary/5 hover:text-primary text-xs">
                      <ChevronDown className="h-3 w-3 mr-1" />
                      {personas.find(p => p.id === selectedPersona)?.name || 'Gunnar'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-background border text-xs" onCloseAutoFocus={(e) => e.preventDefault()}>
                    {personas.map((persona) => (
                      <DropdownMenuItem
                        key={persona.id}
                        onClick={() => handlePersonaSelect(persona.id)}
                        className="text-xs"
                      >
                        {persona.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="status-indicator mr-[52px]" />
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
    </div>
  );
};

export default ChatInterface;
