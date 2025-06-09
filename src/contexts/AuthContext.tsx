
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
import { doc, deleteDoc } from 'firebase/firestore';
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
      console.log(`[AuthContext]: onAuthStateChanged triggered. New user state: ${currentUser ? currentUser.uid : "null"}. isDeleting: ${isDeleting}. Auth loading state will be set to false.`);
      if (!isDeleting) { 
        setUser(currentUser);
      }
      // setLoading(false) should be primarily managed by operations, 
      // but this ensures it becomes false after initial auth check.
      // However, if an operation like deleteUserAccount is running, it manages its own loading state.
      if (loading && !isDeleting) { // Only set loading to false if not in a deletion process
          setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [isDeleting, loading]); // Added loading to dependency array

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      if (!auth) {
        toast({ title: "Authentication Error", description: "Firebase Auth is not initialized. Please check your Firebase configuration.", variant: "destructive" });
        console.error("[AuthContext]: signInWithGoogle failed because Firebase Auth instance is not available. Check firebase.ts and .env.local configuration.");
        setLoading(false);
        return;
      }
      await signInWithPopup(auth, googleProvider);
      toast({ title: "Signed In", description: "Successfully signed in with Google." });
      // onAuthStateChanged will handle setUser. setLoading will be handled by onAuthStateChanged too.
    } catch (error) {
      console.error("[AuthContext]: Error signing in with Google: ", error);
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
        console.error("Firebase Authentication Error (auth/api-key-not-valid): Check .env.local (NEXT_PUBLIC_FIREBASE_API_KEY) and Firebase project settings. Restart server after .env.local changes.");
        toast({
          title: "Firebase API Key Invalid (auth/api-key-not-valid)",
          description: "The API Key for Firebase is not valid. Check .env.local and Firebase console. Restart server after changes. More details in browser console.",
          variant: "destructive",
          duration: 20000,
        });
      } else if (authError.code === 'auth/unauthorized-domain') {
        const currentHost = window.location.hostname;
        console.error(`Firebase Authentication Error (auth/unauthorized-domain): Add THIS HOSTNAME to Firebase 'Authorized domains': >>> ${currentHost} <<<`);
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
      setLoading(false); 
    }
  };

  const signOutUser = async () => {
    console.log("[AuthContext]: signOutUser initiated.");
    setLoading(true); 
    try {
      if (!auth) {
        toast({ title: "Authentication Error", description: "Firebase Auth is not initialized.", variant: "destructive" });
        setLoading(false);
        return;
      }
      await firebaseSignOut(auth);
      setUser(null); 
      console.log("[AuthContext]: firebaseSignOut successful. User context set to null. onAuthStateChanged will re-confirm.");
      toast({ title: "Signed Out", description: "Successfully signed out." });
    } catch (error) {
      console.error("[AuthContext]: Error signing out: ", error);
      const authError = error as AuthError;
      toast({ title: "Sign Out Failed", description: `Could not sign out. Error: ${authError.message}`, variant: "destructive" });
    } finally {
       setLoading(false); 
    }
  };

  const deleteUserAccount = async () => {
    console.log("[AuthContext]: deleteUserAccount initiated.");
    if (!auth || !db) {
      toast({ title: "Deletion Error", description: "Cannot delete account. Essential services (Auth/DB) are not available.", variant: "destructive" });
      return;
    }
    const currentUserForDeletion = auth.currentUser;
    if (!currentUserForDeletion) {
      toast({ title: "Not Signed In", description: "No user is currently signed in to delete.", variant: "destructive" });
      return;
    }

    const userUidToDelete = currentUserForDeletion.uid;
    console.log(`[AuthContext]: Setting isDeleting to true and loading to true for UID: ${userUidToDelete}`);
    setIsDeleting(true);
    setLoading(true);

    try {
      const userDocRef = doc(db, "users", userUidToDelete);
      console.log(`[AuthContext]: STEP 1 - Attempting to delete Firestore doc: users/${userUidToDelete}`);
      await deleteDoc(userDocRef);
      console.log(`[AuthContext]: STEP 1 - SUCCESS - Firestore doc users/${userUidToDelete} DELETED (or did not exist).`);
      toast({ title: "Data Deleted", description: "Your profile data has been removed."});

      console.log(`[AuthContext]: STEP 2 - Attempting to sign out user ${userUidToDelete} locally.`);
      try {
        await firebaseSignOut(auth);
        setUser(null); // <<< EXPLICITLY SET USER TO NULL LOCALLY IN AuthContext IMMEDIATELY
        console.log(`[AuthContext]: STEP 2 - SUCCESS - User ${userUidToDelete} signed out, and local context 'user' set to null.`);
      } catch (signOutError: any) {
        console.error(`[AuthContext]: STEP 2 - FAILED to sign out user ${userUidToDelete} locally but setting user context to null anyway. Error: ${signOutError.message}. Auth deletion will still be attempted.`);
        setUser(null); // Ensure user is null even if signout fails, as data is gone
        toast({ title: "Sign Out Issue During Deletion", description: `Minor issue signing out locally (Error: ${signOutError.message}), but context user set to null. Proceeding with auth deletion.`, variant: "destructive" });
      }
      
      try {
        console.log(`[AuthContext]: STEP 3 - Attempting to delete Firebase Auth user: ${userUidToDelete} using captured user object.`);
        await firebaseDeleteUser(currentUserForDeletion); 
        console.log(`[AuthContext]: STEP 3 - SUCCESS - Firebase Auth user ${userUidToDelete} DELETED.`);
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
      console.log(`[AuthContext]: Setting isDeleting to false and loading to false for UID: ${userUidToDelete} in finally block.`);
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

    
