import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MessageList } from './MessageList';
import { PersonaBadge } from './PersonaBadge';
import { supabase } from '@/integrations/supabase/client';
import { useChat } from '@/hooks/useChat';

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
  const [selectedModel, setSelectedModel] = useState('gpt-5-2025-08-07');
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    currentConversationId,
    messages,
    conversations,
    journal,
    setMessages,
    setJournal,
    createNewConversation,
    saveMessage,
    saveJournalEntries,
    setCurrentConversationId,
  } = useChat();

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

  const models = [
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

  const handleFileUpload = async (files: FileList) => {
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);

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
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      persona: 'Boss',
      timestamp: new Date(),
      isUser: true,
      attachments: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    };

    const currentMessage = message;
    setMessage('');
    setUploadedFiles([]);
    
    // Add message to local state immediately for better UX
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Save user message to database
      await saveMessage(userMessage, uploadedFiles);

      // Format messages for OpenAI API
      const formattedMessages = [...messages, userMessage].map(msg => ({
        role: msg.isUser ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));
      
      const { data, error } = await supabase.functions.invoke('chat-stream', {
        body: {
          messages: formattedMessages,
          model: selectedModel,
          persona: selectedPersona || 'gunnar',
          journal: journal
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data?.response) {
        throw new Error('No response from AI');
      }

      // Create AI message with persona response  
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        content: data.response,
        persona: selectedPersona || 'gunnar',
        timestamp: new Date(),
        isUser: false
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Save AI message to database
      await saveMessage(aiMessage);

      // Store essence extract in journal for context
      if (data.essence) {
        const essenceLines = data.essence.split('\n').filter((line: string) => line.trim());
        const newJournalEntries = essenceLines.map((line: string) => ({
          persona: line.split(':')[0]?.trim() || 'Unknown',
          content: line.split(':').slice(1).join(':').trim() || line
        }));
        
        setJournal(prev => [...prev, ...newJournalEntries]);
        
        // Save journal entries to database
        await saveJournalEntries(newJournalEntries);
      }
    } catch (error) {
      console.error('Error:', error);
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, I encountered an error while processing your request.',
        persona: selectedPersona || 'gunnar',
        timestamp: new Date(),
        isUser: false
      };
      setMessages(prev => [...prev.slice(0, -1), errorMessage]);
      await saveMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Sync persona dropdown with input text
  useEffect(() => {
    const addressingMatch = message.match(/^(Gunnar|Samara|Kirby|Stefan),?\s*/i);
    if (addressingMatch) {
      const persona = addressingMatch[1].toLowerCase();
      if (selectedPersona !== persona) {
        setSelectedPersona(persona);
      }
    } else if (selectedPersona && message.length > 0 && !message.startsWith(selectedPersona)) {
      // Only clear persona if user is actively typing and not addressing the selected persona
      setSelectedPersona(null);
    }
  }, [message, selectedPersona]);

  useEffect(() => {
    const handleWindowFocus = () => {
      inputRef.current?.focus();
    };

    window.addEventListener('focus', handleWindowFocus);
    
    // Focus on initial load
    inputRef.current?.focus();

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
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

  const handlePersonaSelect = (personaId: string) => {
    const persona = personas.find(p => p.id === personaId);
    if (persona) {
      setSelectedPersona(personaId);
      setMessage(`${persona.name}, `);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header with conversations */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className="h-4 w-4 mr-1" />
                {conversations.find(c => c.id === currentConversationId)?.title || 'Select Chat'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-background border">
              {conversations.map((conversation) => (
                <DropdownMenuItem
                  key={conversation.id}
                  onClick={() => setCurrentConversationId(conversation.id)}
                >
                  {conversation.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => createNewConversation()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
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
                className="chat-input flex-1"
              />
              
              <Button 
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
                className="send-btn"
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
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileUpload(e.target.files);
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
                <DropdownMenuContent className="bg-background border">
                  {models.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
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
                    {selectedPersona && personas.find(p => p.id === selectedPersona)?.name || 'Persona'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-background border">
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
              
              <Button variant="ghost" size="sm" className="model-selector">
                <ChevronDown className="h-3 w-3 mr-1" />
                User
              </Button>
            </div>
            
            <div className="status-indicator" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;