import { FileImage } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { LuCheck, LuFile, LuImage, LuLoader, LuPlus, LuTrash2, LuUpload, LuX } from 'react-icons/lu';

import { createTaskFromImage } from '@/api/tasks';
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
import { Progress } from '@/components/ui/Progress';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Separator } from '@/components/ui/Separator';
import { toast } from '@/components/ui/use-toast';
import { useBatchInitiateAiReview } from '@/hooks/aiReview/useBatchInitiateAiReview';
import { getFileDisplayName, isSpecialImageFile } from '@/utils/fileUtils';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  taskId?: string;
  error?: string;
}

interface BatchUploadModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  projectId: string;
}

const MAX_IMAGES = 600;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export function BatchUploadModal({ isOpen, onOpenChange, projectId }: BatchUploadModalProps): JSX.Element {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const batchInitiateAiReview = useBatchInitiateAiReview();

  // 計算状態
  const stats = useMemo(() => {
    const pending = images.filter((img) => img.status === 'pending').length;
    const uploading = images.filter((img) => img.status === 'uploading').length;
    const uploaded = images.filter((img) => img.status === 'uploaded').length;
    const failed = images.filter((img) => img.status === 'failed').length;
    const total = images.length;
    const uploadedTaskIds = images.filter((img) => img.status === 'uploaded' && img.taskId).map((img) => img.taskId!);

    return { pending, uploading, uploaded, failed, total, uploadedTaskIds };
  }, [images]);

  // ドラッグ&ドロップ処理
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    addImages(files);
  }, []);

  // 画像追加処理
  const addImages = useCallback(
    (files: File[]) => {
      const validFiles = files.filter((file) => {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          toast({
            title: 'エラー',
            description: `${file.name}：サポートされていないファイル形式です`,
            variant: 'destructive',
          });
          return false;
        }
        return true;
      });

      const currentCount = images.length;
      const availableSlots = MAX_IMAGES - currentCount;

      if (validFiles.length > availableSlots) {
        toast({
          title: '制限を超えています',
          description: `最大${MAX_IMAGES}枚まで選択できます。${availableSlots}枚のみ追加します。`,
          variant: 'destructive',
        });
        validFiles.splice(availableSlots);
      }

      const newImages: UploadedImage[] = validFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        status: 'pending',
      }));

      setImages((prev) => [...prev, ...newImages]);
    },
    [images.length],
  );

  // ファイル選択処理
  const handleFileSelect = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = ACCEPTED_IMAGE_TYPES.join(',');
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      addImages(files);
    };
    input.click();
  }, [addImages]);

  // 画像削除処理
  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image?.preview) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  // 全削除処理
  const clearAllImages = useCallback(() => {
    images.forEach((img) => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });
    setImages([]);
  }, [images]);

  // 単一画像のタスク作成（リトライ付き）
  const createTaskWithRetry = useCallback(
    async (image: UploadedImage): Promise<{ success: boolean; imageId: string; error?: Error }> => {
      const RETRY_ATTEMPTS = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
        try {
          setImages((prev) => prev.map((img) => (img.id === image.id ? { ...img, status: 'uploading' } : img)));

          const result = await createTaskFromImage(projectId, image.file);

          setImages((prev) =>
            prev.map((img) => (img.id === image.id ? { ...img, status: 'uploaded', taskId: result.id } : img)),
          );

          return { success: true, imageId: image.id };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('アップロードに失敗しました');

          if (attempt < RETRY_ATTEMPTS) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      // すべてのリトライが失敗
      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id
            ? {
                ...img,
                status: 'failed',
                error: lastError?.message || 'アップロードに失敗しました',
              }
            : img,
        ),
      );

      return { success: false, imageId: image.id, error: lastError || undefined };
    },
    [projectId],
  );

  // バッチ結果の集計
  const aggregateBatchResults = useCallback(
    (batchResults: PromiseSettledResult<{ success: boolean; imageId: string; error?: Error }>[]) => {
      let completed = 0;
      let failed = 0;

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            completed++;
          } else {
            failed++;
          }
        } else {
          failed++;
        }
      });

      return { completed, failed };
    },
    [],
  );

  // タスク作成処理
  const createTasksFromImages = useCallback(async () => {
    const pendingImages = images.filter((img) => img.status === 'pending');
    if (pendingImages.length === 0) {
      return;
    }

    setIsCreatingTasks(true);
    setUploadProgress(0);

    try {
      let totalCompleted = 0;
      let totalFailed = 0;
      const total = pendingImages.length;
      const BATCH_SIZE = 3;
      const DELAY_BETWEEN_BATCHES = 500;

      for (let i = 0; i < pendingImages.length; i += BATCH_SIZE) {
        const batch = pendingImages.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map((image) => createTaskWithRetry(image));
        const batchResults = await Promise.allSettled(batchPromises);

        const { completed, failed } = aggregateBatchResults(batchResults);
        totalCompleted += completed;
        totalFailed += failed;

        setUploadProgress(((totalCompleted + totalFailed) / total) * 100);

        if (i + BATCH_SIZE < pendingImages.length) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }

      const successMessage = `${totalCompleted}件のタスクが正常に作成されました`;
      const failureMessage = totalFailed > 0 ? `（${totalFailed}件失敗）` : '';
      const fullMessage = successMessage + failureMessage;

      if (totalCompleted > 0) {
        toast({
          title: 'タスク作成完了',
          description: fullMessage,
          variant: totalCompleted === total ? 'default' : 'destructive',
        });
      } else {
        toast({
          title: 'エラー',
          description: 'すべてのタスクの作成に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Batch task creation failed:', error);
      toast({
        title: 'エラー',
        description: 'タスクの作成処理でエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingTasks(false);
      setUploadProgress(0);
    }
  }, [images, createTaskWithRetry, aggregateBatchResults]);

  // モーダル閉じる処理
  const handleClose = useCallback(() => {
    if (isCreatingTasks || batchInitiateAiReview.isPending) {
      toast({
        title: '処理中です',
        description: '処理が完了するまでお待ちください',
        variant: 'destructive',
      });
      return;
    }

    // クリーンアップ
    images.forEach((img) => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });
    setImages([]);
    setUploadProgress(0);
    onOpenChange(false);
  }, [isCreatingTasks, batchInitiateAiReview.isPending, images, onOpenChange]);

  // バッチ処理開始処理
  const startBatchProcess = useCallback(() => {
    if (stats.uploadedTaskIds.length === 0) {
      return;
    }

    batchInitiateAiReview.mutate(
      {
        project_id: projectId,
        task_ids: stats.uploadedTaskIds,
      },
      {
        onSuccess: () => {
          toast({
            title: 'バッチ処理開始',
            description: `${stats.uploadedTaskIds.length}件のタスクでバッチ処理を開始しました。`,
            variant: 'default',
          });
          // バックグラウンドタスクなので、開始後にモーダルを閉じる
          handleClose();
        },
        onError: () => {
          toast({
            title: 'エラー',
            description: 'バッチ処理の開始に失敗しました',
            variant: 'destructive',
          });
        },
      },
    );
  }, [stats.uploadedTaskIds, projectId, batchInitiateAiReview, handleClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LuUpload className="h-5 w-5 text-blue-600" />
            バッチ画像アップロード
          </DialogTitle>
          <DialogDescription>
            画像を最大{MAX_IMAGES}枚まで選択し、タスクを一括作成してバッチ処理を実行できます。
          </DialogDescription>
        </DialogHeader>

        {/* 統計情報 */}
        <div className="flex items-center gap-4 py-2">
          <Badge variant="secondary">
            {stats.total} / {MAX_IMAGES} 枚
          </Badge>
          {stats.pending > 0 && (
            <Badge variant="outline" className="text-gray-600">
              {stats.pending} 待機中
            </Badge>
          )}
          {stats.uploading > 0 && (
            <Badge variant="outline" className="text-blue-600">
              {stats.uploading} 処理中
            </Badge>
          )}
          {stats.uploaded > 0 && (
            <Badge variant="default" className="text-green-600">
              {stats.uploaded} 完了
            </Badge>
          )}
          {stats.failed > 0 && <Badge variant="destructive">{stats.failed} エラー</Badge>}
        </div>

        {/* プログレスバー */}
        {isCreatingTasks && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>タスク作成中...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        <Separator />

        {/* アップロード領域 */}
        <div className="flex-1 min-h-0">
          {stats.total === 0 ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/20 hover:border-muted-foreground/40'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-muted/20 rounded-full flex items-center justify-center">
                  <LuImage className="w-8 h-8 text-muted-foreground/60" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">画像をドラッグ&ドロップ</h3>
                  <p className="text-sm text-muted-foreground">
                    JPG、PNG、WebP、GIF形式の画像ファイルに対応（最大{MAX_IMAGES}枚）
                  </p>
                </div>
                <Button onClick={handleFileSelect} className="mt-4">
                  <LuPlus className="mr-2 h-4 w-4" />
                  ファイルを選択
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="h-full"
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button onClick={handleFileSelect} size="sm" disabled={stats.total >= MAX_IMAGES}>
                    <LuPlus className="mr-2 h-4 w-4" />
                    画像を追加
                  </Button>
                  {stats.total > 0 && (
                    <Button onClick={clearAllImages} variant="outline" size="sm" disabled={isCreatingTasks}>
                      <LuTrash2 className="mr-2 h-4 w-4" />
                      全削除
                    </Button>
                  )}
                </div>
              </div>

              <ScrollArea className="h-80 border rounded-lg">
                <div className="grid grid-cols-4 gap-4 p-4">
                  {images.map((image) => (
                    <div key={image.id} className="relative group">
                      <div className="aspect-square border rounded-lg overflow-hidden bg-muted">
                        {isSpecialImageFile(image.file) ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-muted p-2">
                            <FileImage className="h-8 w-8 text-muted-foreground mb-2" />
                            <span className="text-xs font-medium text-center break-all">
                              {getFileDisplayName(image.file.name, 15)}
                            </span>
                          </div>
                        ) : (
                          <img src={image.preview} alt={image.file.name} className="w-full h-full object-cover" />
                        )}

                        {/* 状態オーバーレイ */}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {image.status === 'pending' && <LuFile className="h-6 w-6 text-white" />}
                          {image.status === 'uploading' && <LuLoader className="h-6 w-6 text-white animate-spin" />}
                          {image.status === 'uploaded' && <LuCheck className="h-6 w-6 text-green-400" />}
                          {image.status === 'failed' && <LuX className="h-6 w-6 text-red-400" />}
                        </div>

                        {/* 削除ボタン */}
                        <Button
                          onClick={() => {
                            removeImage(image.id);
                          }}
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={image.status === 'uploading'}
                        >
                          <LuX className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* ファイル名 */}
                      <p className="text-xs text-muted-foreground mt-1 truncate" title={image.file.name}>
                        {image.file.name}
                      </p>

                      {/* エラーメッセージ */}
                      {image.status === 'failed' && image.error && (
                        <p className="text-xs text-red-500 mt-1 truncate" title={image.error}>
                          {image.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {isDragOver && (
                <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <LuUpload className="w-12 h-12 mx-auto text-primary mb-2" />
                    <p className="text-lg font-medium text-primary">画像をドロップしてください</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {stats.total > 0 && (
              <p className="text-sm text-muted-foreground">{stats.total}枚の画像が選択されています</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isCreatingTasks || batchInitiateAiReview.isPending}
            >
              キャンセル
            </Button>

            {stats.pending > 0 && (
              <Button
                onClick={() => {
                  void createTasksFromImages();
                }}
                disabled={isCreatingTasks || stats.pending === 0}
                className="min-w-[120px]"
              >
                {isCreatingTasks ? (
                  <>
                    <LuLoader className="mr-2 h-4 w-4 animate-spin" />
                    タスク作成中...
                  </>
                ) : (
                  `タスクを作成 (${stats.pending})`
                )}
              </Button>
            )}

            {stats.uploadedTaskIds.length > 0 && (
              <Button
                onClick={startBatchProcess}
                disabled={isCreatingTasks || batchInitiateAiReview.isPending || stats.uploadedTaskIds.length === 0}
                className="min-w-[140px]"
              >
                {batchInitiateAiReview.isPending ? (
                  <>
                    <LuLoader className="mr-2 h-4 w-4 animate-spin" />
                    処理中...
                  </>
                ) : (
                  `バッチ処理開始 (${stats.uploadedTaskIds.length})`
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
