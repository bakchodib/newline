"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type User = {
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'customer';
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('jls_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('jls_user');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const logout = () => {
    localStorage.removeItem('jls_user');
    setUser(null);
    router.push('/login');
  };

  return { user, logout, loading };
}
