import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted.current) return;
      setSession(data.session);
      setLoading(false);
    }).catch(() => {
      if (!mounted.current) return;
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted.current) return;
      setSession(newSession);
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
