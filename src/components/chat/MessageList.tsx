import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { PersonaBadge } from './PersonaBadge';
import { MarkdownRenderer } from './MarkdownRenderer';

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

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const parentContainerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number>();
  const lastScrollTimeRef = useRef(0);

  const performScroll = () => {
    const parent = messagesEndRef.current?.parentElement?.parentElement;
    if (parent) {
      // Use native scrollTo for better performance
      parent.scrollTo({
        top: parent.scrollHeight,
        behavior: 'auto'
      });
    }
  };

  const throttledScroll = () => {
    const now = Date.now();
    if (now - lastScrollTimeRef.current > 16) { // ~60fps throttling
      lastScrollTimeRef.current = now;
      performScroll();
    }
  };

  useEffect(() => {
    // Cancel any pending scroll
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    // Schedule scroll for next frame
    rafIdRef.current = requestAnimationFrame(throttledScroll);
    
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [messages]);

  return (
    <div className="message-list">
      {messages.map((message) => (
        <div key={message.id} className="message-container">
          <div className="flex items-center justify-between mb-2">
            <PersonaBadge persona={message.isUser ? 'Boss' : message.persona} />
            <span className="text-xs text-muted-foreground">
              {format(message.timestamp, 'HH:mm')}
            </span>
          </div>
          <div className="message-content">
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-3 space-y-2">
                {message.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-background/20 rounded border">
                    {attachment.type.startsWith('image/') ? (
                      <img 
                        src={attachment.publicUrl} 
                        alt={attachment.originalName}
                        className="max-w-64 max-h-64 object-contain rounded"
                      />
                    ) : (
                      <a 
                        href={attachment.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm hover:underline flex items-center gap-1"
                      >
                        📎 {attachment.originalName}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            <MarkdownRenderer 
              content={message.content} 
              persona={message.isUser ? 'boss' : message.persona}
            />
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};