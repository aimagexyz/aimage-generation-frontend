import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useState } from 'react';
import { LuFile, LuFileText, LuImage, LuVideo } from 'react-icons/lu';

import { fetchApi } from '@/api/client';
import type { components } from '@/api/schemas';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAsset } from '@/hooks/useAsset';
import type { BatchTaskPreviewProps } from '@/types/BatchReview';
import type { TaskType } from '@/types/tasks';

type TaskOut = components['schemas']['TaskOut'];

/**
 * BatchTaskPreview Component
 *
 * SOLID Principles:
 * - Single Responsibility: Only handles displaying selected tasks preview
 * - Open/Closed: Can be extended with more preview features
 * - Interface Segregation: Clean props interface for different use cases
 *
 * DRY Principles:
 * - Reuses existing task thumbnail patterns
 * - Reuses existing UI components (Card, Badge, Button)
 * - Follows established loading and error state patterns
 */

// DRY: Reuse existing task type icon mapping
const TaskTypeIcon = {
  picture: LuImage,
  video: LuVideo,
  text: LuFileText,
  word: LuFileText,
  excel: LuFileText,
  audio: LuFile,
  file: LuFile,
} as const;

// SOLID: Single responsibility - display task thumbnail
interface TaskThumbnailProps {
  task: TaskOut;
  compact?: boolean;
}

function TaskThumbnail({ task, compact = false }: TaskThumbnailProps) {
  // Use task's s3_path directly (following existing pattern)
  const s3Path = task.s3_path;
  const taskType = 'picture' as TaskType; // Default to picture for simplicity

  const { assetUrl, isAssetLoading } = useAsset(s3Path);

  const size = compact ? 'w-8 h-8' : 'w-12 h-12';

  if (isAssetLoading) {
    return <Skeleton className={clsx(size, 'rounded flex-shrink-0')} />;
  }

  // Show image thumbnail for picture tasks
  if (assetUrl && taskType === 'picture') {
    return (
      <img
        src={assetUrl}
        alt={task.name}
        className={clsx(size, 'object-cover rounded border border-border flex-shrink-0')}
        onError={(e) => {
          // Fallback to icon on image load error
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  // Show video thumbnail for video tasks
  if (assetUrl && taskType === 'video') {
    return (
      <video
        src={assetUrl}
        muted
        className={clsx(size, 'object-cover rounded border border-border flex-shrink-0')}
        onLoadedMetadata={(e) => {
          e.currentTarget.currentTime = 0; // Show first frame
        }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      >
        ご利用のブラウザはビデオタグをサポートしていません。
      </video>
    );
  }

  // Fallback to type icon
  const IconComponent = TaskTypeIcon[taskType] || LuFile;
  return (
    <div
      className={clsx(size, 'flex items-center justify-center bg-muted/30 rounded border border-border flex-shrink-0')}
      title={`${task.name} (${taskType})`}
    >
      <IconComponent className={compact ? 'w-4 h-4' : 'w-6 h-6'} />
    </div>
  );
}

// SOLID: Single responsibility - display individual task card
interface TaskPreviewCardProps {
  task: TaskOut;
  compact?: boolean;
  onRemove?: (taskId: string) => void;
  showRemove?: boolean;
}

function TaskPreviewCard({ task, compact = false, onRemove, showRemove = false }: TaskPreviewCardProps) {
  return (
    <Card className={clsx('relative', compact ? 'p-2' : 'p-3')}>
      <CardContent className="p-0">
        <div className="flex items-center gap-3">
          <TaskThumbnail task={task} compact={compact} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={clsx('font-medium truncate', compact ? 'text-sm' : 'text-base')}>{task.name}</p>

              {/* Show remove button if enabled */}
              {showRemove && onRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 flex-shrink-0"
                  onClick={() => onRemove(task.id)}
                  title="このタスクを除外"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className={compact ? 'text-xs' : 'text-sm'}>
                {task.status_id}
              </Badge>
              <span className={clsx('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
                Task ID: {task.tid}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BatchTaskPreview({
  taskIds,
  projectId,
  onRemoveTask,
  maxVisible = 5,
  compact = false,
}: BatchTaskPreviewProps) {
  const [showAll, setShowAll] = useState(false);

  // KISS: Use simple query to fetch task details
  const {
    data: tasks,
    isLoading,
    isError,
  } = useQuery<TaskOut[]>({
    queryKey: ['batchTaskPreview', projectId, taskIds],
    queryFn: async () => {
      // Fetch tasks in parallel for better performance
      const taskPromises = taskIds.map((taskId) =>
        fetchApi({
          url: `/api/v1/tasks/${taskId}` as '/api/v1/tasks/{task_id}',
          method: 'get',
        }).then((res) => res.data),
      );

      const results = await Promise.allSettled(taskPromises);

      // Filter successful results and log errors
      return results
        .map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            console.warn(`Failed to fetch task ${taskIds[index]}:`, result.reason);
            return null;
          }
        })
        .filter((task): task is TaskOut => task !== null);
    },
    enabled: taskIds.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes cache
  });

  // KISS: Simple loading state
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: Math.min(taskIds.length, maxVisible) }).map((_, index) => (
          <Skeleton key={index} className={compact ? 'h-12' : 'h-16'} />
        ))}
      </div>
    );
  }

  // KISS: Simple error state
  if (isError || !tasks) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground text-center">タスク情報の読み込みに失敗しました</p>
      </Card>
    );
  }

  // KISS: Handle empty state
  if (tasks.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground text-center">選択されたタスクが見つかりません</p>
      </Card>
    );
  }

  // SOLID: Single responsibility - determine display logic
  const displayTasks = showAll ? tasks : tasks.slice(0, maxVisible);
  const hasMore = tasks.length > maxVisible;
  const hiddenCount = tasks.length - maxVisible;

  return (
    <div className="space-y-3">
      {/* Task Preview Cards */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {displayTasks.map((task) => (
          <TaskPreviewCard
            key={task.id}
            task={task}
            compact={compact}
            onRemove={onRemoveTask}
            showRemove={!!onRemoveTask}
          />
        ))}
      </div>

      {/* Show More/Less Button */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-muted-foreground hover:text-foreground"
          >
            {showAll ? (
              <>
                <ChevronUp className="mr-1 h-4 w-4" />
                表示を減らす
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-4 w-4" />他{hiddenCount}件を表示
              </>
            )}
          </Button>
        </div>
      )}

      {/* Summary */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">合計 {tasks.length}件のタスクが選択されています</p>
      </div>
    </div>
  );
}
