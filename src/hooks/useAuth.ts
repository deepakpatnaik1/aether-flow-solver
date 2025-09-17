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
    
    // Determine the correct redirect URL based on current location
    const currentOrigin = window.location.origin;
    const redirectUrl = currentOrigin.includes('id-preview--f29e4c08-30c0-496d-946c-bdd3be783b28.lovable.app') 
      ? 'https://id-preview--f29e4c08-30c0-496d-946c-bdd3be783b28.lovable.app/'
      : 'https://preview--aether-flow-solver.lovable.app/';
    
    console.log('Redirect URL:', redirectUrl);
    
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