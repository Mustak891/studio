
"use client";

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, type AuthError } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      if (!auth) {
        toast({ title: "Authentication Error", description: "Firebase Auth is not initialized. Please check your Firebase configuration.", variant: "destructive" });
        setLoading(false);
        return;
      }
      await signInWithPopup(auth, googleProvider);
      toast({ title: "Signed In", description: "Successfully signed in with Google." });
    } catch (error) {
      console.error("Error signing in with Google: ", error);
      const authError = error as AuthError;
      if (authError.code === 'auth/popup-blocked') {
        toast({
          title: "Popup Blocked",
          description: "Google Sign-In popup was blocked by your browser. Please disable your popup blocker for this site and try again.",
          variant: "destructive",
          duration: 7000,
        });
      } else if (authError.code === 'auth/cancelled-popup-request' || authError.code === 'auth/popup-closed-by-user') {
         toast({
          title: "Sign-In Cancelled",
          description: "The Google Sign-In process was cancelled or the popup was closed.",
          variant: "destructive",
        });
      } else if (authError.code === 'auth/api-key-not-valid') {
        toast({
          title: "Firebase API Key Invalid",
          description: "The API Key for Firebase is not valid. Please meticulously check your .env.local configuration (NEXT_PUBLIC_FIREBASE_API_KEY) and ensure it matches the Web API Key in your Firebase project settings. Also, verify 'Authorized domains' in Firebase Authentication settings. Restart your server after any .env.local changes.",
          variant: "destructive",
          duration: 15000, 
        });
      }
      else {
        toast({
          title: "Sign In Failed",
          description: `Could not sign in with Google. Error: ${authError.message}`,
          variant: "destructive"
        });
      }
      setUser(null);
    } finally {
      // onAuthStateChanged will set loading to false once user state is updated or confirmed null
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    try {
      if (!auth) {
        toast({ title: "Authentication Error", description: "Firebase Auth is not initialized.", variant: "destructive" });
        setLoading(false);
        return;
      }
      await firebaseSignOut(auth);
      toast({ title: "Signed Out", description: "Successfully signed out." });
    } catch (error) {
      console.error("Error signing out: ", error);
      const authError = error as AuthError;
      toast({ title: "Sign Out Failed", description: `Could not sign out. Error: ${authError.message}`, variant: "destructive" });
    } finally {
      // onAuthStateChanged will set loading to false
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

