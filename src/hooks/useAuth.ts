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
    console.log('🔧 Initializing auth hook...');
    
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
    console.log('📡 Checking for existing session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('📡 Session check result:', { session: !!session, error });
      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    }).catch((err) => {
      console.error('❌ Session check failed:', err);
      setAuthState({
        user: null,
        session: null,
        loading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    console.log('🚀 Starting Google OAuth flow...');
    
    // Check if we're in an iframe (Lovable preview)
    const isInIframe = window !== window.top;
    console.log('🔍 Environment check:', {
      isInIframe,
      hostname: window.location.hostname,
      origin: window.location.origin
    });
    
    // Determine the correct redirect URL based on current location
    const currentOrigin = window.location.origin;
    const redirectUrl = currentOrigin.includes('id-preview--f29e4c08-30c0-496d-946c-bdd3be783b28.lovable.app') 
      ? 'https://id-preview--f29e4c08-30c0-496d-946c-bdd3be783b28.lovable.app/'
      : 'https://preview--aether-flow-solver.lovable.app/';
    
    console.log('🎯 Using redirect URL:', redirectUrl);
    
    if (isInIframe) {
      console.log('📱 Using popup flow for iframe environment');
      return await signInWithPopup(redirectUrl);
    } else {
      console.log('🌐 Using standard redirect flow for non-iframe environment');
      // Use standard redirect flow for non-iframe environments
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
          },
        });
        
        if (error) {
          console.error('❌ OAuth error:', error);
        } else {
          console.log('✅ OAuth request successful');
        }
        
        return { error };
      } catch (err) {
        console.error('❌ OAuth exception:', err);
        return { error: err };
      }
    }
  };

  const signInWithPopup = async (redirectUrl: string) => {
    return new Promise<{ error: any }>((resolve) => {
      console.log('🚀 Starting popup OAuth flow with redirect URL:', redirectUrl);
      
      try {
        // Call the edge function to get the OAuth URL
        console.log('📡 Calling google-auth-url edge function...');
        
        supabase.functions.invoke('google-auth-url', {
          body: { redirectTo: redirectUrl }
        }).then(({ data, error }) => {
          console.log('📡 Edge function response:', { data, error });
          
          if (error) {
            console.error('❌ Edge function error:', error);
            resolve({ error });
            return;
          }
          
          if (!data?.authUrl) {
            console.error('❌ No OAuth URL received from edge function');
            resolve({ error: new Error('Failed to get OAuth URL from server') });
            return;
          }

          const authUrl = data.authUrl;
          console.log('🔗 Opening popup with OAuth URL:', authUrl);

          // Calculate centered popup position
          const popupWidth = 500;
          const popupHeight = 600;
          const left = (window.screen.width / 2) - (popupWidth / 2);
          const top = (window.screen.height / 2) - (popupHeight / 2);
          
          // Open popup window
          const popup = window.open(
            authUrl,
            'google-oauth',
            `width=${popupWidth},height=${popupHeight},scrollbars=yes,resizable=yes,left=${left},top=${top}`
          );

          if (!popup) {
            console.error('❌ Popup blocked by browser');
            resolve({ error: new Error('Popup blocked. Please allow popups for this site and try again.') });
            return;
          }
          
          console.log('✅ Popup opened successfully');

          // Poll for popup to close and check for authentication
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              console.log('🔄 Popup closed, checking authentication session...');
              
              // Small delay to ensure auth state has updated
              setTimeout(() => {
                supabase.auth.getSession().then(({ data: { session } }) => {
                  if (session) {
                    console.log('✅ Authentication successful! Session found.');
                    resolve({ error: null });
                  } else {
                    console.log('❌ No session found after popup closed');
                    resolve({ error: new Error('Authentication was cancelled or failed') });
                  }
                });
              }, 1000);
            }
          }, 1000);

          // Timeout after 5 minutes
          setTimeout(() => {
            if (!popup.closed) {
              console.log('⏰ Popup timeout, closing popup');
              popup.close();
            }
            clearInterval(checkClosed);
            resolve({ error: new Error('Authentication timeout - please try again') });
          }, 300000);
          
        }).catch((err) => {
          console.error('❌ Error calling edge function:', err);
          resolve({ error: new Error(`Failed to start authentication: ${err.message}`) });
        });
        
      } catch (err) {
        console.error('❌ Unexpected error in popup flow:', err);
        resolve({ error: err });
      }
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