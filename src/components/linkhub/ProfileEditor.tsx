"use client";

import type { ProfileData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Image as ImageIcon } from 'lucide-react';

interface ProfileEditorProps {
  profileData: ProfileData;
  onProfileChange: (newProfileData: ProfileData) => void;
}

export default function ProfileEditor({ profileData, onProfileChange }: ProfileEditorProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onProfileChange({ ...profileData, [e.target.name]: e.target.value });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <User className="h-6 w-6 text-primary" />
          Profile Settings
        </CardTitle>
        <CardDescription>Customize your public profile.</CardDescription>
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
            placeholder="yourname"
            value={profileData.username}
            onChange={handleInputChange}
            className="font-medium"
          />
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
