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
    type: string;
  }[];
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [journal, setJournal] = useState<Array<{persona: string, content: string}>>([]);

  // Load all data on mount - no auth required
  useEffect(() => {
    console.log('Loading all public data');
    loadSuperjournalFromSupabase();
    loadJournalFromSupabase();
  }, []);

  const loadSuperjournalFromSupabase = async () => {
    // No auth check - load all data
    
    try {
      const { data: entries, error } = await supabase
        .from('superjournal_entries')
        .select('*')
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error loading superjournal:', error);
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
    // No auth check - load all data
    
    try {
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error loading journal:', error);
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
    // DEPRECATED: Superjournal writes now handled entirely by backend edge function
    // This function maintained for backward compatibility but does nothing
    console.warn('⚠️ saveToSuperjournal is deprecated - backend handles all persistence');
    return true;
  };

  const triggerArtisanCutExtraction = async (userMessage: Message, aiMessage: Message, model: string, entryId: string) => {
    // DEPRECATED: Artisan cut extraction now triggered by backend
    // This function maintained for backward compatibility but does nothing
    console.warn('⚠️ triggerArtisanCutExtraction is deprecated - backend handles Call 2');
    return true;
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