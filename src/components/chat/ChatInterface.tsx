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
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: message,
      persona: 'User',
      timestamp: new Date(),
      isUser: true
    };

    setMessages([...messages, newMessage]);
    setMessage('');
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
              disabled={!message.trim()}
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