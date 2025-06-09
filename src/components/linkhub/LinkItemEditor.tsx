
"use client";

import type { LinkData } from '@/lib/types';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GripVertical, Sparkles, Trash2 } from 'lucide-react';
import { suggestLinkTitle } from '@/ai/flows/suggest-link-title';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';

interface LinkItemEditorProps {
  link: LinkData;
  onUpdate: (updatedLink: LinkData) => void;
  onDelete: (id: string) => void;
}

export default function LinkItemEditor({ link, onUpdate, onDelete }: LinkItemEditorProps) {
  const [localLink, setLocalLink] = useState<LinkData>(link);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedLink = { ...localLink, [e.target.name]: e.target.value };
    setLocalLink(updatedLink);
    onUpdate(updatedLink); // Update parent state on every change for live preview
  };

  const handleTitleSuggestion = async () => {
    if (!localLink.url) {
      toast({
        title: "URL Required",
        description: "Please enter a URL to suggest a title.",
        variant: "destructive",
      });
      return;
    }

    setIsSuggesting(true);
    try {
      const result = await suggestLinkTitle({ url: localLink.url });
      if (result.title) {
        const updatedLink = { ...localLink, title: result.title };
        setLocalLink(updatedLink);
        onUpdate(updatedLink);
        toast({
          title: "Title Suggested!",
          description: "AI has suggested a new title for your link.",
        });
      } else {
        toast({
          title: "Suggestion Failed",
          description: "Could not generate a title. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error suggesting title:", error);
      toast({
        title: "Error",
        description: "An error occurred while suggesting the title.",
        variant: "destructive",
      });
    } finally {
      setIsSuggesting(false);
    }
  };
  
  return (
    <div className="p-4 border rounded-lg bg-card flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-2">
        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" aria-label="Drag to reorder (visual only)" />
        <div className="flex-grow space-y-2">
          <div>
            <Label htmlFor={`title-${link.id}`} className="text-sm font-medium">Title</Label>
            <Input
              id={`title-${link.id}`}
              name="title"
              value={localLink.title}
              onChange={handleChange}
              placeholder="Link Title"
              className="text-base"
            />
          </div>
          <div>
            <Label htmlFor={`url-${link.id}`} className="text-sm font-medium">URL</Label>
            <Input
              id={`url-${link.id}`}
              name="url"
              type="url"
              value={localLink.url}
              onChange={handleChange}
              placeholder="https://example.com"
              className="text-base"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTitleSuggestion}
          disabled={isSuggesting || !localLink.url}
          aria-label="Suggest title using AI"
        >
          <Sparkles className={`mr-2 h-4 w-4 ${isSuggesting ? 'animate-spin' : ''}`} />
          {isSuggesting ? "Suggesting..." : "Suggest Title"}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(link.id)}
          aria-label="Delete link"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

