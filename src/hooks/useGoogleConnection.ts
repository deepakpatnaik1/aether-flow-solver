import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GoogleConnectionStatus {
  isConnected: boolean;
  userEmail?: string;
  scopes?: string[];
  isLoading: boolean;
}

export const useGoogleConnection = () => {
  const [status, setStatus] = useState<GoogleConnectionStatus>({
    isConnected: false,
    isLoading: true,
  });

  const checkConnection = async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true }));
      
      const { data, error } = await supabase
        .from('google_tokens')
        .select('user_email, scope, expires_at')
        .limit(1);

      if (error) {
        console.error('Error checking Google connection:', error);
        setStatus({ isConnected: false, isLoading: false });
        return;
      }

      if (data && data.length > 0) {
        const tokenData = data[0];
        const isExpired = new Date(tokenData.expires_at) < new Date();
        
        setStatus({
          isConnected: !isExpired,
          userEmail: tokenData.user_email,
          scopes: tokenData.scope?.split(' ') || [],
          isLoading: false,
        });
      } else {
        setStatus({ isConnected: false, isLoading: false });
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      setStatus({ isConnected: false, isLoading: false });
    }
  };

  const sendEmail = async (to: string, subject: string, body: string) => {
    if (!status.isConnected || !status.userEmail) {
      throw new Error('Google account not connected');
    }

    const { data, error } = await supabase.functions.invoke('google-gmail', {
      body: {
        to,
        subject,
        body,
        isHtml: true,
        userEmail: status.userEmail,
      },
    });

    if (error) throw error;
    return data;
  };

  const createDocument = async (title: string, content: string) => {
    if (!status.isConnected || !status.userEmail) {
      throw new Error('Google account not connected');
    }

    const { data, error } = await supabase.functions.invoke('google-docs', {
      body: {
        title,
        content,
        userEmail: status.userEmail,
      },
    });

    if (error) throw error;
    return data;
  };

  const createPresentation = async (title: string, slides: any[]) => {
    if (!status.isConnected || !status.userEmail) {
      throw new Error('Google account not connected');
    }

    const { data, error } = await supabase.functions.invoke('google-slides', {
      body: {
        title,
        slides,
        userEmail: status.userEmail,
      },
    });

    if (error) throw error;
    return data;
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return {
    ...status,
    checkConnection,
    sendEmail,
    createDocument,
    createPresentation,
  };
};