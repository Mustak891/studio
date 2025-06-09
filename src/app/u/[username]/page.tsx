
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { ProfileData, LinkData } from '@/lib/types';
import LivePreview from '@/components/linkhub/LivePreview';
import { Button } from '@/components/ui/button'; // For a back button or link
import { Home } from 'lucide-react';

const SHARED_APP_NAME = "LinkHub"; // Must match APP_NAME in src/app/page.tsx for localStorage keys

// Public data key prefixes (must match those in src/app/page.tsx)
const PUBLIC_PROFILE_KEY_PREFIX = `${SHARED_APP_NAME}_public_profile_`;
const PUBLIC_LINKS_KEY_PREFIX = `${SHARED_APP_NAME}_public_links_`;

export default function UserPublicPage() {
  const params = useParams();
  // Ensure usernameSlug is always lowercase for consistent localStorage key lookup
  const usernameSlug = params.username ? (params.username as string).toLowerCase() : "";

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [links, setLinks] = useState<LinkData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (!usernameSlug) {
      setError("Username not found in URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // usernameSlug is already lowercased above
      const publicProfileKey = `${PUBLIC_PROFILE_KEY_PREFIX}${usernameSlug}`;
      const publicLinksKey = `${PUBLIC_LINKS_KEY_PREFIX}${usernameSlug}`;

      const storedProfile = localStorage.getItem(publicProfileKey);
      const storedLinks = localStorage.getItem(publicLinksKey);

      if (storedProfile && storedLinks) {
        setProfileData(JSON.parse(storedProfile));
        setLinks(JSON.parse(storedLinks));
        setError(null); 
      } else {
        setError(`Profile for "${usernameSlug}" not found in your local browser storage. This page can only be viewed if the profile was created or saved using this browser. For true public sharing, a database backend would be needed.`);
      }
    } catch (e) {
      console.error("Error loading public profile from localStorage:", e);
      setError("Could not load profile data due to an unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [usernameSlug, isMounted]);

  if (!isMounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-foreground text-xl">Loading Profile...</p>
      </div>
    );
  }

  if (error || !profileData || !links) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center px-6 py-12">
        <div className="bg-card p-8 rounded-lg shadow-xl max-w-md w-full">
          <h1 className="text-3xl font-bold text-destructive mb-4">Profile Not Found</h1>
          <p className="text-muted-foreground mb-8 whitespace-pre-line">{error || "The requested profile could not be loaded."}</p>
          <Button asChild>
            <a href="/">
              <Home className="mr-2 h-5 w-5" />
              Go to Homepage
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/10 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md">
            <LivePreview profileData={profileData} links={links} showTitle={false} />
            <p className="text-center text-xs text-muted-foreground mt-8">
                Powered by <a href="/" className="font-semibold text-primary hover:underline">{SHARED_APP_NAME}</a>
            </p>
        </div>
    </div>
  );
}

