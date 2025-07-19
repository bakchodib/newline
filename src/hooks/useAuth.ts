
"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type User = {
  id: string;
  loginId: string;
  name: string;
  role: 'admin' | 'agent' | 'customer';
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // If there's a Supabase session, try to get user data from localStorage.
          // In a real app, you might re-fetch the profile here.
          const storedUser = localStorage.getItem('jls_user');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          } else {
            // This case can happen if localStorage is cleared but session persists.
            // We should log out to clear the inconsistent state.
            await supabase.auth.signOut();
            if (pathname !== '/login') router.push('/login');
          }
        } else if (pathname !== '/login') {
          router.push('/login');
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        if (pathname !== '/login') router.push('/login');
      } finally {
        setLoading(false);
        setIsAuthChecked(true);
      }
    };
    
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && pathname !== '/login') {
        setUser(null);
        localStorage.removeItem('jls_user');
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };

  }, [router, pathname]);

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('jls_user');
    setUser(null);
    router.push('/login');
  };

  return { user, logout, loading, isAuthChecked };
}
