
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Moon, Sun, Save, Share2, LogIn, LogOut, UserCircle, AlertTriangle, Trash2, UserCog, Link2, ChevronDown } from 'lucide-react';
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
  const {
    user,
    loading: authLoading,
    isDeleting: authIsDeleting,
    signInWithGoogle,
    signOutUser,
    deleteUserAccount
  } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>(generateInitialProfileData());
  const [links, setLinks] = useState<LinkData[]>(initialLinks);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMounted, setIsMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const { toast } = useToast();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);


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
    if (authIsDeleting || authLoading) {
      if (authIsDeleting && !authLoading && !user) {
        setProfileData(generateInitialProfileData());
        setLinks(initialLinks);
      }
      return;
    }

    if (!isMounted || !db) {
      if (user === null && !authLoading) {
        setProfileData(generateInitialProfileData());
        setLinks(initialLinks);
      }
      return;
    }

    if (!user) {
      setProfileData(generateInitialProfileData());
      setLinks(initialLinks);
      return;
    }

    const loadUserData = async () => {
      setFirestoreError(null);
      const userDocRef = doc(db, 'users', user.uid);
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const loadedProfile = data.profile as ProfileData;
          const currentUsername = slugifyUsername(loadedProfile.username || user.displayName || 'yourname');
          setProfileData({
            ...loadedProfile,
            username: currentUsername,
            profilePictureUrl: loadedProfile.profilePictureUrl || user.photoURL || 'https://placehold.co/150x150.png'
          });
          setLinks(data.links || initialLinks);
        } else {
          const creationTime = user.metadata.creationTime;
          const lastSignInTime = user.metadata.lastSignInTime;
          
          const creationTimeMs = creationTime ? new Date(creationTime).getTime() : 0;
          const lastSignInTimeMs = lastSignInTime ? new Date(lastSignInTime).getTime() : 0;

          const isLikelyNewUser = creationTimeMs > 0 && lastSignInTimeMs > 0 && Math.abs(creationTimeMs - lastSignInTimeMs) < 5000; 

          if (isLikelyNewUser) {
            const newProfile = generateInitialProfileData(user.displayName, user.photoURL);
            setProfileData(newProfile);
            setLinks(initialLinks);
            await setDoc(userDocRef, { profile: newProfile, links: initialLinks });
            toast({ title: "Profile Initialized", description: "Your LinkHub profile has been set up." });
          } else {
            setProfileData(generateInitialProfileData(user.displayName, user.photoURL));
            setLinks(initialLinks);
          }
        }
      } catch (error: any) {
        console.error("[HomePage-UserDataEffect-LOAD]: Error loading/processing user data from Firestore for UID:", user.uid, error);
        setFirestoreError(`Failed to load data: ${error.message}. Ensure Firestore is set up and rules allow reads.`);
        toast({ title: "Load Error", description: `Could not load your data from the cloud. ${error.message}`, variant: "destructive" });
      }
    };

    loadUserData();

  }, [user, isMounted, db, authLoading, authIsDeleting, toast]);

  const saveDataToFirestore = useCallback(async (newProfileData: ProfileData, newLinks: LinkData[]) => {
    if (!user || !db || !isMounted) {
      console.warn("[SaveData]: Aborted. User not available, DB not available, or component not mounted.", { userAvailable: !!user, dbAvailable: !!db, isMounted });
      toast({ title: "Save Error", description: "Cannot save. User not signed in or database unavailable.", variant: "destructive" });
      return;
    }
    if (authIsDeleting || authLoading) {
      console.warn("[SaveData]: Aborted. Account deletion or auth loading in progress.");
      toast({ title: "Save Error", description: "Cannot save while account deletion or authentication is in progress.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    setFirestoreError(null);

    const profileToSave: ProfileData = {
      ...newProfileData,
      username: slugifyUsername(newProfileData.username)
    };

    const userDocRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userDocRef, { profile: profileToSave, links: newLinks }, { merge: true });
      setProfileData(profileToSave);
      setLinks(newLinks);
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
  }, [user, db, toast, isMounted, authIsDeleting, authLoading]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleSaveChanges = () => {
    if (!user) {
      toast({ title: "Not Signed In", description: "Please sign in to save changes.", variant: "destructive" });
      return;
    }
    if (!db) {
      toast({ title: "Database Error", description: "Firestore is not available. Cannot save.", variant: "destructive" });
      return;
    }
    if (authIsDeleting || authLoading) {
      toast({ title: "Action Blocked", description: "Account deletion or loading in progress.", variant: "destructive" });
      return;
    }
    saveDataToFirestore(profileData, links);
  };

  const handleShare = async () => {
    if (!user) {
      toast({ title: "Not Signed In", description: "Please sign in to share your page.", variant: "destructive" });
      return;
    }
    if (authIsDeleting || authLoading) {
      toast({ title: "Action Blocked", description: "Action unavailable during account deletion or loading.", variant: "destructive" });
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
      toast({ title: "Not Signed In", description: "Please sign in to delete your account.", variant: "destructive" });
      return;
    }
    await deleteUserAccount();
  };

  if (!isMounted || (authLoading && !user && !authIsDeleting)) {
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

  if (authIsDeleting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <svg className="animate-spin h-10 w-10 text-destructive mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-destructive text-xl">Account deletion in progress...</p>
        <p className="text-muted-foreground mt-2">Please wait while we remove your account.</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-primary font-headline">{APP_NAME}</h1>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme" disabled={authIsDeleting || authLoading}>
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            {user ? (
              <>
                <Button onClick={handleSaveChanges} disabled={isSaving || !!firestoreError || authIsDeleting || authLoading}>
                  <Save className={`mr-2 h-4 w-4 ${isSaving ? 'animate-spin' : ''}`} />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button onClick={handleShare} disabled={authIsDeleting || authLoading}>
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
                
                <AlertDialog>
                  <DropdownMenu open={isAccountMenuOpen} onOpenChange={setIsAccountMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-2 px-2 py-1 h-9" disabled={authIsDeleting || authLoading}>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.photoURL || profileData.profilePictureUrl || undefined} alt={user.displayName || 'User'} data-ai-hint="user avatar" />
                          <AvatarFallback>
                            {profileData.username ? profileData.username.charAt(0).toUpperCase() : <UserCircle size={18} />}
                          </AvatarFallback>
                        </Avatar>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="truncate">
                        {user.displayName || profileData.username || "My Account"}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={signOutUser} disabled={authIsDeleting || authLoading}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          disabled={authIsDeleting || authLoading}
                          onSelect={(e) => e.preventDefault()} 
                        >
                          <Trash2 className={`mr-2 h-4 w-4 ${authIsDeleting ? 'animate-spin' : ''}`} />
                          {authIsDeleting ? 'Deleting...' : 'Delete Account'}
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        account and remove your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={authIsDeleting} onClick={() => setIsAccountMenuOpen(false)}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccountConfirm} disabled={authIsDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        {authIsDeleting ? 'Processing...' : 'Yes, delete account'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <Button onClick={signInWithGoogle} disabled={authIsDeleting || authLoading}>
                <LogIn className="mr-2 h-4 w-4" /> Sign in with Google
              </Button>
            )}
          </div>
        </div>
      </header>

      {!user && !authLoading && !authIsDeleting ? ( 
        <main className="flex-grow container mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Welcome to {APP_NAME}!</h2>
          <p className="text-muted-foreground mb-8 text-lg">Sign in to create and manage your personalized link page.</p>
          <Button size="lg" onClick={signInWithGoogle} disabled={authIsDeleting || authLoading}>
            <LogIn className="mr-2 h-5 w-5" /> Sign in with Google
          </Button>
        </main>
      ) : (
        user && !authIsDeleting && ( 
          <main className="flex-grow container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-screen-2xl">
            {firestoreError && (
              <div className="mb-4 p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <p><strong>Storage Error:</strong> {firestoreError} Ensure Firebase Firestore is enabled and security rules are correctly configured. See console for details.</p>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
              <Tabs defaultValue="profile" className="lg:col-span-2">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="profile">
                    <UserCog className="mr-2 h-5 w-5" />
                    Profile Settings
                  </TabsTrigger>
                  <TabsTrigger value="links">
                    <Link2 className="mr-2 h-5 w-5" />
                    Manage Links
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="profile">
                  <ProfileEditor profileData={profileData} onProfileChange={setProfileData} />
                </TabsContent>
                <TabsContent value="links">
                  <LinkListEditor links={links} onLinksChange={setLinks} />
                </TabsContent>
              </Tabs>
              <div className="lg:col-span-1 lg:sticky lg:top-24 self-start max-h-[calc(100vh-8rem)]">
                <LivePreview profileData={profileData} links={links} showTitle={true} />
              </div>
            </div>
          </main>
        )
      )}

      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        {currentYear ? `© ${currentYear} ${APP_NAME}. Create your own social landing page.` : `${APP_NAME}. Create your own social landing page.`}
      </footer>
    </div>
  );
}
    

      

