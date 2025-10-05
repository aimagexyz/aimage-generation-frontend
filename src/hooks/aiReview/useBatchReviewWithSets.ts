import { useCallback, useState } from 'react';

import {
  aiReviewsService,
  type BatchInitiateCustomAiReviewRequest,
  type BatchInitiateCustomAiReviewResponse,
} from '@/api/aiReviewsService';
import { reviewSetsService } from '@/api/reviewSetsService';
import { toast } from '@/components/ui/use-toast';
import type { BatchReviewConfig, BatchReviewState } from '@/types/BatchReview';

// 简化的批处理状态 - 专注于提交确认
interface SimpleBatchState {
  isSubmitting: boolean;
  isSubmitted: boolean;
  error: string | null;
  batchInfo: {
    batchId: string;
    submittedTaskCount: number;
    submittedAt: Date;
    mode: string;
    rpdCount: number;
    reviewSetCount: number;
  } | null;
}

/**
 * Enhanced Batch Review Hook with ReviewSet Support
 *
 * SOLID Principles:
 * - Single Responsibility: Handles batch AI review processing only
 * - Open/Closed: Can be extended with more processing strategies
 * - Dependency Inversion: Uses service abstractions
 *
 * DRY Principles:
 * - Reuses existing ReviewSet expansion logic from TaskDetail
 * - Reuses existing aiReviewsService.initiateAiReview for individual processing
 * - Follows established error handling patterns
 *
 * KISS Principles:
 * - Clear sequential processing flow
 * - Simple state management
 * - Straightforward error handling
 */
