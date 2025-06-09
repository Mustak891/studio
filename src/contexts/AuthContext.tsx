
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
  isDeleting: boolean; // To signal deletion process to other components
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  deleteUserAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false); // State to indicate account deletion is in progress
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("[AuthContext]: onAuthStateChanged triggered. New user state:", currentUser ? currentUser.uid : "null", "Auth loading state will be set to false.");
      if (!isDeleting) { // Only update user if not in the middle of a deletion that manages user state manually
        setUser(currentUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isDeleting]); // Add isDeleting here if setUser(null) in deleteUserAccount might race

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
      // onAuthStateChanged will handle setUser and setLoading
    } catch (error) {
      console.error("[AuthContext]: Error signing in with Google: ", error);
      const authError = error as AuthError;
      // ... (existing comprehensive error handling for signInWithGoogle)
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
      setUser(null); // Ensure user is null on error
      setLoading(false); // Ensure loading is false on error
    }
    // No finally setLoading(false) here, onAuthStateChanged handles it for success.
  };

  const signOutUser = async () => {
    console.log("[AuthContext]: signOutUser initiated.");
    setLoading(true); // setLoading true at the start
    try {
      if (!auth) {
        toast({ title: "Authentication Error", description: "Firebase Auth is not initialized.", variant: "destructive" });
        setLoading(false);
        return;
      }
      await firebaseSignOut(auth);
      setUser(null); // Explicitly set user to null
      console.log("[AuthContext]: firebaseSignOut successful. User context set to null. onAuthStateChanged will re-confirm.");
      toast({ title: "Signed Out", description: "Successfully signed out." });
    } catch (error) {
      console.error("[AuthContext]: Error signing out: ", error);
      const authError = error as AuthError;
      toast({ title: "Sign Out Failed", description: `Could not sign out. Error: ${authError.message}`, variant: "destructive" });
    } finally {
       setLoading(false); // Always set loading to false in finally
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
    console.log(`[AuthContext]: Setting isDeleting to true for UID: ${userUidToDelete}`);
    setIsDeleting(true);
    setLoading(true); // Also set loading true as it's an async operation

    try {
      // --- STEP 1: Delete Firestore Data ---
      const userDocRef = doc(db, "users", userUidToDelete);
      console.log(`[AuthContext]: STEP 1 - Attempting to delete Firestore doc: users/${userUidToDelete}`);
      await deleteDoc(userDocRef);
      console.log(`[AuthContext]: STEP 1 - SUCCESS - Firestore doc users/${userUidToDelete} DELETED (or did not exist).`);
      toast({ title: "Data Deleted", description: "Your profile data has been removed. Proceeding to finalize account removal..."});

      // --- STEP 2: Immediately Sign Out User AND set local context user to null ---
      console.log(`[AuthContext]: STEP 2 - Signing out user ${userUidToDelete} and setting local context user to null.`);
      try {
        await firebaseSignOut(auth); // This will trigger onAuthStateChanged
        setUser(null); // <<< EXPLICITLY SET USER TO NULL LOCALLY IN AuthContext
        console.log(`[AuthContext]: STEP 2 - SUCCESS - User ${userUidToDelete} signed out, and local context 'user' set to null.`);
      } catch (signOutError: any) {
        console.error(`[AuthContext]: STEP 2 - FAILED to sign out user ${userUidToDelete} locally but setting user to null anyway. Error: ${signOutError.message}. Auth deletion will still be attempted.`);
        setUser(null); // Ensure user is null even if signout fails, as data is gone
        toast({ title: "Sign Out Issue During Deletion", description: `Minor issue signing out locally (Error: ${signOutError.message}), but context user set to null. Proceeding with auth deletion.`, variant: "destructive" });
      }
      
      // --- STEP 3: Delete Firebase Auth User (using the captured user object) ---
      try {
        console.log(`[AuthContext]: STEP 3 - Attempting to delete Firebase Auth user: ${userUidToDelete}`);
        await firebaseDeleteUser(currentUserForDeletion); 
        console.log(`[AuthContext]: STEP 3 - SUCCESS - Firebase Auth user ${userUidToDelete} DELETED.`);
        toast({ title: "Account Fully Deleted", description: "Your account and all associated data have been successfully removed." });
        // onAuthStateChanged (triggered by firebaseSignOut and firebaseDeleteUser) manages the final user state (null).
      } catch (authDeletionError: any) {
        console.error(`[AuthContext]: STEP 3 - FAILED to delete Firebase Auth user ${userUidToDelete}. Error Code: ${authDeletionError.code}, Message: ${authDeletionError.message}`);
        const authError = authDeletionError as AuthError;
        let authErrorMessage = `Your data was deleted and you've been signed out, but final deletion of your authentication record failed: ${authError.message}.`;
        if (authError.code === 'auth/requires-recent-login') {
            authErrorMessage = "Your data was deleted and you've been signed out. To fully remove your authentication record, please sign back in and attempt account deletion again.";
        }
        toast({ title: "Authentication Deletion Failed", description: authErrorMessage, variant: "destructive", duration: 15000 });
      }

    } catch (firestoreError: any) { // Catch specific Firestore errors from STEP 1
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

    