import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { LuCheck, LuFile, LuLoader, LuPlus, LuUpload, LuX } from 'react-icons/lu';

import { fetchApi } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Progress } from '@/components/ui/Progress';
import { useToast } from '@/components/ui/use-toast';

// PPTX的MIME类型
const PPTX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
// 文件大小限制（500MB）
const MAX_FILE_SIZE = 500 * 1024 * 1024;
// 轮询间隔（毫秒）
const POLLING_INTERVAL = 2000;

type Props = {
  projectId: string;
  trigger: React.ReactNode;
  onSuccess?: () => void;
};

// 文件状态类型
type FileStatus = 'pending' | 'uploading' | 'processing' | 'success' | 'error';

// 文件项类型
type FileItem = {
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
  batchId?: string;
};

// 文件处理状态类型
interface FileProcessingStatus {
  batch_id: string;
  total_files: number;
  processed_files: number;
  successful_files: number;
  failed_files: number;
  files_status: Record<string, { status?: string; error?: string }>;
}

export function UploadPptxDialog({ projectId, trigger, onSuccess }: Props) {
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [isProcessingCompleted, setIsProcessingCompleted] = useState(false);
  // 添加一个ref来跟踪对话框是否已经打开过
  const dialogOpenedRef = useRef(false);

  // 获取文件状态图标
  const getStatusIcon = (status: FileStatus) => {
    switch (status) {
      case 'pending':
        return null;
      case 'uploading':
        return <LuLoader className="animate-spin text-primary" />;
      case 'processing':
        return <LuLoader className="animate-spin text-blue-500" />;
      case 'success':
        return <LuCheck className="text-green-500" />;
      case 'error':
        return <LuX className="text-red-500" />;
    }
  };

  // 更新文件上传进度的函数
  const updateFilesProgress = (progress: number) => {
    setSelectedFiles((prev) =>
      prev.map((item) => {
        if (item.status === 'pending' || item.status === 'uploading') {
          return {
            ...item,
            progress,
            status: progress === 100 ? 'processing' : 'uploading',
          };
        }
        return item;
      }),
    );
  };

  // 上传PPTX文件的mutation
  const { mutate: uploadPptx, isPending: isUploading } = useMutation({
    mutationFn: async (files: File[]) => {
      setUploadProgress(0);
      const formData = new FormData();
      formData.append('project_id', projectId);

      // 添加多个文件
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetchApi({
        url: '/api/v1/tasks/upload-pptx',
        method: 'post',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        data: formData,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
            updateFilesProgress(progress);
          }
        },
      });

      return response.data as { batch_id: string };
    },
    onSuccess: (data) => {
      // 设置批次ID，用于后续查询处理状态
      const newBatchId = data.batch_id;
      setCurrentBatchId(newBatchId);
      setBatchIds((prev) => [...prev, newBatchId]);

      // 更新文件的批次ID
      setSelectedFiles((prev) =>
        prev.map((item) => {
          if (item.status === 'processing' && !item.batchId) {
            return {
              ...item,
              batchId: newBatchId,
            };
          }
          return item;
        }),
      );

      toast({
        title: 'PPTXファイルをアップロードしました',
        description: '処理が開始されました',
      });
    },
    onError: (error) => {
      setUploadProgress(0);
      console.error('Failed to upload PPTX:', error);

      // 将所有待上传的文件状态设置为错误
      setSelectedFiles((prev) =>
        prev.map((item) => {
          if (item.status === 'uploading' || item.status === 'processing') {
            return {
              ...item,
              status: 'error',
              error: '上传失败',
            };
          }
          return item;
        }),
      );

      toast({
        title: 'アップロードに失敗しました',
        description: 'エラーが発生しました。もう一度お試しください。',
        variant: 'destructive',
      });
    },
  });

  // 查询处理状态
  const { data: processingStatus } = useQuery<FileProcessingStatus>({
    queryKey: ['upload-status', currentBatchId],
    queryFn: async () => {
      if (!currentBatchId) {
        throw new Error('No batch ID');
      }

      const response = await fetchApi({
        url: `/api/v1/tasks/upload-status/${currentBatchId}` as '/api/v1/tasks/upload-status/{batch_id}',
        method: 'get',
      });
      return response.data as FileProcessingStatus;
    },
    enabled: !!currentBatchId && !isProcessingCompleted,
    refetchInterval: currentBatchId && !isProcessingCompleted ? POLLING_INTERVAL : false,
  });

  // 当处理状态更新时，更新文件状态
  useEffect(() => {
    if (processingStatus && selectedFiles.length > 0 && !isProcessingCompleted) {
      setSelectedFiles((prev) =>
        prev.map((item) => {
          // 只更新当前批次的文件
          if (item.batchId === processingStatus.batch_id) {
            const fileName = item.file.name;
            const fileStatus = processingStatus.files_status[fileName];

            if (fileStatus) {
              if (fileStatus.status === 'success') {
                return { ...item, status: 'success' };
              } else if (fileStatus.status === 'error') {
                return {
                  ...item,
                  status: 'error',
                  error: fileStatus.error || '处理失败',
                };
              }
            }
          }
          return item;
        }),
      );

      // 如果所有文件都处理完成，调用onSuccess回调
      if (processingStatus.processed_files === processingStatus.total_files) {
        // 直接使用API返回的处理状态，不依赖本地状态
        if (!isProcessingCompleted) {
          // 设置处理完成状态，避免重复执行
          setIsProcessingCompleted(true);

          // 直接使用API返回的成功和失败文件数量
          const successCount = processingStatus.successful_files;
          const errorCount = processingStatus.failed_files;

          // 显示处理完成的提示
          toast({
            title: 'ファイル処理が完了しました',
            description: `${successCount}個のファイルが正常に処理され、${errorCount}個のファイルが失敗しました`,
            variant: 'default',
          });

          // 延迟关闭对话框，给用户一些时间看到处理结果
          setTimeout(() => {
            setIsDialogOpen(false);
          }, 2000);

          // 调用onSuccess回调
          if (onSuccess) {
            onSuccess();
          }
        }
      }
    }
  }, [processingStatus, selectedFiles, batchIds, onSuccess, toast, isProcessingCompleted]);

  // 监听对话框打开状态
  useEffect(() => {
    if (isDialogOpen) {
      // 对话框每次打开时，重置状态
      setSelectedFiles([]);
      setUploadProgress(0);
      setCurrentBatchId(null);
      setBatchIds([]);
      setIsProcessingCompleted(false);
      dialogOpenedRef.current = true;
    } else {
      // 对话框关闭时，重置ref
      dialogOpenedRef.current = false;
    }
  }, [isDialogOpen]);

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const fileItems: FileItem[] = [];
    let hasInvalidFile = false;

    Array.from(files).forEach((file) => {
      // 检查文件类型
      if (file.type !== PPTX_MIME_TYPE) {
        toast({
          title: '無効なファイル形式',
          description: 'PPTXファイルのみがサポートされています',
          variant: 'destructive',
        });
        hasInvalidFile = true;
        return;
      }

      // 检查文件大小
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'ファイルサイズが大きすぎます',
          description: `最大ファイルサイズは${formatFileSize(MAX_FILE_SIZE)}です`,
          variant: 'destructive',
        });
        hasInvalidFile = true;
        return;
      }

      fileItems.push({
        file,
        status: 'pending',
        progress: 0,
      });
    });

    if (!hasInvalidFile && fileItems.length > 0) {
      setSelectedFiles((prev) => [...prev, ...fileItems]);
    }

    // 重置input，以便可以再次选择相同的文件
    event.target.value = '';
  };

  // 处理拖放
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const files = event.dataTransfer.files;
    if (!files || files.length === 0) {
      return;
    }

    const fileItems: FileItem[] = [];
    let hasInvalidFile = false;

    Array.from(files).forEach((file) => {
      // 检查文件类型
      if (file.type !== PPTX_MIME_TYPE) {
        toast({
          title: '無効なファイル形式',
          description: 'PPTXファイルのみがサポートされています',
          variant: 'destructive',
        });
        hasInvalidFile = true;
        return;
      }

      // 检查文件大小
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'ファイルサイズが大きすぎます',
          description: `最大ファイルサイズは${formatFileSize(MAX_FILE_SIZE)}です`,
          variant: 'destructive',
        });
        hasInvalidFile = true;
        return;
      }

      fileItems.push({
        file,
        status: 'pending',
        progress: 0,
      });
    });

    if (!hasInvalidFile && fileItems.length > 0) {
      setSelectedFiles((prev) => [...prev, ...fileItems]);
    }
  };

  // 处理拖拽进入
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  // 移除文件
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // 开始上传
  const startUpload = () => {
    // 获取所有待上传的文件
    const pendingFiles = selectedFiles.filter((item) => item.status === 'pending').map((item) => item.file);

    if (pendingFiles.length === 0) {
      return;
    }

    uploadPptx(pendingFiles);
  };

  // 添加更多文件
  const addMoreFiles = () => {
    document.getElementById('file-upload')?.click();
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {
      return '0 B';
    }

    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  // 关闭对话框时重置状态
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // 完全重置所有状态
      setSelectedFiles([]);
      setUploadProgress(0);
      setCurrentBatchId(null);
      setBatchIds([]);
      setIsProcessingCompleted(false);
    }
  };

  // 检查是否有待上传的文件
  const hasPendingFiles = selectedFiles.some((file) => file.status === 'pending');

  // 添加一个变量来检查是否有文件正在处理中
  const hasProcessingFiles = selectedFiles.some((file) => file.status === 'processing');

  // 合并处理中和上传中的状态，用于禁用按钮
  const isProcessingOrUploading = isUploading || hasProcessingFiles;

  // 添加一个文件名截断辅助函数
  const truncateFileName = (fileName: string, maxLength: number = 25): string => {
    if (fileName.length <= maxLength) {
      return fileName;
    }

    const extension = fileName.split('.').pop() || '';
    const nameWithoutExtension = fileName.substring(0, fileName.length - extension.length - 1);

    // 保留文件名开头和扩展名，中间用省略号替代
    const truncatedName = nameWithoutExtension.substring(0, maxLength - extension.length - 4) + '...';
    return `${truncatedName}.${extension}`;
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>PPTXファイルをアップロード</DialogTitle>
        </DialogHeader>

        <input id="file-upload" type="file" accept=".pptx" multiple className="hidden" onChange={handleFileSelect} />

        <div className="space-y-4">
          {selectedFiles.length === 0 ? (
            <div
              className={`border-2 border-dashed rounded-md p-6 text-center ${
                isProcessingOrUploading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer hover:bg-muted/50 transition-colors'
              }`}
              onClick={() => {
                if (!isProcessingOrUploading) {
                  document.getElementById('file-upload')?.click();
                }
              }}
              onDrop={(e) => {
                if (!isProcessingOrUploading) {
                  handleDrop(e);
                }
              }}
              onDragOver={handleDragOver}
            >
              <LuUpload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">
                {isProcessingOrUploading ? 'ファイル処理中...' : 'クリックまたはドラッグ＆ドロップでファイルを選択'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">PPTXファイルのみ</p>
              <p className="text-xs text-muted-foreground mt-3">最大ファイルサイズ: {formatFileSize(MAX_FILE_SIZE)}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 文件列表 */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedFiles.map((fileItem, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 border rounded-md">
                    <LuFile className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <p
                          className="text-sm font-medium truncate mr-2 max-w-[calc(100%-40px)]"
                          title={fileItem.file.name}
                        >
                          {truncateFileName(fileItem.file.name)}
                        </p>
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                          {getStatusIcon(fileItem.status)}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(fileItem.file.size)}
                        {fileItem.error && <span className="text-red-500 ml-2">{fileItem.error}</span>}
                      </p>
                    </div>
                    {!isProcessingOrUploading && fileItem.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <LuX className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* 总体进度 */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>アップロード進捗</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* 处理进度 */}
              {currentBatchId && processingStatus && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>処理進捗</span>
                    <span>
                      {processingStatus.processed_files}/{processingStatus.total_files} ファイル
                    </span>
                  </div>
                  <Progress
                    value={
                      processingStatus.total_files > 0
                        ? (processingStatus.processed_files / processingStatus.total_files) * 100
                        : 0
                    }
                    className="h-2"
                  />
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addMoreFiles}
                  disabled={isProcessingOrUploading}
                  className="flex items-center gap-1"
                >
                  <LuPlus className="h-4 w-4" /> ファイルを追加
                </Button>

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setSelectedFiles([])} disabled={isProcessingOrUploading}>
                    クリア
                  </Button>
                  {hasPendingFiles && (
                    <Button onClick={startUpload} disabled={isProcessingOrUploading || !hasPendingFiles}>
                      {isUploading ? 'アップロード中...' : 'アップロード'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
