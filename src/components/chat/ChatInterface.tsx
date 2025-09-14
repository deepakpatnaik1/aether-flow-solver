import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MessageList } from './MessageList';
import { PersonaBadge } from './PersonaBadge';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  persona: string;
  timestamp: Date;
  isUser?: boolean;
}

const ChatInterface = () => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-5-2025-08-07');
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);

  // Load persona from localStorage on mount
  useEffect(() => {
    console.log('=== LOAD EFFECT RUNNING ===');
    const storedPersona = localStorage.getItem('selectedPersona');
    console.log('Loading stored persona:', storedPersona);
    console.log('Current selectedPersona state:', selectedPersona);
    if (storedPersona && personas.some(p => p.id === storedPersona)) {
      console.log('Setting selectedPersona to:', storedPersona);
      setSelectedPersona(storedPersona);
      console.log('Set persona from storage:', storedPersona);
    } else {
      console.log('Not setting persona - storedPersona:', storedPersona, 'personas match:', personas.some(p => p.id === storedPersona));
    }
  }, []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);

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

  const handleSendMessage = async () => {
    console.log('handleSendMessage called with message:', message);
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      persona: 'Boss',
      timestamp: new Date(),
      isUser: true
    };

    const currentMessage = message;
    setMessage('');
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Use the Supabase client to call the edge function
    try {
      console.log('Calling chat-stream edge function...');
      
      // Format messages for OpenAI API
      const formattedMessages = [...messages, userMessage].map(msg => ({
        role: msg.isUser ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));
      
      const { data, error } = await supabase.functions.invoke('chat-stream', {
        body: {
          messages: formattedMessages,
          model: selectedModel
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data?.response) {
        throw new Error('No response from AI');
      }

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        content: data.response,
        persona: selectedModel,
        timestamp: new Date(),
        isUser: false
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error:', error);
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, I encountered an error while processing your request.',
        persona: 'Samara',
        timestamp: new Date(),
        isUser: false
      };
      setMessages(prev => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    console.log('Key pressed:', e.key);
    if (e.key === 'Enter' && !e.shiftKey) {
      console.log('Enter pressed, calling handleSendMessage');
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Sync persona dropdown with input text
  useEffect(() => {
    console.log('=== SYNC EFFECT RUNNING ===');
    console.log('Current message:', message);
    console.log('Current selectedPersona:', selectedPersona);
    
    const addressingMatch = message.match(/^(Gunnar|Samara|Kirby|Stefan),?\s*/i);
    if (addressingMatch) {
      const persona = addressingMatch[1].toLowerCase();
      console.log('Found addressing match, persona:', persona);
      if (selectedPersona !== persona) {
        console.log('Setting selectedPersona to:', persona);
        setSelectedPersona(persona);
      }
    } else if (selectedPersona && message.length > 0 && !message.startsWith(selectedPersona)) {
      // Only clear persona if user is actively typing and not addressing the selected persona
      console.log('CLEARING selectedPersona because message does not start with persona');
      setSelectedPersona(null);
    }
    console.log('=== SYNC EFFECT END ===');
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

  // Save persona to localStorage whenever it changes
  useEffect(() => {
    if (selectedPersona) {
      localStorage.setItem('selectedPersona', selectedPersona);
      console.log('Saved persona to localStorage:', selectedPersona);
    }
  }, [selectedPersona]);

  const handlePersonaSelect = (personaId: string) => {
    console.log('=== HANDLE PERSONA SELECT ===');
    console.log('Selected personaId:', personaId);
    const persona = personas.find(p => p.id === personaId);
    console.log('Found persona object:', persona);
    if (persona) {
      console.log('Setting selectedPersona to:', personaId);
      setSelectedPersona(personaId);
      setMessage(`${persona.name}, `);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} />
      </div>

      {/* Input Bar */}
      <div className="input-bar-container">
        <div className="input-bar-content">
          <div className="flex items-center gap-2 flex-1">
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
          
          {/* Model Selection Controls */}
          <div className="model-controls">
            <div className="model-selectors">
              <Button 
                variant="ghost" 
                size="sm"
                className="attachment-btn"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              
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