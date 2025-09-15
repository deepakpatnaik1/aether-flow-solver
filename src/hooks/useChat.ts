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
      console.log('📖 Loading superjournal from R2...');
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/superjournal?action=load`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      });

      console.log('📡 Superjournal load response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('📊 Superjournal response:', responseData);
        const { entries } = responseData;
        console.log(`✅ Loaded ${entries.length} entries from superjournal`);
        
        if (entries.length > 0) {
          console.log('🔍 First entry:', entries[0]);
        }
        
        // Convert superjournal entries to messages format
        const superjournalMessages: Message[] = [];
        
        entries.forEach((entry: any, index: number) => {
          console.log(`🔄 Processing entry ${index + 1}:`, {
            id: entry.id,
            userContent: entry.userMessage?.content?.substring(0, 50),
            aiContent: entry.aiResponse?.content?.substring(0, 50)
          });
          
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
        
        console.log(`🎯 Created ${superjournalMessages.length} messages from ${entries.length} entries`);
        
        // Set messages from superjournal
        setMessages(superjournalMessages);
        
      } else {
        const errorText = await response.text();
        console.warn('⚠️ Failed to load superjournal:', response.status, errorText);
      }
      
    } catch (error) {
      console.error('❌ Error loading superjournal:', error);
    }
  };

  const saveToSuperjournal = async (userMessage: Message, aiMessage: Message, model: string) => {
    console.log('🚀 saveToSuperjournal called with:', {
      userContent: userMessage.content.substring(0, 50),
      aiContent: aiMessage.content.substring(0, 50),
      model
    });
    
    try {
      const journalEntry = {
        id: crypto.randomUUID(),
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

      console.log('💾 About to POST to superjournal with entry:', {
        id: journalEntry.id,
        userContentLength: journalEntry.userMessage.content.length,
        aiContentLength: journalEntry.aiResponse.content.length
      });
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/superjournal?action=append`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(journalEntry),
      });

      console.log('📡 Superjournal response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Conversation turn saved to superjournal:', responseData);
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to save to superjournal:', response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Superjournal save error:', error);
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