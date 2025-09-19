import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener with proper validation
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, 'Has session:', !!session);

        // Clear state on sign out
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        // Validate session is actually valid
        if (session) {
          try {
            // Verify the session with Supabase (with timeout)
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Validation timeout')), 5000)
            );
            const validationPromise = supabase.auth.getUser();

            const { data: { user }, error } = await Promise.race([
              validationPromise,
              timeoutPromise
            ]).catch(err => {
              console.error('Session validation failed:', err);
              return { data: { user: null }, error: err };
            });

            if (error || !user) {
              console.error('Invalid session detected, clearing:', error);
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
            } else {
              console.log('Session validated for user:', user.email);
              setSession(session);
              setUser(user);
            }
          } catch (err) {
            console.error('Session validation error:', err);
            // On validation error, just use the session as-is
            setSession(session);
            setUser(session.user);
          }
        } else {
          setSession(null);
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session with validation
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('Session error:', error);
        setLoading(false);
        return;
      }

      if (session) {
        try {
          // Double-check session is valid (with timeout)
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Initial validation timeout')), 5000)
          );
          const validationPromise = supabase.auth.getUser();

          const { data: { user }, error: userError } = await Promise.race([
            validationPromise,
            timeoutPromise
          ]).catch(err => {
            console.error('Initial session validation failed:', err);
            return { data: { user: null }, error: err };
          });

          if (userError || !user) {
            console.error('Stored session is invalid, clearing');
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            console.log('Initial session validated for user:', user.email);
            setSession(session);
            setUser(user);
          }
        } catch (err) {
          console.error('Initial validation error:', err);
          // On validation error, just use the session as-is
          setSession(session);
          setUser(session.user);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};