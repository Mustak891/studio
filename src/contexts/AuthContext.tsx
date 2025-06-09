
"use client";

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, googleProvider, db } from '@/lib/firebase';
import { 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  type AuthError,
  deleteUser as firebaseDeleteUser 
} from 'firebase/auth';
import { doc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDeleting: boolean; 
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  deleteUserAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!isDeleting) { 
        setUser(currentUser);
      }
      if (loading && !isDeleting) { 
          setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [isDeleting, loading]);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      if (!auth) {
        toast({ title: "Authentication Error", description: "Firebase Auth is not initialized. Please check your Firebase configuration.", variant: "destructive" });
        console.error("[AuthContext]: signInWithGoogle failed because Firebase Auth instance is not available. Check firebase.ts and .env.local configuration.");
        setLoading(false);
        return;
      }
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        toast({ title: "Signed In", description: "Successfully signed in with Google." });
        
        const userDocRef = doc(db, "users", result.user.uid);
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
          const creationTime = result.user.metadata.creationTime ? new Date(result.user.metadata.creationTime).getTime() : 0;
          const lastSignInTime = result.user.metadata.lastSignInTime ? new Date(result.user.metadata.lastSignInTime).getTime() : 0;
          const isLikelyNewUser = creationTime > 0 && lastSignInTime > 0 && Math.abs(creationTime - lastSignInTime) < 5000; 

          if (isLikelyNewUser) {
            const initialProfile = {
              username: result.user.displayName ? result.user.displayName.toLowerCase().replace(/\s+/g, '-') : `user${Date.now()}`,
              bio: "Welcome to LinkHub!",
              profilePictureUrl: result.user.photoURL || 'https://placehold.co/150x150.png',
            };
            const initialLinks = [
              { id: '1', title: 'My Portfolio', url: 'https://example.com/portfolio' },
              { id: '2', title: 'Follow me on X', url: 'https://x.com/yourprofile' },
            ];
            await setDoc(userDocRef, { profile: initialProfile, links: initialLinks });
          }
        }
      }
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = `An unexpected error occurred: ${authError.message} (Code: ${authError.code})`;
      if (authError.code === 'auth/popup-blocked') {
        errorMessage = "Google Sign-In popup was blocked. Please disable your popup blocker for this site and try again.";
      } else if (authError.code === 'auth/cancelled-popup-request' || authError.code === 'auth/popup-closed-by-user') {
         errorMessage = "The Google Sign-In process was cancelled or the popup was closed.";
      } else if (authError.code === 'auth/api-key-not-valid') {
        console.error("Firebase Authentication Error (auth/api-key-not-valid): Check .env.local (NEXT_PUBLIC_FIREBASE_API_KEY) and Firebase project settings. Restart server after .env.local changes.");
        errorMessage = "The API Key for Firebase is not valid. Check .env.local and Firebase console. Restart server after changes.";
      } else if (authError.code === 'auth/unauthorized-domain') {
        const currentHost = window.location.hostname;
        console.error(`Firebase Authentication Error (auth/unauthorized-domain): Add THIS HOSTNAME to Firebase 'Authorized domains': >>> ${currentHost} <<<`);
        errorMessage = `Add THIS HOSTNAME to Firebase 'Authorized domains': >>> ${currentHost} <<< Then try signing in again.`;
      } else {
        console.error(`[AuthContext]: Error signing in with Google: `, authError);
      }
      toast({
        title: "Sign In Error",
        description: errorMessage,
        variant: "destructive",
        duration: (authError.code === 'auth/api-key-not-valid' || authError.code === 'auth/unauthorized-domain') ? 20000 : 10000,
      });
      setUser(null); 
      setLoading(false); 
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
      setUser(null); 
      toast({ title: "Signed Out", description: "Successfully signed out." });
    } catch (error) {
      console.error("[AuthContext]: Error signing out: ", error);
      const authError = error as AuthError;
      toast({ title: "Sign Out Failed", description: `Could not sign out. Error: ${authError.message}`, variant: "destructive" });
    } finally {
       if (auth && !auth.currentUser) { 
           setLoading(false);
       } else if (!auth) { 
           setLoading(false);
       }
       setTimeout(() => { 
            if (user && loading) setLoading(false);
       }, 500);
    }
  };

  const deleteUserAccount = async () => {
    if (!auth || !db) {
      toast({ title: "Deletion Error", description: "Cannot delete. Essential services (Auth/DB) not available.", variant: "destructive" });
      return;
    }
    const currentUserForDeletion = auth.currentUser;
    if (!currentUserForDeletion) {
      toast({ title: "Not Signed In", description: "No user is currently signed in to delete.", variant: "destructive" });
      return;
    }

    const userUidToDelete = currentUserForDeletion.uid;
    setIsDeleting(true);
    setLoading(true); 

    try {
      const userDocRef = doc(db, "users", userUidToDelete);
      await deleteDoc(userDocRef);
      toast({ title: "Data Deleted", description: "Your profile data has been removed."});

      try {
        await firebaseSignOut(auth);
        setUser(null); 
      } catch (signOutError: any) {
        console.error(`[AuthContext]: STEP 2 - FAILED to sign out user ${userUidToDelete} locally but setting user context to null anyway. Error: ${signOutError.message}. Auth deletion will still be attempted.`);
        setUser(null); 
        toast({ title: "Sign Out Issue During Deletion", description: `Minor issue signing out locally (Error: ${signOutError.message}). Proceeding with auth deletion.`, variant: "destructive" });
      }
      
      try {
        await firebaseDeleteUser(currentUserForDeletion); 
        toast({ title: "Account Fully Deleted", description: "Your account and all associated data have been successfully removed." });
      } catch (authDeletionError: any) {
        console.error(`[AuthContext]: STEP 3 - FAILED to delete Firebase Auth user ${userUidToDelete}. Error Code: ${authDeletionError.code}, Message: ${authDeletionError.message}`);
        const authError = authDeletionError as AuthError;
        let authErrorMessage = `Your data was deleted and you've been signed out, but final deletion of your authentication record failed: ${authError.message}.`;
        if (authError.code === 'auth/requires-recent-login') {
            authErrorMessage = "Your data was deleted and you've been signed out. To fully remove your authentication record, please sign back in and attempt account deletion again.";
        }
        toast({ title: "Authentication Deletion Failed", description: authErrorMessage, variant: "destructive", duration: 15000 });
      }

    } catch (firestoreError: any) { 
      console.error(`[AuthContext]: STEP 1 - FAILED to delete Firestore doc users/${userUidToDelete}. Error Code: ${firestoreError.code}, Message: ${firestoreError.message}`);
      toast({
          title: "Database Error During Deletion",
          description: `Failed to delete your profile data. Your account was NOT deleted from authentication. Error: ${firestoreError.message}. Check Firestore rules or connectivity.`,
          variant: "destructive",
          duration: 10000,
      });
    } finally {
      setIsDeleting(false);
      setLoading(false); 
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDeleting, signInWithGoogle, signOutUser, deleteUserAccount }}>
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

