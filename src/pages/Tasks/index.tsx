import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { LuFolder, LuImage, LuInfo, LuLoader, LuUpload, LuVideo, LuX } from 'react-icons/lu';
import { Navigate, useParams } from 'react-router-dom';

import { fetchApi } from '@/api/client';
import { createTaskFromImage, createTaskFromVideo } from '@/api/tasks';
import { FilePreviewModal } from '@/components/FilePreviewModal';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useFilePreview } from '@/hooks/useFilePreview';
import { useFolderUpload } from '@/hooks/useFolderUpload';
import { TaskList } from '@/pages/Tasks/list/TaskList';
import type { UploadConfirmationResult } from '@/types/filePreview';
import { convertFolderGroupsToPreviewFiles } from '@/utils/filePreviewUtils';
import { type FolderGroup, parseFolderStructure } from '@/utils/folderUtils';

import { useTaskNavigation, useTasks } from './hooks/useTasks';

type Params = {
  projectId: string;
};

// 扩展File接口以包含webkitRelativePath属性
interface ExtendedFile extends Omit<File, 'webkitRelativePath'> {
  webkitRelativePath?: string;
}

// Helper function to process directory entries
async function processDirectoryEntries(entries: FileSystemEntry[], path: string, allFiles: File[]): Promise<void> {
  for (const entry of entries) {
    const files = await traverseFileTree(entry, path);
    allFiles.push(...files);
  }
}

// Helper function to read directory entries recursively
function readDirectoryEntries(
  dirReader: FileSystemDirectoryReader,
  allFiles: File[],
  path: string,
  resolve: (value: File[]) => void,
  reject: (reason: Error) => void,
): void {
  dirReader.readEntries((entries) => {
    if (entries.length === 0) {
      resolve(allFiles);
      return;
    }

    processDirectoryEntries(entries, path, allFiles)
      .then(() => {
        readDirectoryEntries(dirReader, allFiles, path, resolve, reject);
      })
      .catch((error) => {
        reject(new Error(error instanceof Error ? error.message : String(error)));
      });
  });
}

// Helper function to traverse file tree from DataTransferItem
async function traverseFileTree(item: FileSystemEntry, path: string = ''): Promise<File[]> {
  return new Promise((resolve, reject) => {
    if (item.isFile) {
      const fileEntry = item as FileSystemFileEntry;
      fileEntry.file((file: File) => {
        // Add the relative path to the file object using defineProperty
        const relativePath = path + file.name;

        // Create a new file with the same properties
        const fileWithPath = new File([file], file.name, {
          type: file.type,
          lastModified: file.lastModified,
        });

        // Define the webkitRelativePath property
        Object.defineProperty(fileWithPath, 'webkitRelativePath', {
          value: relativePath,
          writable: false,
          enumerable: true,
          configurable: true,
        });

        resolve([fileWithPath]);
      });
    } else if (item.isDirectory) {
      const dirEntry = item as FileSystemDirectoryEntry;
      const dirReader = dirEntry.createReader();
      const allFiles: File[] = [];
      const newPath = path + item.name + '/';

      readDirectoryEntries(dirReader, allFiles, newPath, resolve, reject);
    } else {
      resolve([]);
    }
  });
}

// Helper function to create mock FileList with proper webkitRelativePath
function createMockFileList(files: File[]): FileList {
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] || null,
    *[Symbol.iterator]() {
      for (const file of files) {
        yield file;
      }
    },
  } as Partial<FileList>;

  // Add files as indexed properties
  for (let i = 0; i < files.length; i++) {
    (fileList as Record<number, File>)[i] = files[i];
  }

  return fileList as FileList;
}

// Helper function to recreate FileList from FolderGroup for folder upload processing
function createFileListFromFolderGroups(folderGroups: FolderGroup[]): FileList {
  const files: File[] = [];

  for (const folder of folderGroups) {
    for (const mediaFile of folder.mediaFiles) {
      files.push(mediaFile.file);
    }
    for (const pptxFile of folder.pptxFiles) {
      files.push(pptxFile.file);
    }
    for (const docFile of folder.documentFiles) {
      files.push(docFile.file);
    }
  }

  return createMockFileList(files);
}

