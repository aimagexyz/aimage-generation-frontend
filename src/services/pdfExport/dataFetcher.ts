import { fetchApi } from '@/api/client';

import type { AnnotationDetail, PDFExportOptions, PDFTaskData, SubtaskDetail } from './types';
import { VideoFrameService } from './videoFrameService';

/**
 * 数据获取服务 - 复用现有API调用逻辑 (DRY原则)
 */
export class PDFDataFetcher {
  /**
   * 获取完整的任务数据用于PDF导出
   * KISS: 一次性获取所有需要的数据
   */
  static async fetchTaskDataForPDF(options: PDFExportOptions): Promise<PDFTaskData> {
    const { taskId } = options;

    try {
      // 1. 获取任务基本信息 (复用现有API)
      const taskResponse = await fetchApi({
        url: `/api/v1/tasks/${taskId}` as '/api/v1/tasks/{task_id}',
        method: 'get',
      });

      // 2. 获取子任务列表 (复用现有API)
      const subtasksResponse = await fetchApi({
        url: `/api/v1/tasks/${taskId}/subtasks` as '/api/v1/tasks/{task_id}/subtasks',
        method: 'get',
        params: { size: 1000 }, // 获取所有子任务
      });

      // 类型断言 - 基于API schema定义
      const task = taskResponse.data;
      const subtasksPage = subtasksResponse.data as unknown as { items: SubtaskDetail[] };
      const subtasks = subtasksPage.items || [];

      // 3. 并行获取每个子任务的详细信息和annotations
      const subtaskDetailsPromises = subtasks.map(async (subtask) => {
        const [detailResponse, annotationsResponse] = await Promise.all([
          fetchApi({
            url: `/api/v1/subtasks/${subtask.id}` as '/api/v1/subtasks/{subtask_id}',
            method: 'get',
          }),
          fetchApi({
            url: `/api/v1/subtasks/${subtask.id}/annotations` as '/api/v1/subtasks/{subtask_id}/annotations',
            method: 'get',
            params: { size: 1000 }, // 获取所有annotations
          }),
        ]);

        return {
          detail: detailResponse.data,
          annotations: (annotationsResponse.data as { items: AnnotationDetail[] }).items || [],
        };
      });

      const subtaskDetails = await Promise.all(subtaskDetailsPromises);

      // 4. 组织数据结构和准备视频帧数据
      const annotationsMap: Record<string, AnnotationDetail[]> = {};
      const enrichedSubtasks = subtaskDetails.map(({ detail, annotations }) => {
        // 过滤annotations (根据导出选项)
        const filteredAnnotations = annotations.filter((ann) => {
          return (
            (options.includeSolvedAnnotations || !ann.solved) && (options.includeComments || ann.type !== 'comment')
          );
        });

        // Video Frame 数据准备 (KISS: 仅对视频子任务处理)
        if (detail.task_type === 'video' && detail.content?.s3_path && filteredAnnotations.length > 0) {
          try {
            // 验证视频是否支持
            if (VideoFrameService.isVideoFormatSupported(detail.content.s3_path)) {
              // 预处理视频帧验证 (实际帧提取在VideoFramePages组件中进行)
              console.log(`Video subtask ${detail.id} validated for PDF generation`);
              // 注意: 实际的帧提取在VideoFramePages组件中进行 (DRY原则)
            } else {
              console.warn(`Unsupported video format for subtask ${detail.id}`);
            }
          } catch (error) {
            console.error(`Video frame preparation failed for subtask ${detail.id}:`, error);
            // 继续处理，不中断整个PDF生成
          }
        }

        annotationsMap[detail.id] = filteredAnnotations;
        return detail;
      });

      // 5. 处理任务缩略图的S3路径
      let taskWithResolvedThumbnail = task;
      if (task.s3_path) {
        try {
          const thumbnailResponse = await fetchApi({
            url: '/api/v1/assets',
            method: 'get',
            params: { s3_path: task.s3_path },
          });
          taskWithResolvedThumbnail = {
            ...task,
            s3_path: thumbnailResponse.data.url,
          };
        } catch (error) {
          console.error('Failed to resolve task thumbnail URL:', error);
          // 保持原始s3_path，PDFImage组件会处理
        }
      }

      // 6. 处理子任务图片的S3路径
      const subtasksWithResolvedImages = await Promise.all(
        enrichedSubtasks.map(async (subtask) => {
          if (subtask.content?.s3_path) {
            try {
              const imageResponse = await fetchApi({
                url: '/api/v1/assets',
                method: 'get',
                params: { s3_path: subtask.content.s3_path },
              });
              return {
                ...subtask,
                content: {
                  ...subtask.content,
                  s3_path: imageResponse.data.url,
                },
              };
            } catch (error) {
              console.error(`Failed to resolve subtask ${subtask.id} image URL:`, error);
              return subtask; // 返回原始数据
            }
          }
          return subtask;
        }),
      );

      return {
        task: taskWithResolvedThumbnail,
        subtasks: subtasksWithResolvedImages,
        annotations: annotationsMap,
      };
    } catch (error) {
      console.error('Failed to fetch task data for PDF export:', error);
      throw new Error('タスクデータの取得に失敗しました。再試行してください。');
    }
  }

