import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { aiReviewsService } from '@/api/aiReviewsService';
import { toast } from '@/components/ui/use-toast';

export interface InterruptState {
  isInterrupting: boolean;
  isRetrying: boolean;
  retryAttempts: number;
  maxRetryAttempts: number;
  retryIntervalMs: number;
}

export interface UseInterruptAiReviewOptions {
  maxRetryAttempts?: number;
  retryIntervalMs?: number;
  onInterruptSuccess?: (subtaskId: string) => void;
  onInterruptFailed?: (subtaskId: string, error: Error) => void;
}

export function useInterruptAiReview(options: UseInterruptAiReviewOptions = {}) {
  const { maxRetryAttempts = 10, retryIntervalMs = 3000, onInterruptSuccess, onInterruptFailed } = options;

  const queryClient = useQueryClient();
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRetryingRef = useRef(false);

  const [interruptState, setInterruptState] = useState<InterruptState>({
    isInterrupting: false,
    isRetrying: false,
    retryAttempts: 0,
    maxRetryAttempts,
    retryIntervalMs,
  });

  // 基础的中断mutation
  const interruptMutation = useMutation({
    mutationFn: async (subtaskId: string): Promise<{ message: string; status: string; subtask_id: string }> => {
      return await aiReviewsService.interruptAiReview(subtaskId);
    },
    onSuccess: (data, subtaskId) => {
      console.log(`AI review interrupted successfully for subtask ${subtaskId}:`, data);

      // 停止重试
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      isRetryingRef.current = false;

      // 重置状态
      setInterruptState((prev) => ({
        ...prev,
        isInterrupting: false,
        isRetrying: false,
        retryAttempts: 0,
      }));

      // 刷新相关查询
      void queryClient.invalidateQueries({ queryKey: ['aiReviewProcessingStatus', subtaskId] });
      void queryClient.invalidateQueries({ queryKey: ['latestAiReview', subtaskId] });

      // 显示成功消息
      toast({
        title: 'AI監修が中断されました',
        description: '再監修をかけてください。',
        variant: 'default',
        duration: 5000,
      });

      // 调用成功回调
      if (onInterruptSuccess) {
        onInterruptSuccess(subtaskId);
      }
    },
    onError: (error, subtaskId) => {
      console.error(`Failed to interrupt AI review for subtask ${subtaskId}:`, error);

      // 如果是404错误（review不存在），开始重试逻辑
      if (error.message.includes('404') || error.message.includes('not found')) {
        handleRetry(subtaskId);
      } else {
        // 其他错误，停止重试并显示错误
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
        isRetryingRef.current = false;

        setInterruptState((prev) => ({
          ...prev,
          isInterrupting: false,
          isRetrying: false,
          retryAttempts: 0,
        }));

        toast({
          title: 'エラー',
          description: `AI監修の中断に失敗しました: ${error.message}`,
          variant: 'destructive',
          duration: 5000,
        });

        if (onInterruptFailed) {
          onInterruptFailed(subtaskId, error);
        }
      }
    },
  });

  // 处理重试逻辑
  const handleRetry = useCallback(
    (subtaskId: string) => {
      setInterruptState((prev) => {
        const newAttempts = prev.retryAttempts + 1;

        if (newAttempts >= maxRetryAttempts) {
          // 达到最大重试次数
          toast({
            title: 'AI監修中断失敗',
            description: '最大重試回数に達しました。監修タスクがまだ作成されていない可能性があります。',
            variant: 'destructive',
            duration: 8000,
          });

          if (onInterruptFailed) {
            onInterruptFailed(subtaskId, new Error('Max retry attempts reached'));
          }

          return {
            ...prev,
            isInterrupting: false,
            isRetrying: false,
            retryAttempts: 0,
          };
        }

        // 设置下一次重试
        if (!isRetryingRef.current) {
          isRetryingRef.current = true;
          retryTimeoutRef.current = setTimeout(() => {
            console.log(`Retrying interrupt for subtask ${subtaskId}, attempt ${newAttempts + 1}`);
            interruptMutation.mutate(subtaskId);
          }, retryIntervalMs);
        }

        return {
          ...prev,
          isRetrying: true,
          retryAttempts: newAttempts,
        };
      });
    },
    [maxRetryAttempts, retryIntervalMs, interruptMutation, onInterruptFailed],
  );

  // 主要的中断函数
  const interruptAiReview = useCallback(
    (subtaskId: string) => {
      if (interruptState.isInterrupting) {
        console.log('Interrupt already in progress');
        return;
      }

      // 清理之前的重试状态
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      isRetryingRef.current = false;

      // 设置中断状态
      setInterruptState((prev) => ({
        ...prev,
        isInterrupting: true,
        isRetrying: false,
        retryAttempts: 0,
      }));

      // 显示中断中的消息
      toast({
        title: 'AI監修を中断しています...',
        description: '処理が完了するまでお待ちください。',
        duration: 3000,
      });

      // 开始中断请求
      interruptMutation.mutate(subtaskId);
    },
    [interruptState.isInterrupting, interruptMutation],
  );

  // 取消中断操作
  const cancelInterrupt = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    isRetryingRef.current = false;

    setInterruptState((prev) => ({
      ...prev,
      isInterrupting: false,
      isRetrying: false,
      retryAttempts: 0,
    }));

    toast({
      title: '中断操作がキャンセルされました',
      description: '',
      duration: 3000,
    });
  }, []);

  // 清理函数
  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    isRetryingRef.current = false;
  }, []);

  return {
    interruptAiReview,
    cancelInterrupt,
    cleanup,
    interruptState,
    isInterrupting: interruptState.isInterrupting,
    isRetrying: interruptState.isRetrying,
    retryAttempts: interruptState.retryAttempts,
  };
}
