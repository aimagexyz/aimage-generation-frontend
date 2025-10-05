import { AlertCircle, CheckCircle, Clock, ExternalLink, RotateCcw, X, XCircle } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Separator } from '@/components/ui/Separator';
import type { BatchProgress, BatchTaskResult } from '@/types/BatchReview';

interface BatchResultsModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Batch processing results */
  results: BatchTaskResult[];
  /** Progress information */
  progress: BatchProgress;
  /** Project ID for navigation */
  projectId: string;
  /** Callback to retry failed tasks */
  onRetryFailed?: (taskIds: string[]) => Promise<void>;
  /** Whether retry operation is in progress */
  isRetrying?: boolean;
  /** Processing time in milliseconds */
  processingTime?: number;
}

/**
 * BatchResultsModal Component
 *
 * SOLID Principles:
 * - Single Responsibility: Shows batch results and provides result actions only
 * - Open/Closed: Extends existing modal patterns without modification
 * - Interface Segregation: Clear separation of display and action concerns
 *
 * DRY Principles:
 * - Reuses existing modal patterns (Dialog, Button, Badge)
 * - Reuses existing navigation patterns
 * - Follows established status display patterns
 *
 * KISS Principles:
 * - Clear visual hierarchy: summary → details → actions
 * - Simple status indicators with consistent iconography
 * - Straightforward retry and navigation flows
 */
