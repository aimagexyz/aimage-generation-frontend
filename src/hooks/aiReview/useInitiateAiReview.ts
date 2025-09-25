import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { toast } from '@/components/ui/use-toast';

import { aiReviewsService } from '../../api/aiReviewsService';
import { ApiError } from '../../api/apiClient';
import type { AiReviewInDB, AiReviewProcessingStatus, InitiateAiReviewVariables } from '../../types/aiReview';

export function useInitiateAiReview() {
  return useMutation<AiReviewInDB, ApiError, InitiateAiReviewVariables>({
    mutationFn: async ({ subtaskId, mode = 'quality', rpdIds }: InitiateAiReviewVariables) => {
      return aiReviewsService.initiateAiReview(subtaskId, mode, rpdIds);
    },
    onSuccess: (_response: AiReviewInDB, variables: InitiateAiReviewVariables) => {
      const modeText = variables.mode === 'speed' ? 'デフォルト' : '高品質モード';
      toast({
        title: 'AI監修が開始されました',
        description: `${modeText}でAI監修を実行中です。完了までお待ちください...`,
        variant: 'default',
      });
    },
    onError: (error: ApiError, variables: InitiateAiReviewVariables) => {
      const errorMessage = error.message || '予期しないエラーが発生しました';
      toast({
        title: 'AI監修の開始に失敗しました',
        description: `サブタスク ${variables.subtaskId} のAI監修を開始できませんでした: ${errorMessage}`,
        variant: 'destructive',
      });
    },
  });
}

export function useAiReviewProcessingStatus(
  subtaskId: string,
  options?: {
    enabled?: boolean;
    pollingInterval?: number;
    onComplete?: (review: AiReviewProcessingStatus) => void;
  },
) {
  const queryClient = useQueryClient();
  const onCompleteRef = useRef(options?.onComplete);

  useEffect(() => {
    onCompleteRef.current = options?.onComplete;
  }, [options?.onComplete]);

  const query = useQuery<AiReviewProcessingStatus>({
    queryKey: ['aiReviewProcessingStatus', subtaskId],
    queryFn: async (): Promise<AiReviewProcessingStatus> => {
      return await aiReviewsService.checkProcessingStatus(subtaskId);
    },
    enabled: options?.enabled ?? true,
    refetchInterval: (query) => {
      const data = query.state.data as unknown as AiReviewProcessingStatus | undefined;
      if (data && data.is_completed) {
        return 0;
      }
      return options?.pollingInterval ?? 10000;
    },
    refetchOnWindowFocus: false,
    retry: 3,
  });

  useEffect(() => {
    const data = query.data;
    if (data && data.is_completed && onCompleteRef.current) {
      onCompleteRef.current(data);

      void queryClient.invalidateQueries({ queryKey: ['aiReviews', subtaskId] });
      void queryClient.invalidateQueries({ queryKey: ['latestAiReview', subtaskId] });

      if (data.latest_review_id) {
        void queryClient.invalidateQueries({ queryKey: ['aiReview', data.latest_review_id] });
      }
    }
  }, [query.data, subtaskId, queryClient]);

  return query;
}

export function useInitiateAiReviewWithPolling() {
  const queryClient = useQueryClient();
  const initiateMutation = useInitiateAiReview();

  const initiateWithPolling = useCallback(
    async (
      subtaskId: string,
      options?: {
        onComplete?: (status: AiReviewProcessingStatus) => void;
        pollingInterval?: number;
        rpdIds?: string[];
      },
    ) => {
      try {
        await initiateMutation.mutateAsync({
          subtaskId,
          mode: 'quality', // デフォルトモード
          rpdIds: options?.rpdIds,
        });

        const pollingInterval = setInterval(async () => {
          try {
            const status = await aiReviewsService.checkProcessingStatus(subtaskId);
            const typedStatus = status;

            if (typedStatus && typedStatus.is_completed) {
              clearInterval(pollingInterval);

              toast({
                title: 'AI監修完了',
                description: `サブタスク ${subtaskId} のAI監修が完了しました。${typedStatus.findings_count} 個の問題点が発見されました`,
                variant: 'default',
              });

              void queryClient.invalidateQueries({ queryKey: ['aiReviews', subtaskId] });
              void queryClient.invalidateQueries({ queryKey: ['latestAiReview', subtaskId] });

              if (typedStatus.latest_review_id) {
                void queryClient.invalidateQueries({ queryKey: ['aiReview', typedStatus.latest_review_id] });
              }

              if (options?.onComplete) {
                options.onComplete(typedStatus);
              }
            }
          } catch (error) {
            console.error('AI監修ステータスの確認中にエラーが発生しました:', error);
            clearInterval(pollingInterval);
          }
        }, options?.pollingInterval ?? 10000);

        return () => clearInterval(pollingInterval);
      } catch (error) {
        console.error('AI監修の開始に失敗しました:', error);
        throw error;
      }
    },
    [initiateMutation, queryClient],
  );

  return {
    initiateWithPolling,
    isLoading: initiateMutation.isPending,
    error: initiateMutation.error,
  };
}
