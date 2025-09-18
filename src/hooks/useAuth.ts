import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state change:', event, session ? 'session exists' : 'no session');
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
        });
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    console.log('Starting Google OAuth flow...');
    
    // Check if we're in an iframe (Lovable preview)
    const isInIframe = window !== window.top;
    
    // Determine the correct redirect URL based on current location
    const currentOrigin = window.location.origin;
    const redirectUrl = currentOrigin.includes('id-preview--f29e4c08-30c0-496d-946c-bdd3be783b28.lovable.app') 
      ? 'https://id-preview--f29e4c08-30c0-496d-946c-bdd3be783b28.lovable.app/'
      : 'https://preview--aether-flow-solver.lovable.app/';
    
    console.log('Redirect URL:', redirectUrl);
    console.log('Is in iframe:', isInIframe);
    
    if (isInIframe) {
      // Use popup window for iframe authentication to avoid X-Frame-Options issues
      return await signInWithPopup(redirectUrl);
    } else {
      // Use standard redirect flow for non-iframe environments
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
          },
        });
        
        if (error) {
          console.error('OAuth error:', error);
        } else {
          console.log('OAuth request successful');
        }
        
        return { error };
      } catch (err) {
        console.error('OAuth exception:', err);
        return { error: err };
      }
    }
  };

  const signInWithPopup = async (redirectUrl: string) => {
    return new Promise<{ error: any }>((resolve) => {
      console.log('🚀 Starting popup OAuth flow...');
      
      // Use the edge function to get the OAuth URL
      supabase.functions.invoke('google-auth-url', {
        body: { redirectTo: redirectUrl }
      }).then(({ data, error }) => {
        if (error || !data?.url) {
          console.error('❌ Failed to get OAuth URL:', error);
          resolve({ error: error || new Error('Failed to get OAuth URL') });
          return;
        }

        const authUrl = data.url;
        console.log('🔗 Opening popup with URL:', authUrl);

        // Open popup window
        const popup = window.open(
          authUrl,
          'google-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes,left=' + 
          (window.screen.width / 2 - 250) + ',top=' + (window.screen.height / 2 - 300)
        );

        if (!popup) {
          console.error('❌ Popup blocked');
          resolve({ error: new Error('Popup blocked. Please allow popups for this site.') });
          return;
        }

        // Poll for popup to close and check for authentication
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            console.log('🔄 Popup closed, checking session...');
            
            // Check if authentication was successful by getting the session
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) {
                console.log('✅ OAuth popup authentication successful');
                resolve({ error: null });
              } else {
                console.log('❌ OAuth popup closed without authentication');
                resolve({ error: new Error('Authentication cancelled or failed') });
              }
            });
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          if (!popup.closed) {
            popup.close();
          }
          clearInterval(checkClosed);
          console.log('⏰ OAuth popup timeout');
          resolve({ error: new Error('Authentication timeout') });
        }, 300000);
      }).catch((err) => {
        console.error('❌ Error invoking google-auth-url function:', err);
        resolve({ error: err });
      });
    });
  };

  const signOut = async () => {
    console.log('🚪 Starting sign out process...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
      } else {
        console.log('✅ Sign out successful');
      }
      return { error };
    } catch (err) {
      console.error('❌ Sign out exception:', err);
      return { error: err };
    }
  };

  return {
    ...authState,
    signInWithGoogle,
    signOut,
  };
};