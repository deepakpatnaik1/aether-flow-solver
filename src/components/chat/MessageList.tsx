import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersonaBadge } from './PersonaBadge';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useToast } from '@/hooks/use-toast';

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
  const scrollPendingRef = useRef(false);
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        description: "Copied to clipboard",
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Debounce scroll using requestAnimationFrame to prevent flicker during streaming
    if (!scrollPendingRef.current) {
      scrollPendingRef.current = true;
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
        scrollPendingRef.current = false;
      });
    }
  }, [messages]);

  return (
    <div className="message-list">
      {messages.map((message) => (
        <div key={message.id} className="message-container group">
          <div className="flex items-center justify-between mb-1">
            <PersonaBadge persona={message.isUser ? 'Boss' : message.persona} />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="copy-button h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                onClick={() => copyToClipboard(message.content)}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {format(message.timestamp, 'HH:mm')}
              </span>
            </div>
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