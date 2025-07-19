"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type User = {
  id: string;
  loginId: string;
  name: string;
  role: 'admin' | 'agent' | 'customer';
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('jls_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else if (pathname !== '/login') { // Avoid redirect loop
        router.push('/login');
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('jls_user');
       if (pathname !== '/login') {
         router.push('/login');
       }
    } finally {
      setLoading(false);
    }
  }, [router, pathname]);

  const logout = () => {
    localStorage.removeItem('jls_user');
    setUser(null);
    router.push('/login');
  };

  return { user, logout, loading };
}
