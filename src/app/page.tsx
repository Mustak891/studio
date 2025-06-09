
"use client";

import { useState, useEffect } from 'react';
import type { ProfileData, LinkData } from '@/lib/types';
import ProfileEditor from '@/components/linkhub/ProfileEditor';
import LinkListEditor from '@/components/linkhub/LinkListEditor';
import LivePreview from '@/components/linkhub/LivePreview';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Moon, Sun, Save, Share2, LogIn, LogOut, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const APP_NAME = "LinkHub";
const LOCAL_STORAGE_KEY_PROFILE_PREFIX = `${APP_NAME}_profileData_`;
const LOCAL_STORAGE_KEY_LINKS_PREFIX = `${APP_NAME}_links_`;
const LOCAL_STORAGE_KEY_THEME = `${APP_NAME}_theme`;


const initialProfileData: ProfileData = {
  username: 'yourname',
  bio: 'Your awesome bio goes here!',
  profilePictureUrl: 'https://placehold.co/150x150.png',
};

const initialLinks: LinkData[] = [
  { id: '1', title: 'My Portfolio', url: 'https://example.com/portfolio' },
  { id: '2', title: 'Follow me on X', url: 'https://x.com/yourprofile' },
];

export default function HomePage() {
  const { user, loading: authLoading, signInWithGoogle, signOutUser } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>(initialProfileData);
  const [links, setLinks] = useState<LinkData[]>(initialLinks);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMounted, setIsMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const { toast } = useToast();

  // Derive user-specific localStorage keys
  const userProfileKey = user ? `${LOCAL_STORAGE_KEY_PROFILE_PREFIX}${user.uid}` : null;
  const userLinksKey = user ? `${LOCAL_STORAGE_KEY_LINKS_PREFIX}${user.uid}` : null;


  useEffect(() => {
    // Load theme from localStorage on mount
    const storedTheme = localStorage.getItem(LOCAL_STORAGE_KEY_THEME) as 'light' | 'dark' | null;
    if (storedTheme) {
      setTheme(storedTheme);
    }
    setCurrentYear(new Date().getFullYear());
    setIsMounted(true); // This marks that client-side logic can now run
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(LOCAL_STORAGE_KEY_THEME, theme);
  }, [theme, isMounted]);

  useEffect(() => {
    if (!isMounted || !user || !userProfileKey || !userLinksKey) return;

    // Load user-specific data from localStorage
    const storedProfile = localStorage.getItem(userProfileKey);
    if (storedProfile) {
      setProfileData(JSON.parse(storedProfile));
    } else {
      // If no stored profile for this user, reset to initial or a user-specific default
      setProfileData({
        ...initialProfileData,
        username: user.displayName || 'yourname',
        profilePictureUrl: user.photoURL || 'https://placehold.co/150x150.png'
      });
    }
    
    const storedLinks = localStorage.getItem(userLinksKey);
    if (storedLinks) {
      setLinks(JSON.parse(storedLinks));
    } else {
      setLinks(initialLinks); // Or an empty array, or user-specific initial links
    }
  }, [user, isMounted, userProfileKey, userLinksKey]);


  useEffect(() => {
    if (!isMounted || !user || !userProfileKey) return;
    localStorage.setItem(userProfileKey, JSON.stringify(profileData));
  }, [profileData, user, isMounted, userProfileKey]);

  useEffect(() => {
    if (!isMounted || !user || !userLinksKey) return;
    localStorage.setItem(userLinksKey, JSON.stringify(links));
  }, [links, user, isMounted, userLinksKey]);


  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleSaveChanges = () => {
    if (!user) {
      toast({ title: "Not Signed In", description: "Please sign in to save changes.", variant: "destructive"});
      return;
    }
    // Data is saved to localStorage on change. This button is more for user feedback.
    toast({
      title: "Changes Saved!",
      description: "Your LinkHub profile and links are up-to-date locally.",
    });
  };

  const handleShare = () => {
    const shareUsername = (user && profileData.username) || initialProfileData.username;
    const shareUrl = `${window.location.origin}/u/${shareUsername.replace(/\s+/g, '-').toLowerCase() || "yourpage"}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link Copied!",
        description: `Your LinkHub URL (${shareUrl}) is copied to clipboard.`,
      });
    }).catch(err => {
      toast({
        title: "Failed to Copy",
        description: "Could not copy the link. Please try manually.",
        variant: "destructive",
      });
      console.error('Failed to copy: ', err);
    });
  };
  
  if (!isMounted || authLoading) {
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
                <Button onClick={handleSaveChanges} variant="outline">
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
                <Button onClick={handleShare}>
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} data-ai-hint="user avatar" />
                  <AvatarFallback>
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle size={20}/>}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" onClick={signOutUser}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </Button>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            <div className="lg:col-span-2 space-y-8">
              <ProfileEditor profileData={profileData} onProfileChange={setProfileData} />
              <LinkListEditor links={links} onLinksChange={setLinks} />
            </div>
            <div className="lg:col-span-1 lg:sticky lg:top-24 self-start max-h-[calc(100vh-8rem)]">
              <LivePreview profileData={profileData} links={links} />
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
