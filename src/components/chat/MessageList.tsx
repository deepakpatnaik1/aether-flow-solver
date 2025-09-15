import React, { useEffect, useLayoutEffect, useRef, useCallback } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'auto',
        block: 'end'
      });
    }
  }, []);

  const debouncedScrollToBottom = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(scrollToBottom, 10);
  }, [scrollToBottom]);

  // Handle new messages and content updates
  useLayoutEffect(() => {
    // Check if this is a new message vs content update
    if (messages.length > lastMessageCountRef.current) {
      // New message - use smooth scroll
      lastMessageCountRef.current = messages.length;
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }
    } else if (messages.length === lastMessageCountRef.current && messages.length > 0) {
      // Content update to existing message - use debounced instant scroll
      debouncedScrollToBottom();
    }
  }, [messages, debouncedScrollToBottom]);

  return (
    <div ref={containerRef} className="message-list overflow-y-auto">
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