import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getBerlinTimeISO, getBerlinTime } from '@/lib/timezone';

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

  // Load superjournal and journal entries on startup
  useEffect(() => {
    loadSuperjournalFromSupabase();
    loadJournalFromSupabase();
  }, []);

  const loadSuperjournalFromSupabase = async () => {
    try {
      
      const { data: entries, error } = await supabase
        .from('superjournal_entries')
        .select('*')
        .order('timestamp', { ascending: true });

      if (error) {
        // Handle superjournal load error silently
        return;
      }

      
      if (entries && entries.length > 0) {
        
        // Convert superjournal entries to messages format
        const superjournalMessages: Message[] = [];
        
        entries.forEach((entry, index) => {
          
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
        
        
        // Set messages from superjournal only if no messages exist yet
        setMessages(prev => {
          if (prev.length === 0) {
            return superjournalMessages;
          } else {
            return prev;
          }
        });
      }
      
    } catch (error) {
      // Handle superjournal load error silently
    }
  };

  const loadJournalFromSupabase = async () => {
    try {
      
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('timestamp', { ascending: true });

      if (error) {
        // Handle journal load error silently
        return;
      }

      
      if (entries && entries.length > 0) {
        const journalEntries = entries.map(entry => ({
          persona: entry.ai_response_persona,
          content: entry.ai_response_content
        }));
        
        setJournal(journalEntries);
      }
      
    } catch (error) {
      console.error('❌ Error loading journal entries:', error);
    }
  };

  const saveToJournal = async (userMessage: Message, aiMessage: Message, model: string, turnId?: string) => {
    // NOTE: This function is now deprecated in favor of Call 2 (artisan-cut-extraction)
    // Journal entries are now populated by the artisan cut extraction process
    // This function is kept for backward compatibility but should not be used in normal flow
    return true;
  };

  const saveToSuperjournal = async (userMessage: Message, aiMessage: Message, model: string, turnId?: string) => {
    
    try {
      const entryId = turnId || crypto.randomUUID();
      const timestamp = getBerlinTimeISO();

      
      const { error } = await supabase
        .from('superjournal_entries')
        .insert({
          entry_id: entryId,
          timestamp: timestamp,
          user_id: null, // No authentication needed
          user_message_content: userMessage.content,
          user_message_persona: userMessage.persona,
          user_message_attachments: userMessage.attachments || [],
          ai_response_content: aiMessage.content,
          ai_response_persona: aiMessage.persona,
          ai_response_model: model
        });

      if (error) {
        // Handle superjournal save error silently
        return false;
      }

      
      // Trigger Call 2 (Artisan Cut Extraction) in background - don't await
      triggerArtisanCutExtraction(userMessage, aiMessage, model, entryId);
      
      return true;
      
    } catch (error) {
      // Handle superjournal save error silently
      return false;
    }
  };

  const triggerArtisanCutExtraction = async (userMessage: Message, aiMessage: Message, model: string, entryId: string) => {
    try {
      
      const { error } = await supabase.functions.invoke('artisan-cut-extraction', {
        body: {
          userQuestion: userMessage.content,
          personaResponse: aiMessage.content,
          entryId,
          userPersona: userMessage.persona,
          aiPersona: aiMessage.persona,
          model
        }
      });

      if (error) {
        // Handle Call 2 error silently
      } else {
      }
    } catch (error) {
      // Handle Call 2 trigger error silently
    }
  };

  return {
    messages,
    journal,
    setMessages,
    setJournal,
    saveToSuperjournal,
    saveToJournal,
  };
};