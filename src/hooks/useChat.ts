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

export const useChat = (userId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [journal, setJournal] = useState<Array<{persona: string, content: string}>>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Load all data since RLS is disabled and no authentication required
  useEffect(() => {
    console.log('📊 useChat effect - loading all data without authentication');
    loadSuperjournalFromSupabase();
    loadJournalFromSupabase();
  }, []);

  const loadSuperjournalFromSupabase = async () => {
    console.log('🔍 Loading superjournal entries...');
    setIsDataLoading(true);
    
    try {
      const { data: entries, error } = await supabase
        .from('superjournal_entries')
        .select('*')
        .order('timestamp', { ascending: true });

      console.log('📊 Superjournal query result:', { entries: entries?.length, error });
      
      if (entries && entries.length > 0) {
        console.log('🔍 First few entries for debugging:', entries.slice(-5).map(e => ({
          entry_id: e.entry_id,
          timestamp: e.timestamp,
          user_content_preview: e.user_message_content?.substring(0, 50) + '...'
        })));
      }

      if (error) {
        console.error('❌ Error loading superjournal:', error);
        setIsDataLoading(false);
        return;
      }

      if (entries && entries.length > 0) {
        console.log('✅ Found', entries.length, 'superjournal entries');
        
        // Convert superjournal entries to messages format
        const superjournalMessages: Message[] = [];
        
        entries.forEach((entry, index) => {
          console.log(`Processing entry ${index + 1}/${entries.length}:`, {
            entry_id: entry.entry_id,
            timestamp: entry.timestamp,
            user_content: entry.user_message_content?.substring(0, 30) + '...'
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
        
        console.log('🎯 Setting', superjournalMessages.length, 'messages in state');
        console.log('📋 Message timestamps:', superjournalMessages.map(m => ({ id: m.id, timestamp: m.timestamp })));
        setMessages(superjournalMessages);
      } else {
        console.log('📭 No superjournal entries found');
      }
      
    } catch (error) {
      console.error('💥 Error in loadSuperjournalFromSupabase:', error);
    } finally {
      setIsDataLoading(false);
    }
  };

  const loadJournalFromSupabase = async () => {
    console.log('🔍 Loading journal entries...');
    
    try {
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('timestamp', { ascending: true });

      console.log('📊 Journal query result:', { entries: entries?.length, error });

      if (error) {
        console.error('❌ Error loading journal:', error);
        return;
      }

      if (entries && entries.length > 0) {
        const journalEntries = entries.map(entry => ({
          persona: entry.ai_response_persona,
          content: entry.ai_response_content
        }));
        
        console.log('✅ Setting', journalEntries.length, 'journal entries');
        setJournal(journalEntries);
      }
      
    } catch (error) {
      console.error('💥 Error loading journal entries:', error);
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
    isDataLoading,
    saveToSuperjournal,
    saveToJournal,
  };
};