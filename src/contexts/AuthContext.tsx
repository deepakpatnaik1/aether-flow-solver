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
    // Initialize session state properly
    const initializeAuth = async () => {
      try {
        // Get current session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔐 Initial session check:', !!session, 'User:', session?.user?.email, 'Error:', error);
        
        if (session) {
          setSession(session);
          setUser(session.user);
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('🚨 Error getting session:', error);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth event:', event, 'Session:', !!session, 'User:', session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Initialize with current session
    initializeAuth();

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