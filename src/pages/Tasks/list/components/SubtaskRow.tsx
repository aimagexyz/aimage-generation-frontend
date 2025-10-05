import { Eye, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { components } from '@/api/schemas';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { TableCell, TableRow } from '@/components/ui/Table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import { useAsset } from '@/hooks/useAsset';
import { SUBTASK_TYPE_LABELS, type TaskType } from '@/types/tasks';

// Assuming SubtaskOut is the correct type from generated schemas
type SubtaskOut = components['schemas']['SubtaskOut'];

interface SubtaskMediaDisplayProps {
  s3Path: string;
  taskType: TaskType;
  altText: string;
  onMediaClick: (mediaUrl: string, mediaType: TaskType) => void;
}

function SubtaskMediaDisplay({ s3Path, taskType, altText, onMediaClick }: Readonly<SubtaskMediaDisplayProps>) {
  const { assetUrl, isAssetLoading } = useAsset(s3Path);

  const handlePreviewClick = () => {
    if (assetUrl) {
      onMediaClick(assetUrl, taskType);
    }
  };

  if (isAssetLoading) {
    return <Skeleton className="w-16 h-16 rounded" />;
  }

  if (assetUrl) {
    if (taskType === 'picture') {
      return (
        <img
          src={assetUrl}
          alt={altText}
          className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handlePreviewClick}
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      );
    } else if (taskType === 'video') {
      return (
        <video
          src={assetUrl}
          muted // Mute by default for previews
          className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handlePreviewClick} // Clicking the video area will trigger modal
          onError={(e) => (e.currentTarget.style.display = 'none')}
          onLoadedMetadata={(e) => {
            e.currentTarget.currentTime = 0;
          }} // Show first frame
        >
          ご利用のブラウザはビデオタグをサポートしていません。
        </video>
      );
    }
  }

  return (
    <div className="w-16 h-16 flex items-center justify-center bg-muted rounded text-xs text-muted-foreground">
      表示不可
    </div>
  );
}

interface SubtaskRowProps {
  subtask: SubtaskOut;
  projectId: string;
  taskId: string;
  onMediaClick: (mediaUrl: string, mediaType: TaskType) => void;
  onPreviewClick: (subtaskId: string) => void;
}

export function SubtaskRow({ subtask, projectId, taskId, onMediaClick, onPreviewClick }: Readonly<SubtaskRowProps>) {
  const s3Path = subtask.content?.s3_path;
  const taskType = subtask.content?.task_type;

  const taskTypeDisplay = taskType ? SUBTASK_TYPE_LABELS[taskType] || taskType : '-';

  const statusMap: Record<string, string> = {
    pending: '保留中',
    accepted: '承認',
    denied: '却下',
  };
  const japaneseStatus = subtask.status ? statusMap[subtask.status] || subtask.status : '-';

  let mediaDisplayElement;
  if ((taskType === 'picture' || taskType === 'video') && s3Path) {
    mediaDisplayElement = (
      <SubtaskMediaDisplay
        s3Path={s3Path}
        taskType={taskType}
        altText={subtask.name || 'メディアプレビュー'}
        onMediaClick={onMediaClick}
      />
    );
  } else {
    mediaDisplayElement = (
      <div className="w-16 h-16 flex items-center justify-center bg-muted rounded text-xs text-muted-foreground">
        表示不可
      </div>
    );
  }

  let statusBadgeClasses = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  if (subtask.status === 'accepted') {
    statusBadgeClasses = 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100';
  } else if (subtask.status === 'denied') {
    statusBadgeClasses = 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100';
  }

  return (
    <TableRow className="hover:bg-muted/20 dark:hover:bg-muted/50">
      <TableCell className="w-[80px] p-2 align-middle">{mediaDisplayElement}</TableCell>
      <TableCell className="p-2 text-sm align-middle">{taskTypeDisplay}</TableCell>
      <TableCell className="p-2 text-sm align-middle">
        <span className={`px-2 py-0.5 text-xs rounded-full ${statusBadgeClasses}`}>{japaneseStatus}</span>
      </TableCell>
      <TableCell className="p-2 align-middle">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate max-w-xs">{subtask.name || '無題のサブタスク'}</div>
            {subtask.description && (
              <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{subtask.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onPreviewClick(subtask.id)}
                    className="h-7 w-7 p-0"
                    aria-label="プレビュー"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>プレビュー</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to={`/projects/${projectId}/tasks/${taskId}?subtaskId=${subtask.id}`}>
                    <Button variant="ghost" size="xs" className="h-7 w-7 p-0" aria-label="コメント">
                      <MessageCircle className="h-3 w-3" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>コメントを追加</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
