import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [journal, setJournal] = useState<Array<{persona: string, content: string}>>([]);

  // Load superjournal on startup
  useEffect(() => {
    loadSuperjournalFromSupabase();
  }, []);

  const loadSuperjournalFromSupabase = async () => {
    try {
      console.log('📖 Loading superjournal from Supabase DB...');
      
      const { data: entries, error } = await supabase
        .from('superjournal_entries')
        .select('*')
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('❌ Error loading superjournal:', error);
        return;
      }

      console.log(`✅ Loaded ${entries?.length || 0} entries from superjournal`);
      
      if (entries && entries.length > 0) {
        console.log('🔍 First entry:', entries[0]);
        
        // Convert superjournal entries to messages format
        const superjournalMessages: Message[] = [];
        
        entries.forEach((entry, index) => {
          console.log(`🔄 Processing entry ${index + 1}:`, {
            id: entry.entry_id,
            userContent: entry.user_message_content?.substring(0, 50),
            aiContent: entry.ai_response_content?.substring(0, 50)
          });
          
          // Add user message
          superjournalMessages.push({
            id: entry.entry_id + '-user',
            content: entry.user_message_content,
            persona: entry.user_message_persona,
            timestamp: new Date(entry.timestamp),
            isUser: true,
            attachments: Array.isArray(entry.user_message_attachments) ? entry.user_message_attachments as Array<{
              fileName: string;
              publicUrl: string;
              originalName: string;
              size: number;
              type: string;
            }> : []
          });
          
          // Add AI response
          superjournalMessages.push({
            id: entry.entry_id + '-ai',
            content: entry.ai_response_content,
            persona: entry.ai_response_persona,
            timestamp: new Date(new Date(entry.timestamp).getTime() + 1000), // Add 1 second
            isUser: false
          });
        });
        
        console.log(`🎯 Created ${superjournalMessages.length} messages from ${entries.length} entries`);
        
        // Set messages from superjournal only if no messages exist yet
        setMessages(prev => {
          if (prev.length === 0) {
            console.log('📥 Loading', superjournalMessages.length, 'messages from superjournal');
            return superjournalMessages;
          } else {
            console.log('⚠️ Skipping superjournal load - messages already exist:', prev.length);
            return prev;
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Error loading superjournal:', error);
    }
  };

  const saveToSuperjournal = async (userMessage: Message, aiMessage: Message, model: string, turnId?: string) => {
    console.log('🚀 saveToSuperjournal called with:', {
      userContent: userMessage.content.substring(0, 50),
      aiContent: aiMessage.content.substring(0, 50),
      model,
      turnId
    });
    
    try {
      const entryId = turnId || crypto.randomUUID();
      const timestamp = new Date().toISOString();

      console.log('💾 About to save to superjournal DB:', {
        id: entryId,
        userContentLength: userMessage.content.length,
        aiContentLength: aiMessage.content.length
      });
      
      const { error } = await supabase
        .from('superjournal_entries')
        .insert({
          entry_id: entryId,
          timestamp: timestamp,
          user_message_content: userMessage.content,
          user_message_persona: userMessage.persona,
          user_message_attachments: userMessage.attachments || [],
          ai_response_content: aiMessage.content,
          ai_response_persona: aiMessage.persona,
          ai_response_model: model
        });

      if (error) {
        console.error('❌ Failed to save to superjournal:', error);
        return false;
      }

      console.log('✅ Conversation turn saved to superjournal DB');
      return true;
      
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