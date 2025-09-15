import React, { useEffect, useRef } from 'react';
import { PersonaBadge } from './PersonaBadge';

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

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div ref={containerRef} className="message-list">
      {messages.map((message) => (
        <div key={message.id} className="message-container">
          <PersonaBadge persona={message.isUser ? 'Boss' : message.persona} />
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
            {message.content.split('\n').map((line, index) => {
              // Handle headers
              if (line.startsWith('## ')) {
                return (
                  <h3 key={index} className="message-header">
                    {line.replace('## ', '')}
                  </h3>
                );
              }
              // Handle bullet points
              if (line.startsWith('• ')) {
                let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                processedLine = processedLine.replace(/\*([^*]+)\*/g, '<em>$1</em>');
                return (
                  <div key={index} className="message-bullet" dangerouslySetInnerHTML={{ __html: processedLine }} />
                );
              }
              // Handle sub-bullets
              if (line.startsWith('  ◦ ')) {
                let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                processedLine = processedLine.replace(/\*([^*]+)\*/g, '<em>$1</em>');
                return (
                  <div key={index} className="message-sub-bullet" dangerouslySetInnerHTML={{ __html: processedLine }} />
                );
              }
              // Regular text
              if (line.trim()) {
                let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                processedLine = processedLine.replace(/\*([^*]+)\*/g, '<em>$1</em>');
                return (
                  <p key={index} className="message-text" dangerouslySetInnerHTML={{ __html: processedLine }} />
                );
              }
              // Empty lines
              return <br key={index} />;
            })}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};