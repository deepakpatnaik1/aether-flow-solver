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

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export const useChat = () => {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [journal, setJournal] = useState<Array<{persona: string, content: string}>>([]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
      loadJournalEntries(currentConversationId);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    setConversations(data || []);
    
    // Auto-select the most recent conversation or create a new one
    if (data && data.length > 0) {
      setCurrentConversationId(data[0].id);
    } else {
      createNewConversation();
    }
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

  const createNewConversation = async (title?: string) => {
    const { data, error } = await supabase
      .from('conversations')
      .insert([{ title: title || 'New Chat' }])
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return;
    }

    setCurrentConversationId(data.id);
    setMessages([]);
    setJournal([]);
    loadConversations(); // Refresh the conversations list
  };

  const saveMessage = async (message: Message, attachments?: any[]) => {
    if (!currentConversationId) return;

    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .insert([{
        conversation_id: currentConversationId,
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
      .eq('id', currentConversationId);

    return messageData.id;
  };

  const saveJournalEntries = async (entries: Array<{persona: string, content: string}>) => {
    if (!currentConversationId || entries.length === 0) return;

    const journalInserts = entries.map(entry => ({
      conversation_id: currentConversationId,
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
    currentConversationId,
    messages,
    conversations,
    journal,
    setMessages,
    setJournal,
    createNewConversation,
    saveMessage,
    saveJournalEntries,
    loadConversations,
    setCurrentConversationId,
  };
};