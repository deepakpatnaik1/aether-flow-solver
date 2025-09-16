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
  model?: string;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [journal, setJournal] = useState<Array<{persona: string, content: string}>>([]);

  // Load journal entries on startup (if needed for existing functionality)
  useEffect(() => {
    loadJournalFromSupabase();
  }, []);

  const loadJournalFromSupabase = async () => {
    try {
      console.log('📖 Loading journal entries from past_journals_full...');
      
      const { data: entries, error } = await supabase
        .from('past_journals_full')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading journal entries:', error);
        return;
      }

      console.log(`✅ Loaded ${entries?.length || 0} journal entries`);
      
      if (entries && entries.length > 0) {
        const journalEntries = entries.map(entry => ({
          persona: 'journal',
          content: entry.content
        }));
        
        setJournal(journalEntries);
        console.log('📥 Loaded', journalEntries.length, 'journal entries');
      }
      
    } catch (error) {
      console.error('❌ Error loading journal entries:', error);
    }
  };

  return { 
    messages, 
    journal, 
    setMessages, 
    setJournal, 
  };
};