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
      
      // SECURITY FIX: Use secure function instead of direct table access
      const { data, error } = await supabase
        .rpc('get_google_connection_status');

      if (error) {
        console.error('Error checking Google connection:', error);
        setStatus({ isConnected: false, isLoading: false });
        return;
      }

      if (data && data.length > 0) {
        const connection = data[0];
        const isExpired = connection.expires_at ? new Date(connection.expires_at) < new Date() : false;
        
        setStatus({
          isConnected: connection.is_connected && !isExpired,
          userEmail: connection.user_email,
          scopes: connection.scope?.split(' ') || [],
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

  useEffect(() => {
    checkConnection();
  }, []);

  return {
    ...status,
    checkConnection,
  };
};