  /**
   * 获取单个子任务的详细数据
   * 单一职责: 获取特定子任务的完整信息
   */
  static async fetchSubtaskDetail(subtaskId: string): Promise<{
    subtask: SubtaskDetail;
    annotations: AnnotationDetail[];
  }> {
    try {
      const [subtaskResponse, annotationsResponse] = await Promise.all([
        fetchApi({
          url: `/api/v1/subtasks/${subtaskId}` as '/api/v1/subtasks/{subtask_id}',
          method: 'get',
        }),
        fetchApi({
          url: `/api/v1/subtasks/${subtaskId}/annotations` as '/api/v1/subtasks/{subtask_id}/annotations',
          method: 'get',
          params: { size: 1000 },
        }),
      ]);

      return {
        subtask: subtaskResponse.data,
        annotations: (annotationsResponse.data as { items: AnnotationDetail[] }).items || [],
      };
    } catch (error) {
      console.error(`Failed to fetch subtask ${subtaskId} details:`, error);
      throw new Error('サブタスクデータの取得に失敗しました。');
    }
  }

  /**
   * 验证任务是否存在且可访问
   * KISS: 简单的存在性检查
   */
  static async validateTaskAccess(taskId: string): Promise<boolean> {
    try {
      await fetchApi({
        url: `/api/v1/tasks/${taskId}` as '/api/v1/tasks/{task_id}',
        method: 'get',
      });
      return true;
    } catch (error) {
      console.error(`Task ${taskId} validation failed:`, error);
      return false;
    }
  }

  /**
   * 验证视频子任务是否适合PDF生成
   * SOLID: 单一职责 - 专门验证视频子任务
   */
  static async validateVideoSubtaskForPDF(subtaskId: string): Promise<boolean> {
    try {
      const { subtask, annotations } = await this.fetchSubtaskDetail(subtaskId);

      // 检查是否为视频任务
      if (subtask.task_type !== 'video') {
        return false;
      }

      // 检查是否有视频内容
      if (!subtask.content?.s3_path) {
        return false;
      }

      // 检查视频格式支持
      if (!VideoFrameService.isVideoFormatSupported(subtask.content.s3_path)) {
        return false;
      }

      // 检查是否有带时间戳的注释
      const hasTimestampAnnotations = annotations.some((ann) => ann.start_at !== undefined && ann.start_at !== null);

      return hasTimestampAnnotations;
    } catch (error) {
      console.error(`Video subtask ${subtaskId} validation failed:`, error);
      return false;
    }
  }

  /**
   * 获取任务中的视频子任务统计信息
   * KISS: 简单的统计信息收集
   */
  static async getVideoSubtaskStats(taskId: string): Promise<{
    totalVideoSubtasks: number;
    validVideoSubtasks: number;
    totalTimestampAnnotations: number;
  }> {
    try {
      const taskData = await this.fetchTaskDataForPDF({
        taskId,
        includeComments: true,
        includeSolvedAnnotations: true,
        imageQuality: 'medium',
      });

      let totalVideoSubtasks = 0;
      let validVideoSubtasks = 0;
      let totalTimestampAnnotations = 0;

      for (const subtask of taskData.subtasks) {
        if (subtask.task_type === 'video') {
          totalVideoSubtasks++;

          const annotations = taskData.annotations[subtask.id] || [];
          const timestampAnnotations = annotations.filter((ann) => ann.start_at !== undefined && ann.start_at !== null);

          totalTimestampAnnotations += timestampAnnotations.length;

          if (
            subtask.content?.s3_path &&
            VideoFrameService.isVideoFormatSupported(subtask.content.s3_path) &&
            timestampAnnotations.length > 0
          ) {
            validVideoSubtasks++;
          }
        }
      }

      return {
        totalVideoSubtasks,
        validVideoSubtasks,
        totalTimestampAnnotations,
      };
    } catch (error) {
      console.error(`Failed to get video subtask stats for task ${taskId}:`, error);
      return {
        totalVideoSubtasks: 0,
        validVideoSubtasks: 0,
        totalTimestampAnnotations: 0,
      };
    }
  }
}
