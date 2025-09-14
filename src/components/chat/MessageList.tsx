import React from 'react';
import { PersonaBadge } from './PersonaBadge';

interface Message {
  id: string;
  content: string;
  persona: string;
  timestamp: Date;
  isUser?: boolean;
}

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <div className="message-list">
      {messages.map((message) => (
        <div key={message.id} className="message-container">
          {!message.isUser && (
            <PersonaBadge persona={message.persona} />
          )}
          <div className="message-content">
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
                return (
                  <div key={index} className="message-bullet">
                    {line}
                  </div>
                );
              }
              // Handle sub-bullets
              if (line.startsWith('  ◦ ')) {
                return (
                  <div key={index} className="message-sub-bullet">
                    {line}
                  </div>
                );
              }
              // Regular text
              if (line.trim()) {
                return (
                  <p key={index} className="message-text">
                    {line}
                  </p>
                );
              }
              // Empty lines
              return <br key={index} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
};