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

  // Initialize conversation on mount
  useEffect(() => {
    initializeConversation();
  }, []);

  const initializeConversation = async () => {
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
    await loadMessages(currentConversation.id);
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