function TasksPage() {
  const { projectId } = useParams<Params>();
  const { userInfo } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const [isDocOrPptxUploading, setIsDocOrPptxUploading] = useState(false);

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  // Folder upload state - track folder structure for confirmed uploads
  const [pendingFolderGroups, setPendingFolderGroups] = useState<FolderGroup[] | null>(null);

  // File preview system
  const filePreview = useFilePreview({
    onConfirm: (result) => {
      void handleUploadConfirm(result);
    },
    autoOpenPreview: true,
  });

  // For navigation purposes, use the navigation hook instead of all tasks
  const { refetchNavigation } = useTaskNavigation({ projectId });

  // Get tasks data and related functions
  const { tasks, taskStatuses, getTaskStatus, refetchTasks } = useTasks({ projectId });

  // 新的文件夹上传功能
  const {
    processFolderUpload,
    isProcessing: isFolderProcessing,
    canProcess,
  } = useFolderUpload({
    projectId: projectId || '',
    onSuccess: () => {
      void refetchTasks();
      void refetchNavigation();
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
    },
  });

  const createTaskFromImageMutation = useMutation({
    mutationFn: (variables: { projectId: string; imageFile: File }) =>
      createTaskFromImage(variables.projectId, variables.imageFile),
    onSuccess: (data) => {
      toast({
        title: '成功',
        description: `タスク「${data.name}」が画像から正常に作成されました。`,
        variant: 'default',
      });
      void queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['task-navigation', projectId] });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: `タスクの作成に失敗しました。エラー：${error.message}`,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
  });

  const createTaskFromVideoMutation = useMutation({
    mutationFn: (variables: { projectId: string; videoFile: File }) =>
      createTaskFromVideo(variables.projectId, variables.videoFile),
    onSuccess: (data) => {
      toast({
        title: '成功',
        description: `タスク「${data.name}」が動画から正常に作成されました。`,
        variant: 'default',
      });
      void queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['task-navigation', projectId] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: `動画からのタスク作成に失敗しました。エラー：${error.message}`,
      });
    },
  });

  const handleFolderUploadButtonClick = () => {
    folderInputRef.current?.click();
  };

  const handleMultiFileUploadButtonClick = () => {
    multiFileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && projectId) {
      createTaskFromImageMutation.mutate({ projectId, imageFile: file });
    }
  };

  const handleFolderChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && projectId && canProcess) {
      // Parse folder structure and use unified preview system
      const folderGroups = parseFolderStructure(files);

      if (folderGroups.length === 0) {
        toast({
          title: 'エラー',
          description: 'フォルダ内に対応するファイルが見つかりませんでした。',
          variant: 'destructive',
        });
        return;
      }

      // Convert to preview files for unified preview
      const previewFiles = convertFolderGroupsToPreviewFiles(folderGroups);

      // Store original folder structure for later processing
      setPendingFolderGroups(folderGroups);

      // Add files to preview system
      filePreview.addFiles(previewFiles.map((f) => f.file));
    } else if (!canProcess) {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: 'データの読み込み中です。しばらくお待ちください。',
      });
    }
  };

  const handleMultiFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !projectId) {
      return;
    }

    const fileArray = Array.from(files);

    // 使用新的预览确认系统
    filePreview.addFiles(fileArray);

    // Reset input
    if (multiFileInputRef.current) {
      multiFileInputRef.current.value = '';
    }
  };

  const createTaskFromImageAsync = (file: File): Promise<boolean> =>
    new Promise((resolve) => {
      createTaskFromImageMutation.mutate(
        { projectId: projectId as string, imageFile: file },
        { onSuccess: () => resolve(true), onError: () => resolve(false) },
      );
    });

  const createTaskFromVideoAsync = (file: File): Promise<boolean> =>
    new Promise((resolve) => {
      createTaskFromVideoMutation.mutate(
        { projectId: projectId as string, videoFile: file },
        { onSuccess: () => resolve(true), onError: () => resolve(false) },
      );
    });

  const processMediaSequentially = async (
    images: File[],
    videos: File[],
  ): Promise<{ success: number; error: number }> => {
    const mediaFiles = [...images, ...videos];
    let success = 0;
    let error = 0;
    for (const currentFile of mediaFiles) {
      let ok = false;
      const isImage = currentFile.type.startsWith('image/');
      const isAI = currentFile.name.toLowerCase().endsWith('.ai');
      const isVideo = currentFile.type.startsWith('video/');

      if (isImage || isAI) {
        ok = await createTaskFromImageAsync(currentFile);
      } else if (isVideo) {
        ok = await createTaskFromVideoAsync(currentFile);
      }
      if (ok) {
        success++;
      } else {
        error++;
      }
    }
    return { success, error };
  };

  const uploadDocuments = async (documents: File[]): Promise<{ success: number; error: number }> => {
    if (documents.length === 0) {
      return { success: 0, error: 0 };
    }
    try {
      setIsDocOrPptxUploading(true);
      const formData = new FormData();
      formData.append('project_id', projectId as string);
      documents.forEach((file) => formData.append('files', file));
      const response = await fetchApi({
        url: '/api/v1/tasks/upload-document',
        method: 'post',
        headers: { 'Content-Type': 'multipart/form-data' },
        data: formData,
      });
      const data = response.data as { message: string; results: Array<{ success: boolean; filename: string }> };
      const success = data.results.filter((r) => r.success).length;
      const error = data.results.length - success;
      void queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['task-navigation', projectId] });
      return { success, error };
    } catch (err) {
      console.error('Document upload failed:', err);
      return { success: 0, error: documents.length };
    } finally {
      setIsDocOrPptxUploading(false);
    }
  };

  // Poll upload status for PPTX until processing completes, to ensure task info is ready
  type UploadStatus = {
    batch_id: string;
    total_files: number;
    processed_files: number;
    successful_files: number;
    failed_files: number;
    files_status: Record<string, { status?: string; error?: string }>;
  };

  const waitForPptxProcessingComplete = async (batchId: string): Promise<UploadStatus> => {
    const POLL_INTERVAL_MS = 2000;
    let done = false;
    let lastStatus: UploadStatus | null = null;
    while (!done) {
      const resp = await fetchApi({
        url: `/api/v1/tasks/upload-status/${batchId}` as '/api/v1/tasks/upload-status/{batch_id}',
        method: 'get',
      });
      const status = resp.data as UploadStatus;
      lastStatus = status;
      if (status.processed_files >= status.total_files) {
        done = true;
      } else {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    }
    return lastStatus as UploadStatus;
  };

  const uploadPptx = async (pptxs: File[]): Promise<{ success: number; error: number }> => {
    if (pptxs.length === 0) {
      return { success: 0, error: 0 };
    }
    try {
      setIsDocOrPptxUploading(true);
      const formData = new FormData();
      formData.append('project_id', projectId as string);
      pptxs.forEach((file) => formData.append('files', file));
      const resp = await fetchApi({
        url: '/api/v1/tasks/upload-pptx',
        method: 'post',
        headers: { 'Content-Type': 'multipart/form-data' },
        data: formData,
      });
      const batchId = (resp.data as { batch_id: string }).batch_id;
      const finalStatus = await waitForPptxProcessingComplete(batchId);
      const success = finalStatus.successful_files;
      const error = finalStatus.failed_files;
      void queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['task-navigation', projectId] });
      return { success, error };
    } catch (err) {
      console.error('PPTX upload failed:', err);
      return { success: 0, error: pptxs.length };
    } finally {
      setIsDocOrPptxUploading(false);
    }
  };

  // Handle confirmed upload from preview modal
  async function handleUploadConfirm(result: UploadConfirmationResult) {
    const { confirmedFiles } = result;

    // Check if this is a folder upload by looking for folder information
    const hasFolderInfo = confirmedFiles.some((f) => f.folderPath);

    if (hasFolderInfo && pendingFolderGroups && canProcess) {
      // Folder upload: use the specialized folder upload logic
      toast({
        title: 'フォルダアップロード開始',
        description: `${confirmedFiles.length}個のファイルを処理中...`,
      });

      try {
        // Create FileList from the original folder structure
        const fileList = createFileListFromFolderGroups(pendingFolderGroups);

        processFolderUpload({
          files: fileList,
          onProgress: (status) => {
            console.log('Folder upload progress:', status);
          },
        });

        // Clear pending folder data
        setPendingFolderGroups(null);
      } catch (error) {
        console.error('Folder upload failed:', error);
        toast({
          title: 'フォルダアップロードエラー',
          description: 'フォルダのアップロードに失敗しました。',
          variant: 'destructive',
        });
        setPendingFolderGroups(null);
      }
    } else {
      // Single file upload: use existing logic
      const imageFiles = confirmedFiles.filter((f) => f.type === 'image').map((f) => f.file);
      const videoFiles = confirmedFiles.filter((f) => f.type === 'video').map((f) => f.file);
      const pptxFiles = confirmedFiles.filter((f) => f.type === 'pptx').map((f) => f.file);
      const documentFiles = confirmedFiles.filter((f) => f.type === 'document').map((f) => f.file);

      const totalCount = imageFiles.length + videoFiles.length + pptxFiles.length + documentFiles.length;

      if (totalCount === 0) {
        return;
      }

      toast({
        title: 'アップロード開始',
        description: `${totalCount}個のファイルからタスクを作成中...`,
      });

      // Execute uploads using existing logic
      try {
        const [mediaRes, docRes, pptxRes] = await Promise.all([
          processMediaSequentially(imageFiles, videoFiles),
          uploadDocuments(documentFiles),
          uploadPptx(pptxFiles),
        ]);

        const successCount = mediaRes.success + docRes.success + pptxRes.success;
        const errorCount = mediaRes.error + docRes.error + pptxRes.error;

        // Immediately refresh task lists after upload completion
        await Promise.all([refetchTasks(), refetchNavigation()]);

        toast({
          title: 'アップロード完了',
          description: `成功: ${successCount}件, エラー: ${errorCount}件`,
          variant: errorCount > 0 ? 'destructive' : 'default',
        });
      } catch (error) {
        console.error('Upload failed:', error);
        toast({
          title: 'アップロードエラー',
          description: 'ファイルのアップロードに失敗しました。',
          variant: 'destructive',
        });
      }
    }
  }

  // ESC key handler to cancel drag
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDragOver) {
        setIsDragOver(false);
        setDragCounter(0);
      }
    };

    if (isDragOver) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isDragOver]);

  // Cancel drag handler
  const handleCancelDrag = () => {
    setIsDragOver(false);
    setDragCounter(0);
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev - 1);
    if (dragCounter === 1) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Helper function to process directory items from drag and drop
  const processDirectoryItems = async (items: DataTransferItem[]): Promise<File[]> => {
    const allFiles: File[] = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          const files = await traverseFileTree(entry);
          allFiles.push(...files);
        }
      }
    }

    return allFiles;
  };

  // Helper function to handle folder processing
  const handleFolderProcessing = (folderGroups: FolderGroup[]) => {
    if (folderGroups.length === 0) {
      toast({
        title: 'エラー',
        description: 'フォルダ内に対応するファイルが見つかりませんでした。',
        variant: 'destructive',
      });
      return;
    }

    const previewFiles = convertFolderGroupsToPreviewFiles(folderGroups);
    setPendingFolderGroups(folderGroups);
    filePreview.addFiles(previewFiles.map((f) => f.file));
  };

  // Helper function to handle directory drops
  const handleDirectoryDrop = async (items: DataTransferItem[]) => {
    try {
      const allFiles = await processDirectoryItems(items);

      if (allFiles.length === 0) {
        toast({
          title: 'エラー',
          description: 'フォルダ内に対応するファイルが見つかりませんでした。',
          variant: 'destructive',
        });
        return;
      }

      if (canProcess) {
        const mockFileList = createMockFileList(allFiles);
        const folderGroups = parseFolderStructure(mockFileList);
        handleFolderProcessing(folderGroups);
      }
    } catch (error) {
      console.error('Error processing folder drop:', error);
      toast({
        title: 'エラー',
        description: 'フォルダの処理中にエラーが発生しました。',
        variant: 'destructive',
      });
    }
  };

  // Helper function to handle regular file drops
  const handleRegularFileDrop = (files: File[]) => {
    const hasRelativePath = files.some((file) => (file as ExtendedFile).webkitRelativePath);

    if (hasRelativePath && canProcess) {
      const folderGroups = parseFolderStructure(files as unknown as FileList);
      handleFolderProcessing(folderGroups);
    } else {
      filePreview.addFiles(files);
      setPendingFolderGroups(null);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    if (!projectId) {
      return;
    }

    const items = Array.from(e.dataTransfer.items);
    const hasDirectoryItems = items.some((item) => {
      const entry = item.webkitGetAsEntry?.();
      return entry?.isDirectory;
    });

    if (hasDirectoryItems) {
      await handleDirectoryDrop(items);
    } else {
      const files = Array.from(e.dataTransfer.files);
      handleRegularFileDrop(files);
    }
  };

  const kanbanCols = useMemo(
    () =>
      taskStatuses?.map((status) => ({
        id: status.id,
        title: getTaskStatus(status.id),
      })),
    [getTaskStatus, taskStatuses],
  );

  if (!userInfo) {
    return <Navigate to="/account" />;
  }

  if (!projectId || !kanbanCols || !tasks) {
    return (
      <div className="container px-4 py-6 mx-auto">
        <div className="flex items-center justify-center h-40">
          <div className="animate-pulse space-y-3 w-full max-w-md">
            <div className="h-6 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isLoading =
    createTaskFromImageMutation.isPending ||
    createTaskFromVideoMutation.isPending ||
    isFolderProcessing ||
    isDocOrPptxUploading;

  return (
    <div
      className={`container px-4 py-6 mx-auto max-w-full transition-all duration-200 ${
        isDragOver ? 'bg-muted/30 border-2 border-dashed border-primary/50 rounded-lg' : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={(e) => {
        void handleDrop(e);
      }}
    >
      {/* Header with Project Info and Actions */}
      <div className="mb-6 bg-gradient-to-br from-background via-background to-muted/20 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            {/* Project Info */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="p-2.5 bg-primary/10 rounded-lg">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">タスク一覧</h1>
                <p className="text-sm text-muted-foreground mt-0.5">プロジェクトのすべてのタスクを管理</p>
              </div>
            </div>

            {/* Actions Section */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* Drag and Drop Hint - Now also clickable for file upload */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleMultiFileUploadButtonClick}
                      disabled={isLoading}
                      className="group relative flex items-center justify-center py-2.5 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="p-1 bg-blue-100 dark:bg-blue-900/50 rounded">
                          <LuUpload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-blue-900 dark:text-blue-100">ドラッグ&ドロップ対応</span>
                        <LuInfo className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs border-blue-200 dark:border-blue-800">
                    <div className="space-y-3 p-1">
                      <p className="font-semibold text-sm">対応ファイル形式</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-green-100 dark:bg-green-900/50 rounded">
                            <LuImage className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          </div>
                          <span>全ての画像形式</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-purple-100 dark:bg-purple-900/50 rounded">
                            <LuVideo className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span>全てのビデオ形式</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-orange-100 dark:bg-orange-900/50 rounded">
                            <span className="text-xs">📑</span>
                          </div>
                          <span>PPTX, DOC, DOCX</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-cyan-100 dark:bg-cyan-900/50 rounded">
                            <span className="text-xs">📊</span>
                          </div>
                          <span>XLS, XLSX, CSV</span>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Upload Button */}
              <Button
                variant="default"
                size="default"
                onClick={handleFolderUploadButtonClick}
                disabled={isLoading || !canProcess}
                className="relative group overflow-hidden bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm"
              >
                <span className="relative flex items-center gap-2">
                  {isLoading ? (
                    <LuLoader className="w-4 h-4 animate-spin" />
                  ) : (
                    <LuFolder className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="font-medium">フォルダアップロード</span>
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Drag and Drop Overlay */}
      {isDragOver && (
        <div
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center"
          onClick={handleCancelDrag}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div
            className="max-w-lg w-full mx-4 p-8 bg-card border rounded-lg shadow-lg relative"
            onClick={(e) => e.stopPropagation()}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              void handleDrop(e);
            }}
          >
            {/* Cancel button */}
            <button
              onClick={handleCancelDrag}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="キャンセル"
            >
              <LuX className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <LuUpload className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">ファイルをここにドロップ</h3>
                <p className="text-sm text-muted-foreground">タスクが自動的に作成されます</p>
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2">対応ファイル形式:</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <LuImage className="w-3 h-3" />
                    <span>全ての画像形式</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <LuVideo className="w-3 h-3" />
                    <span>全てのビデオ形式</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">📑</span>
                    <span>PPTX, DOC, DOCX</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">📊</span>
                    <span>XLS, XLSX, CSV, TXT</span>
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">ESCキーまたは外側をクリックしてキャンセル</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,.ai"
        style={{ display: 'none' }}
        disabled={isLoading}
      />

      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderChange}
        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
        multiple
        style={{ display: 'none' }}
        disabled={isLoading || !canProcess}
      />

      <input
        type="file"
        ref={multiFileInputRef}
        onChange={handleMultiFileChange}
        accept="image/*,video/*,.pptx,.doc,.docx,.xls,.xlsx,.csv,.txt,.ai"
        multiple
        style={{ display: 'none' }}
        disabled={isLoading}
      />

      {/* Task List */}
      <TaskList projectId={projectId} />

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={filePreview.isPreviewModalOpen}
        onClose={filePreview.closePreviewModal}
        files={filePreview.previewFiles}
        onConfirm={filePreview.handleConfirmUpload}
        onRemoveFile={filePreview.removeFile}
        title="タスクファイルアップロード確認"
      />
    </div>
  );
}

export default TasksPage;
