import React, { useEffect, useState } from 'react';

import type { components } from '@/api/schemas';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { TextArea } from '@/components/ui/TextArea';

interface EditSubtaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtask: components['schemas']['SubtaskDetail'];
  onSave: (data: components['schemas']['SubtaskUpdate']) => void; // Callback when save is clicked
}

export function EditSubtaskModal({ isOpen, onClose, subtask, onSave }: EditSubtaskModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen && subtask) {
      setName(subtask.name || '');
      setDescription(subtask.description || '');
    }
  }, [isOpen, subtask]);

  const handleSave = () => {
    // Explicitly define original values to help with type inference
    const originalName = subtask?.name ?? '';
    const originalDescription = subtask?.description ?? '';

    // Only include fields that have changed or are not empty
    const payload: components['schemas']['SubtaskUpdate'] = {};

    if (name.trim() !== originalName) {
      payload.name = name.trim();
    }

    if (description.trim() !== originalDescription) {
      payload.description = description.trim();
    }

    // Call the callback with the payload
    onSave(payload);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Subtask</DialogTitle>
          <DialogDescription>Update the details of your subtask. Click save when you&apos;re done.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subtask-name" className="text-right">
              Name
            </Label>
            <Input
              id="subtask-name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subtask-description" className="text-right">
              Description
            </Label>
            <TextArea
              id="subtask-description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