export function useBatchReviewWithSets() {
  // 简化的状态管理 - 专注于提交确认
  const [simpleBatchState, setSimpleBatchState] = useState<SimpleBatchState>({
    isSubmitting: false,
    isSubmitted: false,
    error: null,
    batchInfo: null,
  });

  // 保持兼容性的状态，用于现有UI组件
  const [state, setState] = useState<BatchReviewState>({
    isProcessing: false,
    progress: {
      total: 0,
      completed: 0,
      failed: 0,
      processing: 0,
      percentage: 0,
    },
    results: [],
    error: null,
    config: undefined,
    isCancelled: false,
  });

  // SOLID: Single responsibility - ReviewSet expansion
  // DRY: Reuses logic from TaskDetail/index.tsx (lines 604-631)
  const expandReviewSetsToRpdIds = useCallback(
    async (selection: { rpdIds: string[]; reviewSetIds: string[] }): Promise<string[]> => {
      const allRpdIds = [...(selection.rpdIds || [])];

      if (selection.reviewSetIds?.length) {
        try {
          // Fetch all selected ReviewSets in parallel for efficiency
          const reviewSetPromises = selection.reviewSetIds.map((id) => reviewSetsService.getReviewSet(id));
          const reviewSets = await Promise.all(reviewSetPromises);

          // Extract RPD IDs from all ReviewSets
          for (const reviewSet of reviewSets) {
            const reviewSetRpdIds = reviewSet.rpds?.map((rpd) => rpd.id) || [];
            allRpdIds.push(...reviewSetRpdIds);
          }
        } catch (error) {
          console.error('[Batch] Failed to expand ReviewSets:', error);
          throw new Error(`ReviewSet expansion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Remove duplicates and return
      const uniqueRpdIds = [...new Set(allRpdIds)];
      return uniqueRpdIds;
    },
    [],
  );

  // 简化的批处理开始逻辑 - 专注于提交确认
  const startBatchReview = useCallback(
    async (config: BatchReviewConfig): Promise<void> => {
      try {
        // 1. 设置提交中状态
        setSimpleBatchState({
          isSubmitting: true,
          isSubmitted: false,
          error: null,
          batchInfo: null,
        });

        // 更新兼容性状态为提交中
        setState({
          isProcessing: true,
          progress: {
            total: config.selectedTaskIds.length,
            completed: 0,
            failed: 0,
            processing: 0,
            percentage: 0,
          },
          results: config.selectedTaskIds.map((taskId) => ({
            taskId,
            taskName: `Task ${taskId}`,
            status: 'pending' as const,
            startedAt: new Date(),
            message: '処理依頼を送信中...',
          })),
          error: null,
          config,
          isCancelled: false,
        });

        // 2. 验证选择
        const totalRpdCount = (config.rpdIds?.length || 0) + (config.reviewSetIds?.length || 0);
        if (totalRpdCount === 0) {
          throw new Error('レビューセットまたはRPDを少なくとも1つ選択してください。');
        }

        // 3. 调用后端API
        const requestData: BatchInitiateCustomAiReviewRequest = {
          project_id: config.projectId,
          task_ids: config.selectedTaskIds,
          rpd_ids: config.rpdIds,
          review_set_ids: config.reviewSetIds,
          mode: 'quality',
        };

        const response: BatchInitiateCustomAiReviewResponse =
          await aiReviewsService.initiateBatchCustomAiReview(requestData);

        // 4. 提交成功 - 更新状态
        const submittedAt = new Date();
        setSimpleBatchState({
          isSubmitting: false,
          isSubmitted: true,
          error: null,
          batchInfo: {
            batchId: response.batch_id,
            submittedTaskCount: response.subtask_count,
            submittedAt,
            mode: response.mode,
            rpdCount: response.rpd_count,
            reviewSetCount: response.review_set_count,
          },
        });

        // 更新兼容性状态为已提交
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          progress: {
            ...prev.progress,
            completed: config.selectedTaskIds.length,
            percentage: 100,
          },
          results: prev.results.map((result) => ({
            ...result,
            status: 'completed' as const,
            message: 'バッチ処理依頼が送信されました',
            endedAt: submittedAt,
          })),
        }));

        // 5. 显示成功Toast with 跳转按钮
        toast({
          title: '✅ バッチ処理依頼完了',
          description: `${response.subtask_count}件のサブタスクの処理依頼を送信しました。処理ID: ${response.batch_id}`,
          variant: 'default',
        });

        // 可选：添加控制台日志，方便调试时查看batch_id
        console.log(`Batch processing submitted with ID: ${response.batch_id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('[Batch] Batch submission failed:', error);

        // 更新错误状态
        setSimpleBatchState({
          isSubmitting: false,
          isSubmitted: false,
          error: errorMessage,
          batchInfo: null,
        });

        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: errorMessage,
          progress: {
            ...prev.progress,
            failed: config.selectedTaskIds.length,
          },
          results: prev.results.map((result) => ({
            ...result,
            status: 'failed' as const,
            error: errorMessage,
            endedAt: new Date(),
          })),
        }));

        toast({
          title: 'バッチ処理依頼エラー',
          description: `処理依頼の送信に失敗しました: ${errorMessage}`,
          variant: 'destructive',
        });

        throw error;
      }
    },
    [expandReviewSetsToRpdIds],
  );

  // SOLID: Single responsibility - cancel batch processing
  const cancelBatch = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCancelled: true,
      isProcessing: false,
    }));

    toast({
      title: 'バッチ処理キャンセル',
      description: 'バッチ処理がキャンセルされました。',
      variant: 'default',
    });
  }, []);

  // SOLID: Single responsibility - retry failed tasks
  const retryFailedTasks = useCallback(
    async (taskIds: string[]) => {
      if (!state.config) {
        console.error('[Batch] Cannot retry: no configuration available');
        return;
      }

      // Reset failed tasks to pending
      setState((prev) => ({
        ...prev,
        results: prev.results.map((result) =>
          taskIds.includes(result.taskId)
            ? { ...result, status: 'pending' as const, error: undefined, startedAt: new Date() }
            : result,
        ),
      }));

      // Start processing only the failed tasks
      const retryConfig: BatchReviewConfig = {
        ...state.config,
        selectedTaskIds: taskIds,
      };

      await startBatchReview(retryConfig);
    },
    [state.config, startBatchReview],
  );

  // 批次结果页面跳转函数
  const navigateToBatchResults = useCallback((batchId: string, projectId: string) => {
    // 在新标签页中打开批处理结果页面，并通过查询参数指定要查看的batchId
    const url = `/projects/${projectId}/batch-results?selectedBatch=${batchId}`;
    window.open(url, '_blank');
  }, []);

  // 重置批处理状态函数
  const resetBatchState = useCallback(() => {
    setSimpleBatchState({
      isSubmitting: false,
      isSubmitted: false,
      error: null,
      batchInfo: null,
    });

    setState({
      isProcessing: false,
      progress: {
        total: 0,
        completed: 0,
        failed: 0,
        processing: 0,
        percentage: 0,
      },
      results: [],
      error: null,
      config: undefined,
      isCancelled: false,
    });
  }, []);

  return {
    ...state,
    startBatchReview,
    cancelBatch,
    retryFailedTasks,
    // 新增的简化状态
    simpleBatch: simpleBatchState,
    // 批次结果页面跳转函数
    navigateToBatchResults,
    // 重置状态函数
    resetBatchState,
  };
}
