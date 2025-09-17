import { useState, useEffect } from 'react';

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

const SUPABASE_URL = 'https://suncgglbheilkeimwuxt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1bmNnZ2xiaGVpbGtlaW13dXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzQzNDEsImV4cCI6MjA3MzQ1MDM0MX0.Ua6POs3Agm3cuZOWzrQSrVG7w7rC3a49C38JclWQ9wA';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [journal, setJournal] = useState<Array<{persona: string, content: string}>>([]);

  // Load superjournal on startup
  useEffect(() => {
    loadSuperjournalFromR2();
  }, []);

  const loadSuperjournalFromR2 = async () => {
    try {
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/superjournal?action=load`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      });


      if (response.ok) {
        const responseData = await response.json();
        const { entries } = responseData;
        
        // Convert superjournal entries to messages format
        const superjournalMessages: Message[] = [];
        
        entries.forEach((entry: any, index: number) => {
          
          // Add user message
          superjournalMessages.push({
            id: entry.id + '-user',
            content: entry.userMessage.content,
            persona: entry.userMessage.persona,
            timestamp: new Date(entry.timestamp),
            isUser: true,
            attachments: entry.userMessage.attachments
          });
          
          // Add AI response
          superjournalMessages.push({
            id: entry.id + '-ai',
            content: entry.aiResponse.content,
            persona: entry.aiResponse.persona,
            timestamp: new Date(new Date(entry.timestamp).getTime() + 1000), // Add 1 second
            isUser: false
          });
        });
        
        
        // Set messages from superjournal only if no messages exist yet
        setMessages(prev => {
          if (prev.length === 0) {
            return superjournalMessages;
          } else {
            return prev;
          }
        });
        
      } else {
        // Failed to load superjournal
      }
      
    } catch (error) {
      // Handle superjournal load error silently
    }
  };

  const saveToSuperjournal = async (userMessage: Message, aiMessage: Message, model: string, turnId?: string) => {
    
    try {
      const journalEntry = {
        id: turnId || crypto.randomUUID(), // Use provided turnId or generate new one
        timestamp: new Date().toISOString(),
        userMessage: {
          content: userMessage.content,
          persona: userMessage.persona,
          attachments: userMessage.attachments
        },
        aiResponse: {
          content: aiMessage.content,
          persona: aiMessage.persona,
          model: model
        }
      };

      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/superjournal?action=append`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(journalEntry),
      });


      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  return {
    messages,
    journal,
    setMessages,
    setJournal,
    saveToSuperjournal,
  };
};