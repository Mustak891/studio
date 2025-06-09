
"use client";

import type { ProfileData, LinkData } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card'; 
import NextImage from 'next/image'; 

interface LivePreviewProps {
  profileData: ProfileData;
  links: LinkData[];
  showTitle?: boolean; // New prop to control visibility of the "Live Preview" title
}

export default function LivePreview({ profileData, links, showTitle = true }: LivePreviewProps) {
  const isValidUrl = typeof profileData.profilePictureUrl === 'string' && profileData.profilePictureUrl.trim() !== '';

  return (
    <Card className="shadow-xl overflow-hidden h-full flex flex-col">
      {showTitle && (
        <div className="bg-gradient-to-br from-primary to-accent p-4 text-center">
          <h2 className="text-2xl font-bold text-primary-foreground font-headline">Live Preview</h2>
        </div>
      )}
      
      <div className={`flex-grow p-2 sm:p-4 ${showTitle ? 'bg-muted/20' : 'bg-transparent'} overflow-y-auto`}>
        <div className="max-w-md mx-auto bg-background rounded-xl shadow-2xl p-6 space-y-6 min-h-[400px] flex flex-col items-center">
          <Avatar className="h-24 w-24 ring-4 ring-primary ring-offset-background ring-offset-2">
            {isValidUrl ? (
              <NextImage 
                src={profileData.profilePictureUrl.trim()}
                alt={profileData.username || "Profile"} 
                width={96} 
                height={96} 
                className="rounded-full object-cover"
                data-ai-hint="profile avatar"
                onError={(e) => {
                  const imgElement = e.currentTarget;
                  imgElement.style.display = 'none'; 
                }}
              />
            ) : null}
            <AvatarFallback className="text-3xl bg-secondary text-secondary-foreground">
              {(profileData.username || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground font-headline">
              @{profileData.username || "username"}
            </h1>
            {profileData.bio && (
              <p className="text-muted-foreground mt-1 text-sm">
                {profileData.bio}
              </p>
            )}
          </div>

          <div className="w-full space-y-3 pt-4">
            {links.map((link) => (
              <Button
                key={link.id}
                variant="default"
                size="lg"
                className="w-full justify-center py-6 text-base shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 ease-in-out bg-primary text-primary-foreground hover:bg-primary/90"
                asChild
              >
                <a href={link.url || '#'} target="_blank" rel="noopener noreferrer">
                  {link.title || "Link"}
                </a>
              </Button>
            ))}
             {links.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Your links will appear here.
              </p>
            )}
          </div>
          
          {/* Footer only shown if the preview title is shown (i.e., in editor mode) */}
          {showTitle && (
            <div className="mt-auto pt-6 text-center text-xs text-muted-foreground">
              Powered by <span className="font-semibold text-primary">LinkHub</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

    