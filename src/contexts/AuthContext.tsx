
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
        console.error("AuthContext: signInWithGoogle failed because Firebase Auth instance is not available. Check firebase.ts and .env.local configuration.");
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
          title: "Popup Blocked by Browser",
          description: "Google Sign-In popup was blocked. Please disable your popup blocker for this site (check browser settings or extensions) and try again.",
          variant: "destructive",
          duration: 10000,
        });
      } else if (authError.code === 'auth/cancelled-popup-request' || authError.code === 'auth/popup-closed-by-user') {
         toast({
          title: "Sign-In Cancelled",
          description: "The Google Sign-In process was cancelled or the popup was closed by you.",
          variant: "destructive",
        });
      } else if (authError.code === 'auth/api-key-not-valid') {
        const consoleErrorMessage =
          "Firebase Authentication Error (auth/api-key-not-valid): \n" +
          "THE API KEY (NEXT_PUBLIC_FIREBASE_API_KEY in .env.local) IS INVALID OR NOT AUTHORIZED FOR YOUR PROJECT.\n" +
          "Firebase received the key but rejected it. This is a fundamental configuration issue.\n\n" +
          "CRITICAL TROUBLESHOOTING STEPS:\n" +
          "1. .env.local: VERIFY `NEXT_PUBLIC_FIREBASE_API_KEY`. It MUST EXACTLY match the 'Web API Key' from your Firebase project settings (Project settings > General > Your apps > SDK setup and configuration). Copy and paste it carefully.\n" +
          "2. .env.local: VERIFY `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` (e.g., `your-project-id.firebaseapp.com`) and other Firebase config variables are correct.\n" +
          "3. Firebase Console (Authentication -> Sign-in method): ENSURE 'Google' provider is ENABLED.\n" +
          "4. Firebase Console (Authentication -> Settings -> Authorized domains): ENSURE 'localhost' AND your specific development domain (if applicable, e.g., `*.cloudworkstations.dev`) are listed. Your `authDomain` might also need to be listed.\n" +
          "5. Server Restart: CRITICAL - After any changes to .env.local, YOU MUST RESTART your Next.js development server (stop it with Ctrl+C, then run `npm run dev`).\n" +
          "This error indicates a fundamental configuration issue with your Firebase project credentials or environment variables.";
        console.error(consoleErrorMessage);
        toast({
          title: "Firebase API Key Invalid (auth/api-key-not-valid)",
          description: "The API Key for Firebase is not valid. Please meticulously check your .env.local configuration (especially NEXT_PUBLIC_FIREBASE_API_KEY) and ensure it matches the Web API Key in your Firebase project settings. Also, verify 'Authorized domains' in Firebase Authentication settings. YOU MUST RESTART your server after any .env.local changes. More details in browser console (F12).",
          variant: "destructive",
          duration: 20000,
        });
      } else if (authError.code === 'auth/unauthorized-domain') {
        const currentHost = window.location.hostname;
        const consoleErrorMessage =
          `Firebase Authentication Error (auth/unauthorized-domain): \n` +
          `----------------------------------------------------------------------\n` +
          `CRITICAL: DOMAIN NOT AUTHORIZED BY FIREBASE\n` +
          `----------------------------------------------------------------------\n` +
          `Your app is running on: '${currentHost}'\n` +
          `Firebase is REJECTING requests from this domain because it's NOT in your project's 'Authorized domains' list.\n\n` +
          `ACTION REQUIRED in Firebase Console (https://console.firebase.google.com/):\n` +
          `1. Select your Project.\n` +
          `2. Go to 'Authentication' (under Build in the left sidebar).\n` +
          `3. Click on the 'Settings' tab.\n` +
          `4. Find the 'Authorized domains' list.\n` +
          `5. Click 'Add domain' and add THIS EXACT HOSTNAME: >>>>>>>> ${currentHost} <<<<<<<<\n` +
          `   - IMPORTANT: Add only the hostname (e.g., '${currentHost}'), not the full URL (no 'https://', no paths).\n` +
          `   - Double-check for typos or subtle differences.\n` +
          `6. Also ensure 'localhost' is listed if you test locally. Your project's authDomain (e.g., your-project-id.firebaseapp.com) might also need to be here.\n\n` +
          `This error CANNOT be fixed by code changes in the app. It requires updating your Firebase project settings.\n` +
          `----------------------------------------------------------------------`;
        console.error(consoleErrorMessage);
        toast({
          title: "DOMAIN NOT AUTHORIZED BY FIREBASE (auth/unauthorized-domain)",
          description: `ACTION REQUIRED: Add THIS HOSTNAME to Firebase 'Authorized domains': >>> ${currentHost} <<< (Copy from here or your browser console). Then try signing in again. See browser console (F12) for full steps.`,
          variant: "destructive",
          duration: 30000, 
        });
      } else {
        toast({
          title: "Sign In Failed",
          description: `Could not sign in with Google. Error: ${authError.message} (Code: ${authError.code})`,
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

