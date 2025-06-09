
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { ProfileData, LinkData } from '@/lib/types';
import ProfileEditor from '@/components/linkhub/ProfileEditor';
import LinkListEditor from '@/components/linkhub/LinkListEditor';
import LivePreview from '@/components/linkhub/LivePreview';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Moon, Sun, Save, Share2, LogIn, LogOut, UserCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase'; 
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { slugifyUsername } from '@/lib/utils';

const APP_NAME = "LinkHub";
const LOCAL_STORAGE_KEY_THEME = `${APP_NAME}_theme`;

const generateInitialProfileData = (displayName?: string | null, photoURL?: string | null): ProfileData => {
  return {
    username: slugifyUsername(displayName || 'yourname'),
    bio: 'Your awesome bio goes here!',
    profilePictureUrl: photoURL || 'https://placehold.co/150x150.png',
  };
};

const initialLinks: LinkData[] = [
  { id: '1', title: 'My Portfolio', url: 'https://example.com/portfolio' },
  { id: '2', title: 'Follow me on X', url: 'https://x.com/yourprofile' },
];

export default function HomePage() {
  const { user, loading: authLoading, signInWithGoogle, signOutUser, deleteUserAccount } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>(generateInitialProfileData());
  const [links, setLinks] = useState<LinkData[]>(initialLinks);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMounted, setIsMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedTheme = localStorage.getItem(LOCAL_STORAGE_KEY_THEME) as 'light' | 'dark' | null;
    if (storedTheme) {
      setTheme(storedTheme);
    }
    setCurrentYear(new Date().getFullYear());
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(LOCAL_STORAGE_KEY_THEME, theme);
  }, [theme, isMounted]);

  useEffect(() => {
    if (!isMounted || !db) {
      if (user === null && !authLoading) { 
        console.log("[HomePage-UserDataEffect]: User logged out or component not fully ready (isMounted/db). Resetting local editor state.");
        setProfileData(generateInitialProfileData());
        setLinks(initialLinks);
      }
      return;
    }

    if (authLoading) {
      console.log("[HomePage-UserDataEffect]: Auth is loading. Waiting for auth state to settle.");
      return; 
    }

    if (!user) {
      console.log("[HomePage-UserDataEffect]: No authenticated user. Resetting local editor state.");
      setProfileData(generateInitialProfileData());
      setLinks(initialLinks);
      return;
    }
    
    const loadUserData = async () => {
      console.log("[HomePage-UserDataEffect]: Auth state settled. User authenticated (UID:", user.uid,"). Attempting to load user data.");
      setFirestoreError(null);
      const userDocRef = doc(db, 'users', user.uid);
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("[HomePage-UserDataEffect]: User data FOUND in Firestore for UID:", user.uid, data);
          const loadedProfile = data.profile as ProfileData;
          const currentUsername = slugifyUsername(loadedProfile.username || user.displayName || 'yourname');
          setProfileData({
            ...loadedProfile,
            username: currentUsername, // Ensure username is slugified
            profilePictureUrl: loadedProfile.profilePictureUrl || user.photoURL || 'https://placehold.co/150x150.png'
          });
          setLinks(data.links || initialLinks);
        } else {
          console.log("[HomePage-UserDataEffect]: User data NOT FOUND in Firestore for UID:", user.uid,". Checking if user is new.");
          // Check if user is genuinely new vs. data deleted
          const creationTime = user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : 0;
          const lastSignInTime = user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).getTime() : 0;
          
          // If creation time and last sign-in time are very close (e.g., within 10 seconds),
          // it's likely a fresh sign-up or first sign-in after account creation.
          const isLikelyNewUser = creationTime && lastSignInTime && Math.abs(creationTime - lastSignInTime) < 10000;

          if (isLikelyNewUser) {
            console.log("[HomePage-UserDataEffect]: User (UID:", user.uid,") appears to be NEW. Generating and saving initial profile to Firestore.");
            const newProfile = generateInitialProfileData(user.displayName, user.photoURL);
            setProfileData(newProfile); // Update local state
            setLinks(initialLinks); // Update local state
            await setDoc(userDocRef, { profile: newProfile, links: initialLinks });
            console.log("[HomePage-UserDataEffect]: Initial profile for new user (UID:", user.uid,") SAVED to Firestore.");
            toast({ title: "Profile Initialized", description: "Your LinkHub profile has been set up in the cloud." });
          } else {
            console.log("[HomePage-UserDataEffect]: No data in Firestore for UID:", user.uid, "User does NOT appear to be new (or metadata missing/timestamps far apart). This might be after a deletion or if data was cleared externally. Resetting local editor state WITHOUT saving to Firestore.");
            setProfileData(generateInitialProfileData(user.displayName, user.photoURL));
            setLinks(initialLinks);
          }
        }
      } catch (error: any) {
        console.error("[HomePage-UserDataEffect]: Error loading user data from Firestore for UID:", user.uid, error);
        setFirestoreError(`Failed to load data: ${error.message}. Ensure Firestore is set up and rules allow reads.`);
        toast({ title: "Load Error", description: `Could not load your data from the cloud. ${error.message}`, variant: "destructive"});
      }
    };

    loadUserData();

  }, [user, isMounted, db, authLoading, toast]); // Added authLoading

  const saveDataToFirestore = useCallback(async (newProfileData: ProfileData, newLinks: LinkData[]) => {
    if (!user || !db || !isMounted) {
      console.warn("[SaveData]: Aborted. User not available, DB not available, or component not mounted.", { userAvailable: !!user, dbAvailable: !!db, isMounted });
      toast({ title: "Save Error", description: "Cannot save. User not signed in or database unavailable.", variant: "destructive" });
      return;
    }
    
    console.log("[SaveData]: Attempting to save data for UID:", user.uid);
    setIsSaving(true);
    setFirestoreError(null);
    
    const profileToSave: ProfileData = {
      ...newProfileData,
      username: slugifyUsername(newProfileData.username) // Ensure username is slugified on save
    };
    console.log("[SaveData]: Profile object being saved to Firestore:", profileToSave);
    console.log("[SaveData]: Links object being saved to Firestore:", newLinks);

    const userDocRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userDocRef, { profile: profileToSave, links: newLinks }, { merge: true });
      setProfileData(profileToSave); 
      setLinks(newLinks); 
      console.log("[SaveData]: Data successfully SAVED to Firestore for UID:", user.uid);
      toast({
        title: "Changes Saved!",
        description: "Your LinkHub profile and links are saved to the cloud.",
      });
    } catch (error: any) {
      console.error("[SaveData]: Error SAVING data to Firestore for UID:", user.uid, error);
      setFirestoreError(`Failed to save data: ${error.message}. Check Firestore rules and connectivity.`);
      toast({
        title: "Save Error",
        description: `Could not save changes to the cloud. Error: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [user, db, toast, isMounted]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleSaveChanges = () => {
    console.log("[HandleSaveChanges]: Triggered. Current User UID:", user ? user.uid : "No user");
    if (!user) {
      toast({ title: "Not Signed In", description: "Please sign in to save changes.", variant: "destructive"});
      return;
    }
    if (!db) {
      toast({ title: "Database Error", description: "Firestore is not available. Cannot save.", variant: "destructive"});
      return;
    }
    console.log("[HandleSaveChanges]: Profile Data to save:", profileData, "Links:", links);
    saveDataToFirestore(profileData, links);
  };
  
  const handleShare = async () => {
    if (!user) {
      toast({ title: "Not Signed In", description: "Please sign in to share your page.", variant: "destructive"});
      return;
    }

    const shareUsername = slugifyUsername(profileData.username || 'myprofile'); 
    const shareUrl = `${window.location.origin}/u/${shareUsername}`;

    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        toast({
          title: "Clipboard API Not Available",
          description: `Your browser does not support copying to clipboard. Here's your link: ${shareUrl}`,
          variant: "default",
          duration: 10000, 
        });
        console.warn('Share: Clipboard API not available. Link:', shareUrl);
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied!",
        description: `Your LinkHub URL (${shareUrl}) is copied to clipboard.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to Copy",
        description: `Could not copy the link: ${err.message}. Please try manually: ${shareUrl}`,
        variant: "destructive",
        duration: 10000,
      });
      console.error('Share: Failed to copy link to clipboard:', err);
    }
  };

  const handleDeleteAccountConfirm = async () => {
    if (!user) {
      toast({ title: "Not Signed In", description: "Please sign in to delete your account.", variant: "destructive"});
      return;
    }
    setIsDeleting(true);
    setFirestoreError(null); // Clear previous firestore errors
    console.log("[HandleDeleteAccountConfirm]: Calling deleteUserAccount from AuthContext for UID:", user.uid);
    await deleteUserAccount(); 
    // AuthContext handles UI updates and toasts based on success/failure of deletion.
    // It will also set its own loading state, which should lead to onAuthStateChanged.
    setIsDeleting(false); // Reset local deleting state after operation attempt
  };
  
  if (!isMounted || authLoading) { // Show loading if component isn't mounted OR auth is still loading
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-foreground text-xl">Loading LinkHub...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-primary font-headline">{APP_NAME}</h1>
          <div className="flex items-center gap-2">
             <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            {user ? (
              <>
                <Button onClick={handleSaveChanges} disabled={isSaving || !!firestoreError}>
                  <Save className={`mr-2 h-4 w-4 ${isSaving ? 'animate-spin' : ''}`} /> 
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button onClick={handleShare}>
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
                <Avatar className="h-9 w-9">
                   <AvatarImage src={user.photoURL || profileData.profilePictureUrl || undefined} alt={user.displayName || 'User'} data-ai-hint="user avatar"/>
                  <AvatarFallback>
                    {profileData.username ? profileData.username.charAt(0).toUpperCase() : <UserCircle size={20}/>}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" onClick={signOutUser}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting}>
                      <Trash2 className={`mr-2 h-4 w-4 ${isDeleting ? 'animate-spin' : ''}`} />
                      {isDeleting ? 'Deleting...' : 'Delete Account'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        account and remove your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccountConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        {isDeleting ? 'Deleting...' : 'Yes, delete account'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <Button onClick={signInWithGoogle}>
                <LogIn className="mr-2 h-4 w-4" /> Sign in with Google
              </Button>
            )}
          </div>
        </div>
      </header>

      {!user ? (
        <main className="flex-grow container mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Welcome to {APP_NAME}!</h2>
          <p className="text-muted-foreground mb-8 text-lg">Sign in to create and manage your personalized link page.</p>
          <Button size="lg" onClick={signInWithGoogle}>
            <LogIn className="mr-2 h-5 w-5" /> Sign in with Google
          </Button>
        </main>
      ) : (
        <main className="flex-grow container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-screen-2xl">
          {firestoreError && (
            <div className="mb-4 p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> 
              <p><strong>Storage Error:</strong> {firestoreError} Ensure Firebase Firestore is enabled and security rules are correctly configured. See console for details.</p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            <div className="lg:col-span-2 space-y-8">
              <ProfileEditor profileData={profileData} onProfileChange={setProfileData} />
              <LinkListEditor links={links} onLinksChange={setLinks} />
            </div>
            <div className="lg:col-span-1 lg:sticky lg:top-24 self-start max-h-[calc(100vh-8rem)]">
              <LivePreview profileData={profileData} links={links} showTitle={true} />
            </div>
          </div>
        </main>
      )}
      
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        {currentYear ? `© ${currentYear} ${APP_NAME}. Create your own social landing page.` : `${APP_NAME}. Create your own social landing page.`}
      </footer>
    </div>
  );
}
    

    
