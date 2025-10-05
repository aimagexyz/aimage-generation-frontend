import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { fetchApi } from '@/api/client';
import type { components } from '@/api/schemas';
import { createSubtaskWithImage, createSubtaskWithVideo, createTask } from '@/api/tasks';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTaskMetadata } from '@/pages/Tasks/hooks/useTasks';
import {
  type FolderGroup,
  generateSubtaskName,
  generateTaskName,
  isImageFile,
  isVideoFile,
  type MediaFile,
  parseFolderStructure,
} from '@/utils/folderUtils';

interface UseFolderUploadProps {
  projectId: string;
  onSuccess?: () => void;
}

interface ProcessingStatus {
  currentFolder: string;
  currentFile: string;
  totalFolders: number;
  completedFolders: number;
  totalFiles: number;
  completedFiles: number;
  errors: string[];
}

export const useFolderUpload = ({ projectId, onSuccess }: UseFolderUploadProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { userInfo } = useAuth();
  const { taskStatuses, taskPriorities } = useTaskMetadata();

  // 获取默认的任务状态和优先级
  const getDefaultTaskData = (taskName: string): components['schemas']['TaskIn'] => {
    // 使用第一个状态作为默认状态（通常是"待处理"或类似状态）
    const defaultStatus = taskStatuses?.[0];
    // 使用第一个优先级作为默认优先级（通常是"低"或"中"）
    const defaultPriority = taskPriorities?.[0];

    if (!defaultStatus || !defaultPriority || !userInfo) {
      throw new Error('必要なデータが不足しています。ステータス、優先度、またはユーザー情報が見つかりません。');
    }

    return {
      tid: uuidv4().slice(0, 8), // 生成短的TID
      name: taskName,
      description: 'フォルダアップロードから自動作成されたタスク',
      assignee_id: userInfo.id, // 设置当前用户为负责人
      priority_id: defaultPriority.id,
      project_id: projectId,
      status_id: defaultStatus.id,
    };
  };

  // 处理PPTX文件的函数
  const processPptxFiles = async (files: MediaFile[]): Promise<{ success: number; errors: string[] }> => {
    if (files.length === 0) {
      return { success: 0, errors: [] };
    }

    try {
      const formData = new FormData();
      formData.append('project_id', projectId);

      // 添加所有PPTX文件
      files.forEach((fileItem) => {
        formData.append('files', fileItem.file);
      });

      await fetchApi({
        url: '/api/v1/tasks/upload-pptx',
        method: 'post',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        data: formData,
      });

      // PPTX处理是异步的，这里只返回上传成功状态
      return { success: files.length, errors: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      return { success: 0, errors: files.map((file) => `${file.fileName}: ${errorMessage}`) };
    }
  };

  // 处理文档文件的函数
  const processDocumentFiles = async (files: MediaFile[]): Promise<{ success: number; errors: string[] }> => {
    if (files.length === 0) {
      return { success: 0, errors: [] };
    }

    try {
      const formData = new FormData();
      formData.append('project_id', projectId);

      // 添加所有文档文件
      files.forEach((fileItem) => {
        formData.append('files', fileItem.file);
      });

      const response = await fetchApi({
        url: '/api/v1/tasks/upload-document',
        method: 'post',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        data: formData,
      });

      // 处理响应结果
      const data = response.data as {
        message: string;
        results: Array<{ success: boolean; filename: string; message: string }>;
      };
      const successCount = data.results.filter((r) => r.success).length;
      const errors = data.results.filter((r) => !r.success).map((r) => `${r.filename}: ${r.message}`);

      return { success: successCount, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      return { success: 0, errors: files.map((file) => `${file.fileName}: ${errorMessage}`) };
    }
  };

  // 处理媒体文件的辅助函数
  const processMediaFiles = async (
    folderGroup: FolderGroup,
    onProgress: (status: ProcessingStatus) => void,
    progressData: {
      totalFolders: number;
      completedFolders: number;
      totalFiles: number;
      completedFiles: number;
      errors: string[];
    },
  ) => {
    if (folderGroup.mediaFiles.length === 0) {
      return null;
    }

    const taskName = generateTaskName(`${folderGroup.folderName} - メディア`);
    const taskData = getDefaultTaskData(taskName);
    const createdTask = await createTask(projectId, taskData);

    if (!createdTask.id) {
      throw new Error('メディアタスクの作成に失敗しました');
    }

    let subtaskErrors = 0;

    // 为每个媒体文件创建Subtask
    for (const mediaFile of folderGroup.mediaFiles) {
      try {
        onProgress({
          currentFolder: folderGroup.folderName,
          currentFile: mediaFile.fileName,
          ...progressData,
        });

        const subtaskName = generateSubtaskName(mediaFile.fileName);

        if (isImageFile(mediaFile.file)) {
          await createSubtaskWithImage(createdTask.id, subtaskName, mediaFile.file);
        } else if (isVideoFile(mediaFile.file)) {
          await createSubtaskWithVideo(createdTask.id, subtaskName, mediaFile.file);
        }

        progressData.completedFiles++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        progressData.errors.push(`${mediaFile.fileName}: ${errorMessage}`);
        subtaskErrors++;
        progressData.completedFiles++;
      }
    }

    return {
      type: 'media' as const,
      taskId: createdTask.id,
      taskName: createdTask.name,
      success: folderGroup.mediaFiles.length - subtaskErrors,
      total: folderGroup.mediaFiles.length,
      errors: [] as string[],
    };
  };

  // 处理非媒体文件的辅助函数（PPTX和文档）
  const processNonMediaFiles = async (
    files: MediaFile[],
    fileType: 'pptx' | 'document',
    processFunction: (files: MediaFile[]) => Promise<{ success: number; errors: string[] }>,
    progressData: {
      totalFolders: number;
      completedFolders: number;
      totalFiles: number;
      completedFiles: number;
      errors: string[];
    },
  ) => {
    if (files.length === 0) {
      return null;
    }

    try {
      const result = await processFunction(files);
      progressData.completedFiles += files.length;
      progressData.errors.push(...result.errors);

      return {
        type: fileType,
        success: result.success,
        total: files.length,
        errors: result.errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      const errorType = fileType === 'pptx' ? 'PPTX処理エラー' : '文書処理エラー';
      progressData.completedFiles += files.length;

      return {
        type: fileType,
        success: 0,
        total: files.length,
        errors: [`${errorType}: ${errorMessage}`],
      };
    }
  };

  // 处理单个文件夹的函数
  const processFolderGroup = async (
    folderGroup: FolderGroup,
    onProgress: (status: ProcessingStatus) => void,
    progressData: {
      totalFolders: number;
      completedFolders: number;
      totalFiles: number;
      completedFiles: number;
      errors: string[];
    },
  ) => {
    onProgress({
      currentFolder: folderGroup.folderName,
      currentFile: '',
      ...progressData,
    });

    const results: Array<{
      type: 'media' | 'pptx' | 'document';
      taskId?: string;
      taskName?: string;
      success: number;
      total: number;
      errors: string[];
    }> = [];

    // 处理媒体文件（图片和视频）
    if (folderGroup.mediaFiles.length > 0) {
      try {
        const mediaResult = await processMediaFiles(folderGroup, onProgress, progressData);
        if (mediaResult) {
          results.push(mediaResult);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        results.push({
          type: 'media',
          success: 0,
          total: folderGroup.mediaFiles.length,
          errors: [`メディアタスク作成エラー: ${errorMessage}`],
        });
        progressData.completedFiles += folderGroup.mediaFiles.length;
      }
    }

    // 处理PPTX文件
    const pptxResult = await processNonMediaFiles(folderGroup.pptxFiles, 'pptx', processPptxFiles, progressData);
    if (pptxResult) {
      results.push(pptxResult);
    }

    // 处理文档文件
    const docResult = await processNonMediaFiles(
      folderGroup.documentFiles,
      'document',
      processDocumentFiles,
      progressData,
    );
    if (docResult) {
      results.push(docResult);
    }

    const totalFiles = folderGroup.mediaFiles.length + folderGroup.pptxFiles.length + folderGroup.documentFiles.length;
    const totalSuccess = results.reduce((sum, result) => sum + result.success, 0);

    return {
      folderName: folderGroup.folderName,
      totalFiles,
      successCount: totalSuccess,
      results,
    };
  };

  const processFolderUploadMutation = useMutation({
    mutationFn: async ({ files, onProgress }: { files: FileList; onProgress?: (status: ProcessingStatus) => void }) => {
      // 检查必要的数据是否已加载
      if (!taskStatuses || !taskPriorities || !userInfo) {
        throw new Error('データの読み込み中です。しばらくお待ちください。');
      }

      // 解析文件夹结构
      const folderGroups = parseFolderStructure(files);

      if (folderGroups.length === 0) {
        throw new Error('フォルダ内に対応するファイルが見つかりませんでした。');
      }

      const totalFiles = folderGroups.reduce(
        (acc, group) => acc + group.mediaFiles.length + group.pptxFiles.length + group.documentFiles.length,
        0,
      );
      const progressData = {
        totalFolders: folderGroups.length,
        completedFolders: 0,
        totalFiles,
        completedFiles: 0,
        errors: [] as string[],
      };

      const results = [];

      // 逐个处理每个文件夹
      for (const folderGroup of folderGroups) {
        try {
          const result = await processFolderGroup(
            folderGroup,
            onProgress ||
              (() => {
                /* no-op */
              }),
            progressData,
          );
          results.push(result);
          progressData.completedFolders++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '不明なエラー';
          progressData.errors.push(`フォルダ "${folderGroup.folderName}": ${errorMessage}`);
          progressData.completedFolders++;
          // 跳过这个文件夹的文件计数
          progressData.completedFiles +=
            folderGroup.mediaFiles.length + folderGroup.pptxFiles.length + folderGroup.documentFiles.length;
        }
      }

      return {
        results,
        totalFiles: progressData.totalFiles,
        errors: progressData.errors,
      };
    },
    onSuccess: (data) => {
      const { results, totalFiles, errors } = data;

      // 刷新查询缓存
      void queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['task-navigation', projectId] });

      // 显示结果
      const successCount = results.length;
      const errorCount = errors.length;

      toast({
        title: 'フォルダアップロード完了',
        description: `${successCount}個のタスクが作成されました（${totalFiles}個のファイル処理）`,
        variant: errorCount > 0 ? 'destructive' : 'default',
      });

      if (errorCount > 0) {
        console.error('フォルダアップロードエラー:', errors);
      }

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: `フォルダアップロードに失敗しました：${error.message}`,
      });
    },
  });

  // 检查是否可以开始处理
  const canProcess = !!(taskStatuses && taskPriorities && userInfo);

  return {
    processFolderUpload: processFolderUploadMutation.mutate,
    isProcessing: processFolderUploadMutation.isPending,
    error: processFolderUploadMutation.error,
    canProcess, // 新增：指示是否可以开始处理
  };
};
