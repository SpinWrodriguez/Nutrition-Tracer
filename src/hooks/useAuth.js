import { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    return error;
  };

  const verifyOtp = async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    return error;
  };

  const signOut = () => supabase.auth.signOut();

  return { session, loading, signIn, verifyOtp, signOut, user: session?.user ?? null };
}
