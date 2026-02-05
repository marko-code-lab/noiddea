'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from './use-supabase';
import { logoutUser } from '@/app/actions';
import { User } from '@supabase/supabase-js';

export function useAuth() {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    try {
      // Limpiar localStorage antes de cerrar sesión
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selected-branch-id');
      }
      
      await logoutUser();
      // logoutUser ya redirige a /login
    } catch (error) {
      console.error('Error en signOut:', error);
    }
  };

  return {
    user,
    loading,
    signOut,
    signIn: (email: string, password: string) =>
      supabase.auth.signInWithPassword({ email, password }),
    signUp: (email: string, password: string) =>
      supabase.auth.signUp({ email, password }),
    signInWithOAuth: (provider: 'google' | 'github' | 'gitlab') =>
      supabase.auth.signInWithOAuth({ provider }),
  };
}
