
"use client";

import type { ProfileData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Image as ImageIcon } from 'lucide-react';
import { slugifyUsername } from '@/lib/utils';

interface ProfileEditorProps {
  profileData: ProfileData;
  onProfileChange: (newProfileData: ProfileData) => void;
}

export default function ProfileEditor({ profileData, onProfileChange }: ProfileEditorProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'username') {
      onProfileChange({ ...profileData, username: slugifyUsername(value) });
    } else {
      onProfileChange({ ...profileData, [name]: value });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <User className="h-6 w-6 text-primary" />
          Profile Settings
        </CardTitle>
        <CardDescription>Customize your public profile. Usernames will be auto-formatted for URLs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profileData.profilePictureUrl || undefined} alt={profileData.username} data-ai-hint="profile avatar" />
            <AvatarFallback>
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-grow space-y-2">
            <Label htmlFor="profilePictureUrl">Profile Picture URL</Label>
            <Input
              id="profilePictureUrl"
              name="profilePictureUrl"
              placeholder="https://example.com/image.png"
              value={profileData.profilePictureUrl}
              onChange={handleInputChange}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            placeholder="your-url-friendly-username"
            value={profileData.username} // Displaying the already slugified username
            onChange={handleInputChange}
            className="font-medium"
          />
          {profileData.username && (
             <p className="text-xs text-muted-foreground">
              Your public URL will be: /u/{profileData.username}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            name="bio"
            placeholder="Tell us a little about yourself..."
            value={profileData.bio}
            onChange={handleInputChange}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}
