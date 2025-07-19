
"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

type AppUser = {
  uid: string;
  loginId: string;
  name: string;
  role: 'admin' | 'agent' | 'customer';
};

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // User is signed in, get their profile from Firestore
        const userDocRef = doc(db, "users", fbUser.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setUser({ uid: doc.id, ...doc.data() } as AppUser);
          } else {
            // Profile doesn't exist, this might be a transient state during signup
            // or an error case.
            setUser(null);
          }
          setLoading(false);
        });

        // Cleanup snapshot listener on unmount
        return () => unsubscribeSnapshot();

      } else {
        // User is signed out
        setUser(null);
        setLoading(false);
        // Redirect to login page if not already there or on signup page
        if (pathname !== '/login' && pathname !== '/signup') {
          router.push('/login');
        }
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router, pathname]);

  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
