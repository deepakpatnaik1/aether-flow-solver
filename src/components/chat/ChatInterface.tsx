import React, { useState } from 'react';
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'What is a comet?',
      persona: 'User',
      timestamp: new Date(),
      isUser: true
    },
    {
      id: '2',
      content: `A comet is a celestial object made up of ice, dust, and rocky material that orbits the Sun. Here are the key characteristics of comets:

## Composition
• **Nucleus**: A solid core of frozen gases (like water, carbon dioxide, methane), dust, and rock particles
• Often described as a "dirty snowball" or "icy dirtball"

## Behavior
• Most comets have highly elliptical orbits that take them far from the Sun and then back again
• When a comet approaches the Sun, solar radiation causes the ice to vaporize, creating:
  ◦ **A coma**: A glowing atmosphere around the nucleus
  ◦ **Tails**: Streams of gas and dust that can extend millions of miles, always pointing away from the Sun due to solar wind

## Origins
• Most come from two regions:
  ◦ **Kuiper Belt**: Beyond Neptune's orbit (short-period comets)
  ◦ **Oort Cloud**: A distant spherical shell around our solar system (long-period comets)

## Famous Examples
• Halley's Comet (returns every 76 years)
• Comet Hale-Bopp
• Comet NEOWISE

Comets are considered remnants from the early solar system, preserving materials from about 4.6 billion years ago, making them valuable for understanding our cosmic origins.`,
      persona: 'Samara',
      timestamp: new Date()
    }
  ]);

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
            <Button 
              variant="ghost" 
              size="sm"
              className="attachment-btn"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Input
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
            <Button variant="outline" size="sm" className="model-selector">
              Claude Sonnet 4
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
            
            <Button variant="outline" size="sm" className="model-selector">
              User
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
            
            <Button variant="outline" size="sm" className="model-selector">
              Rainy Night
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
            
            <div className="status-indicator" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;