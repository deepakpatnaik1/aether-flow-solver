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
    
    // Add mock messages for testing when no auth (temporary)
    setTimeout(() => {
      setMessages(prev => {
        if (prev.length === 0) {
          return [
            {
              id: 'mock-1',
              content: 'These institutes could provide valuable insights, data, and credibility for your consortium. Let me know if you need more information about any of them!',
              persona: 'Boss',
              timestamp: new Date(Date.now() - 60000),
              isUser: true
            },
            {
              id: 'mock-2', 
              content: 'Gunnar, send a blank email to my wife.',
              persona: 'Gunnar',
              timestamp: new Date(Date.now() - 30000),
              isUser: false
            },
            {
              id: 'mock-3',
              content: 'I can\'t send emails directly, but I can help you draft one. Here\'s a simple template you can use:',
              persona: 'Gunnar', 
              timestamp: new Date(Date.now() - 15000),
              isUser: false
            }
          ];
        }
        return prev;
      });
    }, 1000);
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

  const loadJournalFromSupabase = async () => {
    try {
      console.log('📖 Loading journal entries from Supabase DB...');
      
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('❌ Error loading journal entries:', error);
        return;
      }

      console.log(`✅ Loaded ${entries?.length || 0} journal entries`);
      
      if (entries && entries.length > 0) {
        const journalEntries = entries.map(entry => ({
          persona: entry.ai_response_persona,
          content: entry.ai_response_content
        }));
        
        setJournal(journalEntries);
        console.log('📥 Loaded', journalEntries.length, 'journal entries');
      }
      
    } catch (error) {
      console.error('❌ Error loading journal entries:', error);
    }
  };

  const saveToJournal = async (userMessage: Message, aiMessage: Message, model: string, turnId?: string) => {
    // NOTE: This function is now deprecated in favor of Call 2 (artisan-cut-extraction)
    // Journal entries are now populated by the artisan cut extraction process
    // This function is kept for backward compatibility but should not be used in normal flow
    console.log('⚠️ saveToJournal called - should be handled by Call 2 instead');
    return true;
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
      const timestamp = getBerlinTimeISO();

      console.log('💾 About to save to superjournal DB:', {
        id: entryId,
        userContentLength: userMessage.content.length,
        aiContentLength: aiMessage.content.length
      });
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('superjournal_entries')
        .insert({
          entry_id: entryId,
          timestamp: timestamp,
          user_id: user?.id,
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
      
      // Trigger Call 2 (Artisan Cut Extraction) in background - don't await
      triggerArtisanCutExtraction(userMessage, aiMessage, model, entryId);
      
      return true;
      
    } catch (error) {
      console.error('❌ Superjournal save error:', error);
      return false;
    }
  };

  const triggerArtisanCutExtraction = async (userMessage: Message, aiMessage: Message, model: string, entryId: string) => {
    try {
      console.log('🔍 Triggering Call 2 - Artisan Cut Extraction for:', entryId);
      
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
        console.error('❌ Call 2 failed:', error);
      } else {
        console.log('✅ Call 2 triggered successfully for:', entryId);
      }
    } catch (error) {
      console.error('❌ Error triggering Call 2:', error);
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