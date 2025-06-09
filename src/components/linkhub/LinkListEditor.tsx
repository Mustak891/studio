"use client";

import type { LinkData } from '@/lib/types';
import LinkItemEditor from './LinkItemEditor';
import AddLinkDialog from './AddLinkDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link as LinkIcon } from 'lucide-react';

interface LinkListEditorProps {
  links: LinkData[];
  onLinksChange: (newLinks: LinkData[]) => void;
}

export default function LinkListEditor({ links, onLinksChange }: LinkListEditorProps) {
  const handleAddLink = (newLink: Omit<LinkData, 'id'>) => {
    onLinksChange([...links, { ...newLink, id: Date.now().toString() }]);
  };

  const handleUpdateLink = (updatedLink: LinkData) => {
    onLinksChange(links.map(link => (link.id === updatedLink.id ? updatedLink : link)));
  };

  const handleDeleteLink = (id: string) => {
    onLinksChange(links.filter(link => link.id !== id));
  };

  // Note: Drag-and-drop functionality is visually hinted but not implemented.
  // For full implementation, a library like 'react-beautiful-dnd' or 'dnd-kit' would be needed.

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <LinkIcon className="h-6 w-6 text-primary" />
          Manage Links
        </CardTitle>
        <CardDescription>Add, edit, and arrange your links. Drag to reorder (visual only).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AddLinkDialog onAddLink={handleAddLink} />
        {links.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No links yet. Click "Add New Link" to get started!
          </p>
        )}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
          {links.map((link) => (
            <LinkItemEditor
              key={link.id}
              link={link}
              onUpdate={handleUpdateLink}
              onDelete={handleDeleteLink}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
