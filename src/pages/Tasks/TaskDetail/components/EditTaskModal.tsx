import React from 'react';

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
import type { TaskUpdatePayload } from '@/types/tasks';

// Assuming TaskOut is available from schemas or defined elsewhere for current task data
type TaskOut = components['schemas']['TaskOut'];

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskOut | null; // Current task data to prefill the form
  onSave: (data: TaskUpdatePayload) => void; // Callback when save is clicked, changed to void return
  // users prop will be added later for assignee selection
}

export function EditTaskModal({ isOpen, onClose, task, onSave }: EditTaskModalProps) {
  // Form state will be managed here (e.g., using useState or react-hook-form)
  // For now, simplified structure
  const [name, setName] = React.useState(task?.name || '');
  const [description, setDescription] = React.useState(task?.description || '');

  React.useEffect(() => {
    if (task) {
      setName(task.name || '');
      setDescription(task.description || '');
    } else {
      // Reset form if task is null (e.g. modal reused for create, though not current use case)
      setName('');
      setDescription('');
    }
  }, [task, isOpen]); // also depend on isOpen to reset when re-opened if task is different or cleared

  const handleSubmit = () => {
    const payload: TaskUpdatePayload = {};
    if (name !== (task?.name || '')) {
      payload.title = name;
    }
    if (description !== (task?.description || '')) {
      payload.description = description;
    }

    if (Object.keys(payload).length > 0) {
      onSave(payload);
    }
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Update the details of your task. Click save when you&apos;re done.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <TextArea
              id="description"
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
          <Button type="submit" onClick={handleSubmit}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
