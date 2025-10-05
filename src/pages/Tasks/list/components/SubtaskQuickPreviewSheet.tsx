import { useQuery } from '@tanstack/react-query';
import { format as formatDate } from 'date-fns';
import { ExternalLink, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { fetchApi } from '@/api/client';
import type { components } from '@/api/schemas';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAsset } from '@/hooks/useAsset';
import { SUBTASK_TYPE_LABELS } from '@/types/tasks';

type SubtaskOut = components['schemas']['SubtaskOut'];

interface SubtaskQuickPreviewSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  subtaskId: string | null;
  projectId: string;
  taskId: string;
}

interface SubtaskContentPreviewProps {
  subtask: SubtaskOut;
}

function SubtaskContentPreview({ subtask }: SubtaskContentPreviewProps) {
  const s3Path = subtask.content?.s3_path;
  const taskType = subtask.content?.task_type;
  const { assetUrl, isAssetLoading } = useAsset(s3Path || '');

  if (isAssetLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-full h-64 rounded-lg" />
        <Skeleton className="w-3/4 h-4" />
        <Skeleton className="w-1/2 h-4" />
      </div>
    );
  }

  if (!assetUrl || !taskType) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
        <p className="text-muted-foreground">プレビューできません</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {taskType === 'picture' && (
        <div className="relative rounded-lg overflow-hidden bg-muted">
          <img
            src={assetUrl}
            alt={subtask.name || 'サブタスク画像'}
            className="w-full h-auto max-h-96 object-contain"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
      )}

      {taskType === 'video' && (
        <div className="relative rounded-lg overflow-hidden bg-muted">
          <video
            src={assetUrl}
            controls
            className="w-full h-auto max-h-96"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          >
            ご利用のブラウザはビデオタグをサポートしていません。
          </video>
        </div>
      )}

      {(taskType === 'text' || taskType === 'word' || taskType === 'excel') && (
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            {SUBTASK_TYPE_LABELS[taskType]} コンテンツです。詳細を確認するには詳細ページに移動してください。
          </p>
        </div>
      )}
    </div>
  );
}

export function SubtaskQuickPreviewSheet({
  isOpen,
  onOpenChange,
  subtaskId,
  projectId,
  taskId,
}: SubtaskQuickPreviewSheetProps) {
  const {
    data: subtask,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['subtask', subtaskId],
    queryFn: () =>
      fetchApi({
        url: `/api/v1/subtasks/${subtaskId}` as '/api/v1/subtasks/{subtask_id}',
        method: 'get',
      }).then((res) => res.data),
    enabled: !!subtaskId && isOpen,
  });

  const taskType = subtask?.content?.task_type;
  const taskTypeDisplay = taskType ? SUBTASK_TYPE_LABELS[taskType] || taskType : '-';

  const statusMap: Record<string, { label: string; className: string }> = {
    pending: { label: '保留中', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-100' },
    accepted: { label: '承認', className: 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' },
    denied: { label: '却下', className: 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100' },
  };

  const subtaskStatus = subtask?.status
    ? statusMap[subtask.status] || {
        label: subtask.status,
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
      }
    : null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">サブタスク プレビュー</SheetTitle>
            <Link
              to={`/projects/${projectId}/tasks/${taskId}?subtaskId=${subtaskId}`}
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              詳細ページへ
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
          {subtask && (
            <SheetDescription className="text-left space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{subtask.name || '無題のサブタスク'}</span>
                {subtaskStatus && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${subtaskStatus.className}`}>
                    {subtaskStatus.label}
                  </span>
                )}
              </div>
              {subtask.description && <p className="text-sm text-muted-foreground">{subtask.description}</p>}
            </SheetDescription>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)] mt-6">
          <div className="space-y-6 pr-6">
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="w-full h-8" />
                <Skeleton className="w-full h-64" />
                <Skeleton className="w-3/4 h-4" />
              </div>
            )}

            {isError && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <p className="text-destructive text-sm">
                    サブタスクの読み込みに失敗しました: {error?.message || '不明なエラー'}
                  </p>
                </CardContent>
              </Card>
            )}

            {subtask && (
              <>
                {/* Basic Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">基本情報</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">種類:</span>
                        <span className="ml-2 font-medium">{taskTypeDisplay}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">作成日時:</span>
                        <span className="ml-2 font-medium">
                          {formatDate(new Date(subtask.created_at), 'yyyy-MM-dd HH:mm')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Content Preview */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">コンテンツ プレビュー</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SubtaskContentPreview subtask={subtask as unknown as SubtaskOut} />
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">アクション</CardTitle>
                    <CardDescription>コメントを追加するには詳細ページに移動してください</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link to={`/projects/${projectId}/tasks/${taskId}?subtaskId=${subtaskId}`}>
                      <Button className="w-full" variant="default">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        コメントを追加
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
