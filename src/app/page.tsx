"use client";

import { useState, useEffect } from 'react';
import type { ProfileData, LinkData } from '@/lib/types';
import ProfileEditor from '@/components/linkhub/ProfileEditor';
import LinkListEditor from '@/components/linkhub/LinkListEditor';
import LivePreview from '@/components/linkhub/LivePreview';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Save, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const APP_NAME = "LinkHub";
const LOCAL_STORAGE_KEY_PROFILE = `${APP_NAME}_profileData`;
const LOCAL_STORAGE_KEY_LINKS = `${APP_NAME}_links`;
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
  const [profileData, setProfileData] = useState<ProfileData>(initialProfileData);
  const [links, setLinks] = useState<LinkData[]>(initialLinks);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load data from localStorage on mount
    const storedProfile = localStorage.getItem(LOCAL_STORAGE_KEY_PROFILE);
    if (storedProfile) {
      setProfileData(JSON.parse(storedProfile));
    }
    const storedLinks = localStorage.getItem(LOCAL_STORAGE_KEY_LINKS);
    if (storedLinks) {
      setLinks(JSON.parse(storedLinks));
    }
    const storedTheme = localStorage.getItem(LOCAL_STORAGE_KEY_THEME) as 'light' | 'dark' | null;
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    // Save data to localStorage whenever it changes
    localStorage.setItem(LOCAL_STORAGE_KEY_PROFILE, JSON.stringify(profileData));
  }, [profileData, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem(LOCAL_STORAGE_KEY_LINKS, JSON.stringify(links));
  }, [links, isMounted]);
  
  useEffect(() => {
    if (!isMounted) return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(LOCAL_STORAGE_KEY_THEME, theme);
  }, [theme, isMounted]);


  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleSaveChanges = () => {
    // This function is mostly for show in a client-only setup,
    // as data is saved on change. In a real app, this would POST to a backend.
    toast({
      title: "Changes Saved!",
      description: "Your LinkHub profile and links are up-to-date locally.",
    });
  };

  const handleShare = () => {
    // In a real app, this would be profileData.username or a unique ID.
    const shareUrl = `${window.location.origin}/u/${profileData.username || "yourpage"}`;
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
  
  if (!isMounted) {
    return ( // Basic loading state to avoid hydration mismatch with theme
      <div className="flex items-center justify-center min-h-screen bg-background">
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
            <Button onClick={handleSaveChanges} variant="outline">
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
            <Button onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-screen-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
          <div className="lg:col-span-2 space-y-8">
            <ProfileEditor profileData={profileData} onProfileChange={setProfileData} />
            <LinkListEditor links={links} onLinksChange={setLinks} />
          </div>
          <div className="lg:col-span-1 lg:sticky lg:top-24 self-start max-h-[calc(100vh-8rem)]">
            {/* Ensure LivePreview takes up available height within its sticky container */}
            <LivePreview profileData={profileData} links={links} />
          </div>
        </div>
      </main>
      
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} {APP_NAME}. Create your own social landing page.
      </footer>
    </div>
  );
}
