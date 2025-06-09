"use client";

import type { ProfileData, LinkData } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link as LinkIconLucide, User } from 'lucide-react'; // Renamed to avoid conflict
import NextImage from 'next/image'; // Using next/image for optimized images

interface LivePreviewProps {
  profileData: ProfileData;
  links: LinkData[];
}

export default function LivePreview({ profileData, links }: LivePreviewProps) {
  return (
    <Card className="shadow-xl overflow-hidden h-full flex flex-col">
      <div className="bg-gradient-to-br from-primary to-accent p-4 text-center">
        <h2 className="text-2xl font-bold text-primary-foreground font-headline">Live Preview</h2>
      </div>
      
      <div className="flex-grow p-2 sm:p-4 bg-muted/20 overflow-y-auto">
        <div className="max-w-md mx-auto bg-background rounded-xl shadow-2xl p-6 space-y-6 min-h-[400px] flex flex-col items-center">
          <Avatar className="h-24 w-24 ring-4 ring-primary ring-offset-background ring-offset-2">
            {profileData.profilePictureUrl ? (
              <NextImage 
                src={profileData.profilePictureUrl} 
                alt={profileData.username || "Profile"} 
                width={96} 
                height={96} 
                className="rounded-full object-cover"
                data-ai-hint="profile avatar"
                onError={(e) => (e.currentTarget.style.display = 'none')} // Hide if image fails to load
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
                  {/* Minimalist icon can be added here if available for link type */}
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
          
          <div className="mt-auto pt-6 text-center text-xs text-muted-foreground">
            Powered by <span className="font-semibold text-primary">LinkHub</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