export function BatchResultsModal({
  isOpen,
  onClose,
  results,
  progress,
  projectId,
  onRetryFailed,
  isRetrying = false,
  processingTime,
}: BatchResultsModalProps) {
  const navigate = useNavigate();

  // SOLID: Single responsibility - calculate summary statistics
  const summary = useMemo(() => {
    const total = results.length;
    const successful = results.filter((r) => r.status === 'completed').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const pending = results.filter((r) => r.status === 'pending').length;
    const processing = results.filter((r) => r.status === 'processing').length;

    return {
      total,
      successful,
      failed,
      pending,
      processing,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
    };
  }, [results]);

  // SOLID: Single responsibility - get failed task IDs
  const failedTaskIds = useMemo(() => {
    return results.filter((r) => r.status === 'failed').map((r) => r.taskId);
  }, [results]);

  // SOLID: Single responsibility - handle task navigation
  const handleNavigateToTask = useCallback(
    (taskId: string) => {
      // DRY: Reuse existing navigation pattern found in codebase
      const navigationPromise = navigate(`/projects/${projectId}/tasks/${taskId}`);
      if (navigationPromise && typeof navigationPromise.catch === 'function') {
        navigationPromise.catch((error: unknown) => {
          console.error('Navigation failed:', error);
        });
      }
    },
    [navigate, projectId],
  );

  // SOLID: Single responsibility - handle retry action
  const handleRetryFailed = useCallback(async () => {
    if (!onRetryFailed || failedTaskIds.length === 0 || isRetrying) {
      return;
    }

    try {
      await onRetryFailed(failedTaskIds);
      // Modal will stay open to show updated results
    } catch (error) {
      console.error('Retry failed:', error);
      // Error handling will be managed by the parent component
    }
  }, [onRetryFailed, failedTaskIds, isRetrying]);

  // SOLID: Single responsibility - modal close handler
  const handleClose = useCallback(() => {
    if (isRetrying) {
      return; // Prevent closing during retry
    }
    onClose();
  }, [onClose, isRetrying]);

  // SOLID: Single responsibility - get status icon and color
  const getStatusDisplay = useCallback((status: BatchTaskResult['status']) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, variant: 'success' as const, label: '完了' };
      case 'failed':
        return { icon: XCircle, variant: 'destructive' as const, label: '失敗' };
      case 'processing':
        return { icon: Clock, variant: 'warning' as const, label: '処理中' };
      case 'pending':
        return { icon: Clock, variant: 'secondary' as const, label: '待機中' };
      default:
        return { icon: AlertCircle, variant: 'secondary' as const, label: '不明' };
    }
  }, []);

  // KISS: Simple derived state
  const isProcessing = progress.processing > 0;
  const hasFailedTasks = failedTaskIds.length > 0;
  const canRetry = hasFailedTasks && !isRetrying && !isProcessing;

  // KISS: Format processing time for display
  const formattedProcessingTime = useMemo(() => {
    if (!processingTime) {
      return null;
    }
    const seconds = Math.round(processingTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${seconds}秒`;
  }, [processingTime]);

  // Extract header icon logic to avoid nested ternary
  const getHeaderIcon = () => {
    if (summary.successful === summary.total) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (hasFailedTasks) {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
    return <Clock className="h-5 w-5 text-yellow-600" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getHeaderIcon()}
            バッチ処理結果
          </DialogTitle>
          <DialogDescription>
            {summary.total}件のタスクの処理が完了しました。詳細な結果を確認できます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Section - KISS: Clear visual summary */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h3 className="font-medium text-sm">処理サマリー</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.successful}</div>
                <div className="text-xs text-muted-foreground">成功</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                <div className="text-xs text-muted-foreground">失敗</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.successRate}%</div>
                <div className="text-xs text-muted-foreground">成功率</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">{formattedProcessingTime || '---'}</div>
                <div className="text-xs text-muted-foreground">処理時間</div>
              </div>
            </div>

            {/* Progress Bar - DRY: Reuse existing progress patterns */}
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="text-xs text-center text-muted-foreground">
              {progress.completed + progress.failed}/{progress.total} 完了 ({progress.percentage}%)
            </div>
          </div>

          {/* Task Details Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">タスク別結果</h3>
              {hasFailedTasks && (
                <Badge variant="destructive" className="text-xs">
                  {failedTaskIds.length}件の失敗
                </Badge>
              )}
            </div>

            <ScrollArea className="max-h-60 rounded-lg border">
              <div className="p-4 space-y-3">
                {results.map((result) => {
                  const statusDisplay = getStatusDisplay(result.status);
                  const StatusIcon = statusDisplay.icon;

                  // Extract status icon color logic
                  const getStatusIconColor = () => {
                    if (statusDisplay.variant === 'success') {
                      return 'text-green-600';
                    }
                    if (statusDisplay.variant === 'destructive') {
                      return 'text-red-600';
                    }
                    if (statusDisplay.variant === 'warning') {
                      return 'text-yellow-600';
                    }
                    return 'text-muted-foreground';
                  };

                  return (
                    <div key={result.taskId} className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                      {/* Status Icon */}
                      <StatusIcon className={`h-4 w-4 ${getStatusIconColor()}`} />

                      {/* Task Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {result.taskName || `Task ${result.taskId}`}
                          </span>
                          <Badge variant={statusDisplay.variant} className="text-xs">
                            {statusDisplay.label}
                          </Badge>
                        </div>

                        {/* Subtask Progress - Fix conditional rendering */}
                        {result.totalSubtasks != null && result.totalSubtasks > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            サブタスク: {result.subtasksProcessed || 0}/{result.totalSubtasks}
                          </div>
                        )}

                        {/* Error Message */}
                        {result.error && (
                          <div className="text-xs text-red-600 mt-1 break-words">エラー: {result.error}</div>
                        )}

                        {/* Processing Time */}
                        {result.startedAt && result.completedAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            処理時間: {Math.round((result.completedAt.getTime() - result.startedAt.getTime()) / 1000)}秒
                          </div>
                        )}
                      </div>

                      {/* Navigate Button - DRY: Reuse existing navigation pattern */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleNavigateToTask(result.taskId)}
                        className="shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <Separator />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isRetrying}>
            <X className="mr-2 h-4 w-4" />
            閉じる
          </Button>

          {canRetry && (
            <Button onClick={() => void handleRetryFailed()} disabled={!canRetry} variant="default">
              {isRetrying ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  再試行中...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  失敗タスクを再試行 ({failedTaskIds.length}件)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
