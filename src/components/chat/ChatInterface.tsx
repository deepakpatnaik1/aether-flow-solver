import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MessageList } from './MessageList';
import { PersonaBadge } from './PersonaBadge';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const models = [
    { id: 'gpt-5-2025-08-07', name: 'GPT-5' },
    { id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini' },
    { id: 'gpt-4.1-2025-04-14', name: 'GPT-4.1' },
    { id: 'o3-2025-04-16', name: 'O3 Reasoning' }
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

    try {
      // Create assistant message that will be updated with streaming content
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        content: '',
        persona: 'Samara',
        timestamp: new Date(),
        isUser: false
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Prepare messages for OpenAI API
      const apiMessages = messages.concat(userMessage).map(msg => ({
        role: msg.isUser ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));

      // Add the current user message
      apiMessages.push({
        role: 'user' as const,
        content: currentMessage
      });

      // Try different possible URL patterns for Supabase edge functions
      const possibleUrls = [
        'https://f29e4c08-30c0-496d-946c-bdd3be783b28.supabase.co/functions/v1/chat-stream',
        '/functions/v1/chat-stream',
        `${window.location.origin}/functions/v1/chat-stream`
      ];

      let response;
      let lastError;
      
      console.log('Attempting to call chat API with URLs:', possibleUrls);
      
      for (const url of possibleUrls) {
        try {
          console.log('Trying URL:', url);
          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: apiMessages,
              model: selectedModel
            }),
          });
          
          console.log('Response received:', response.status, response.statusText);
          if (response.ok) break;
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
          console.log('Fetch error for URL', url, ':', error);
          lastError = error as Error;
          continue;
        }
      }

      if (!response || !response.ok) {
        throw lastError || new Error('All URL attempts failed');
      }

      const data = await response.json();

      if (data.response) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: data.response }
              : msg
          )
        );
      } else {
        throw new Error('No response content received');
      }
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
                <DropdownMenuContent>
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
              
              <Button variant="ghost" size="sm" className="model-selector">
                <ChevronDown className="h-3 w-3 mr-1" />
                User
              </Button>
              
              <Button variant="ghost" size="sm" className="model-selector">
                <ChevronDown className="h-3 w-3 mr-1" />
                Rainy Night
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