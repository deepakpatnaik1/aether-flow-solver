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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [journal, setJournal] = useState<Array<{persona: string, content: string}>>([]);
  const [superjournalLoaded, setSuperjournalLoaded] = useState(false);

  // Initialize conversation on mount
  useEffect(() => {
    initializeConversation();
  }, []);

  // Load superjournal from R2 on startup
  useEffect(() => {
    loadSuperjournalFromR2();
  }, []);

  const loadSuperjournalFromR2 = async () => {
    try {
      console.log('📖 Loading superjournal from R2...');
      
      const response = await fetch(`https://suncgglbheilkeimwuxt.supabase.co/functions/v1/superjournal?action=load`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1bmNnZ2xiaGVpbGtlaW13dXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzQzNDEsImV4cCI6MjA3MzQ1MDM0MX0.Ua6POs3Agm3cuZOWzrQSrVG7w7rC3a49C38JclWQ9wA`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1bmNnZ2xiaGVpbGtlaW13dXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzQzNDEsImV4cCI6MjA3MzQ1MDM0MX0.Ua6POs3Agm3cuZOWzrQSrVG7w7rC3a49C38JclWQ9wA',
        },
      });

      if (response.ok) {
        const { entries } = await response.json();
        console.log(`✅ Loaded ${entries.length} entries from superjournal`);
        
        // Convert superjournal entries to messages format
        const superjournalMessages: Message[] = [];
        
        entries.forEach((entry: any) => {
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
        
        // Set messages from superjournal (this will be the scrollback)
        setMessages(superjournalMessages);
        setSuperjournalLoaded(true);
        
      } else {
        console.warn('⚠️ Failed to load superjournal, falling back to database');
        setSuperjournalLoaded(true);
      }
      
    } catch (error) {
      console.error('❌ Error loading superjournal:', error);
      setSuperjournalLoaded(true);
    }
  };

  const initializeConversation = async () => {
    // Only initialize from database if superjournal hasn't loaded yet
    if (superjournalLoaded) {
      console.log('🏃‍♂️ Skipping database load - superjournal already loaded');
      return;
    }
    
    // Try to get or create a single conversation
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error loading conversation:', error);
      return;
    }

    let currentConversation;
    
    if (data && data.length > 0) {
      // Use existing conversation
      currentConversation = data[0];
    } else {
      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert([{ title: 'Chat' }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        return;
      }
      
      currentConversation = newConversation;
    }

    setConversationId(currentConversation.id);
    
    // Only load messages from DB if superjournal didn't load
    if (!superjournalLoaded) {
      await loadMessages(currentConversation.id);
    }
    await loadJournalEntries(currentConversation.id);
  };

  const loadMessages = async (conversationId: string) => {
    const { data: messagesData, error: messagesError } = await supabase
      .from('chat_messages')
      .select(`
        *,
        file_attachments (*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error loading messages:', messagesError);
      return;
    }

    const formattedMessages: Message[] = (messagesData || []).map(msg => ({
      id: msg.id,
      content: msg.content,
      persona: msg.persona,
      timestamp: new Date(msg.created_at),
      isUser: msg.is_user,
      attachments: msg.file_attachments?.map((att: any) => ({
        fileName: att.file_name,
        publicUrl: att.public_url,
        originalName: att.original_name,
        size: att.file_size,
        type: att.file_type,
      })) || undefined
    }));

    setMessages(formattedMessages);
  };

  const loadJournalEntries = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading journal:', error);
      return;
    }

    const formattedJournal = (data || []).map(entry => ({
      persona: entry.persona,
      content: entry.content
    }));

    setJournal(formattedJournal);
  };

  const saveMessage = async (message: Message, attachments?: any[]) => {
    if (!conversationId) return;

    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .insert([{
        conversation_id: conversationId,
        content: message.content,
        persona: message.persona,
        is_user: message.isUser || false,
      }])
      .select()
      .single();

    if (messageError) {
      console.error('Error saving message:', messageError);
      return;
    }

    // Save attachments if any
    if (attachments && attachments.length > 0) {
      const attachmentInserts = attachments.map(att => ({
        message_id: messageData.id,
        file_name: att.fileName,
        public_url: att.publicUrl,
        original_name: att.originalName,
        file_size: att.size,
        file_type: att.type,
      }));

      const { error: attachmentError } = await supabase
        .from('file_attachments')
        .insert(attachmentInserts);

      if (attachmentError) {
        console.error('Error saving attachments:', attachmentError);
      }
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return messageData.id;
  };

  const saveJournalEntries = async (entries: Array<{persona: string, content: string}>) => {
    if (!conversationId || entries.length === 0) return;

    const journalInserts = entries.map(entry => ({
      conversation_id: conversationId,
      persona: entry.persona,
      content: entry.content,
    }));

    const { error } = await supabase
      .from('journal_entries')
      .insert(journalInserts);

    if (error) {
      console.error('Error saving journal entries:', error);
    }
  };

  return {
    messages,
    journal,
    setMessages,
    setJournal,
    saveMessage,
    saveJournalEntries,
  };
};