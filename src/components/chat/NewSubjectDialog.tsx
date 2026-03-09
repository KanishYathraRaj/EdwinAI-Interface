'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload } from 'lucide-react';
import { useState } from 'react';

interface NewSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubjectCreate: (title: string, file: File) => void;
}

export function NewSubjectDialog({ open, onOpenChange, onSubjectCreate }: NewSubjectDialogProps) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleCreateSubject = () => {
    if (!file) return;
    onSubjectCreate(title || 'New Subject', file);
    // Reset state after creation
    setTitle('');
    setFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    } else {
      setFile(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Subject</DialogTitle>
          <DialogDescription>
            Uploading a syllabus PDF is mandatory and can only be done during subject creation.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Biology Lesson Plan"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="e.g., A chat to help create a lesson plan for 9th grade biology."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="syllabus">Syllabus (PDF)</Label>
            <div className="flex items-center">
              <label htmlFor="syllabus-file" className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground border border-input rounded-md px-3 py-2 w-full">
                <Upload size={16} />
                <span>{file?.name || 'Choose File'}</span>
              </label>
              <Input id="syllabus-file" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf" />
            </div>
            {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreateSubject} disabled={!file}>Create Subject</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
