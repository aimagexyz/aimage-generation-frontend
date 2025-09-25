import clsx from 'clsx';
import { AlertTriangle, CheckCircle, Clock, Loader2, Play, X, XCircle } from 'lucide-react';
import { useMemo } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Separator } from '@/components/ui/Separator';
import type { BatchProgress, BatchProgressTrackerProps, BatchTaskResult } from '@/types/BatchReview';

/**
 * BatchProgressTracker Component
 *
 * SOLID Principles:
 * - Single Responsibility: Only handles displaying batch progress information
 * - Open/Closed: Can be extended with more progress features
 * - Interface Segregation: Clean props interface for different display modes
 *
 * DRY Principles:
 * - Reuses existing progress display patterns from BatchDetailPanel
 * - Reuses existing UI components (Progress, Badge, Card)
 * - Follows established status display patterns
 */

// SOLID: Single responsibility - status display utilities
const getStatusIcon = (status: BatchTaskResult['status']) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4 text-muted-foreground" />;
    case 'processing':
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return null;
  }
};

const getStatusBadge = (status: BatchTaskResult['status']) => {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">待機中</Badge>;
    case 'processing':
      return (
        <Badge variant="default" className="bg-blue-500">
          処理中
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="default" className="bg-green-500">
          完了
        </Badge>
      );
    case 'failed':
      return <Badge variant="destructive">失敗</Badge>;
    default:
      return null;
  }
};

// SOLID: Single responsibility - individual task progress item
interface TaskProgressItemProps {
  task: BatchTaskResult;
  isCurrentTask?: boolean;
  onRetry?: (taskId: string) => void;
}

function TaskProgressItem({ task, isCurrentTask = false, onRetry }: TaskProgressItemProps) {
  // Calculate duration - extract nested ternary for clarity
  let duration = null;
  if (task.startedAt && task.completedAt) {
    duration = `${Math.round((task.completedAt.getTime() - task.startedAt.getTime()) / 1000)}s`;
  } else if (task.startedAt) {
    duration = `${Math.round((Date.now() - task.startedAt.getTime()) / 1000)}s`;
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
        isCurrentTask ? 'bg-blue-50 border-blue-200' : 'bg-background border-border',
        isCurrentTask && 'ring-2 ring-blue-200',
      )}
    >
      {getStatusIcon(task.status)}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{task.taskName || task.taskId}</p>
          {getStatusBadge(task.status)}
        </div>

        <div className="flex items-center gap-4 mt-1">
          <span className="text-xs text-muted-foreground">ID: {task.taskId}</span>
          {duration && <span className="text-xs text-muted-foreground">{duration}</span>}
          {task.subtasksProcessed != null && task.totalSubtasks != null && (
            <span className="text-xs text-muted-foreground">
              {task.subtasksProcessed}/{task.totalSubtasks} サブタスク
            </span>
          )}
        </div>

        {task.error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {task.error}
            </div>
          </div>
        )}
      </div>

      {/* Retry button for failed tasks */}
      {task.status === 'failed' && onRetry && (
        <Button variant="outline" size="sm" onClick={() => onRetry(task.taskId)} className="flex-shrink-0">
          <Play className="w-3 h-3 mr-1" />
          再試行
        </Button>
      )}
    </div>
  );
}

// SOLID: Single responsibility - progress summary statistics
interface ProgressSummaryProps {
  progress: BatchProgress;
  results: BatchTaskResult[];
}

function ProgressSummary({ progress, results }: ProgressSummaryProps) {
  // DRY: Reuse existing statistics calculation patterns
  const stats = useMemo(() => {
    const pending = results.filter((r) => r.status === 'pending').length;
    const processing = results.filter((r) => r.status === 'processing').length;
    const completed = results.filter((r) => r.status === 'completed').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    return { pending, processing, completed, failed };
  }, [results]);

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>全体進捗</span>
          <span>
            {progress.completed + progress.failed}/{progress.total}
          </span>
        </div>
        <Progress value={progress.percentage} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="text-green-600">完了: {stats.completed}</span>
          <span className="text-red-600">失敗: {stats.failed}</span>
          <span className="text-blue-600">処理中: {stats.processing}</span>
          <span className="text-gray-600">待機: {stats.pending}</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold">{progress.total}</div>
          <div className="text-sm text-muted-foreground">総タスク数</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-muted-foreground">完了</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-sm text-muted-foreground">失敗</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
          <div className="text-sm text-muted-foreground">処理中</div>
        </div>
      </div>

      {/* Current Task Info */}
      {progress.currentTask && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-sm font-medium">現在処理中:</span>
            <span className="text-sm">{progress.currentTaskName || progress.currentTask}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function BatchProgressTracker({
  progress,
  results,
  showDetails = false,
  onRetryFailed,
  onCancel,
}: BatchProgressTrackerProps) {
  // SOLID: Single responsibility - determine failed tasks
  const failedTasks = useMemo(() => results.filter((r) => r.status === 'failed').map((r) => r.taskId), [results]);

  const handleRetryFailed = () => {
    if (onRetryFailed && failedTasks.length > 0) {
      onRetryFailed(failedTasks);
    }
  };

  const handleRetryTask = (taskId: string) => {
    if (onRetryFailed) {
      onRetryFailed([taskId]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            バッチ処理進捗
          </CardTitle>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {failedTasks.length > 0 && onRetryFailed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryFailed}
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                <Play className="w-3 h-3 mr-1" />
                失敗タスクを再試行 ({failedTasks.length})
              </Button>
            )}

            {onCancel && progress.processing > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <X className="w-3 h-3 mr-1" />
                キャンセル
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Summary - Always visible */}
        <ProgressSummary progress={progress} results={results} />

        {/* Detailed Task List - Optional */}
        {showDetails && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium">タスク詳細</h4>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {results.map((task) => (
                    <TaskProgressItem
                      key={task.taskId}
                      task={task}
                      isCurrentTask={task.taskId === progress.currentTask}
                      onRetry={handleRetryTask}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
