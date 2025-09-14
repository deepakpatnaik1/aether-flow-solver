import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSendMessage = async () => {
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

      const response = await fetch('/functions/v1/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedContent += parsed.content;
                
                // Update the assistant message with accumulated content
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
              onKeyPress={handleKeyPress}
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
              
              <Button variant="ghost" size="sm" className="model-selector">
                <ChevronDown className="h-3 w-3 mr-1" />
                Claude Sonnet 4
              </Button>
              
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