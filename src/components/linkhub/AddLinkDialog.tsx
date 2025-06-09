"use client";

import { useState } from 'react';
import type { LinkData } from '@/lib/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Sparkles } from 'lucide-react';
import { suggestLinkTitle } from '@/ai/flows/suggest-link-title';
import { useToast } from '@/hooks/use-toast';

interface AddLinkDialogProps {
  onAddLink: (newLink: Omit<LinkData, 'id'>) => void;
}

export default function AddLinkDialog({ onAddLink }: AddLinkDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { toast } = useToast();

  const handleSuggestTitle = async () => {
    if (!url) {
      toast({
        title: "URL Required",
        description: "Please enter a URL to suggest a title.",
        variant: "destructive",
      });
      return;
    }
    setIsSuggesting(true);
    try {
      const result = await suggestLinkTitle({ url });
      if (result.title) {
        setTitle(result.title);
        toast({
          title: "Title Suggested!",
          description: "AI has suggested a title for your link.",
        });
      } else {
         toast({
          title: "Suggestion Failed",
          description: "Could not generate a title for this URL.",
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

  const handleSubmit = () => {
    if (!title || !url) {
      toast({
        title: "Missing Fields",
        description: "Please provide both a title and a URL.",
        variant: "destructive",
      });
      return;
    }
    onAddLink({ title, url });
    setTitle('');
    setUrl('');
    setIsOpen(false);
    toast({
      title: "Link Added!",
      description: "Your new link has been successfully added.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          <PlusCircle className="mr-2 h-5 w-5" />
          Add New Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card">
        <DialogHeader>
          <DialogTitle className="font-headline">Add New Link</DialogTitle>
          <DialogDescription>
            Enter the details for your new link. You can use AI to suggest a title.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="url" className="text-right">
              URL
            </Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="col-span-3"
              placeholder="https://example.com"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              placeholder="My Awesome Link"
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleSuggestTitle} 
            disabled={isSuggesting || !url}
            className="w-full sm:w-auto"
          >
            <Sparkles className={`mr-2 h-4 w-4 ${isSuggesting ? 'animate-spin' : ''}`} />
            {isSuggesting ? "Suggesting..." : "Suggest Title"}
          </Button>
          <Button type="button" onClick={handleSubmit} className="w-full sm:w-auto">
            Save Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
