import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { TaskTagOut } from '@/api/taskTagsService';

import { TaskTagsModal } from './TaskTagsModal';
import { Badge } from './ui/Badge';

interface TaskTagsDisplayProps {
  taskId: string;
  projectId: string;
  tags: TaskTagOut[];
  maxDisplay?: number;
}

export function TaskTagsDisplay({ taskId, projectId, tags, maxDisplay = 2 }: TaskTagsDisplayProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentTags, setCurrentTags] = useState<TaskTagOut[]>(tags);
  const queryClient = useQueryClient();

  // Update currentTags when props.tags changes
  useEffect(() => {
    setCurrentTags(tags);
  }, [tags]);

  const displayTags = currentTags.slice(0, maxDisplay);
  const hiddenCount = Math.max(0, currentTags.length - maxDisplay);

  const handleTagsChange = (newTags: TaskTagOut[]) => {
    setCurrentTags(newTags);
    // Invalidate tasks query to refresh the list
    void queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
  };

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setIsEditDialogOpen(true)}
        title="クリックしてタグを編集"
      >
        {displayTags.map((tag) => (
          <Badge key={tag.id} variant="secondary" className="text-xs px-1.5 py-0.5">
            {tag.name}
          </Badge>
        ))}
        {hiddenCount > 0 && (
          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
            +{hiddenCount}
          </Badge>
        )}
        {currentTags.length === 0 && (
          <span className="text-xs text-muted-foreground hover:text-muted-foreground/80">＋追加</span>
        )}
      </div>

      <TaskTagsModal
        taskId={taskId}
        projectId={projectId}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        initialTags={currentTags}
        onTagsChange={handleTagsChange}
      />
    </>
  );
}
