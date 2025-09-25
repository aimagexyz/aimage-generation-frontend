import { useMutation, useQueryClient } from '@tanstack/react-query';

import { aiReviewsService, type BatchInitiateAiReviewRequest } from '@/api/aiReviewsService';
import { ApiError } from '@/api/apiClient';
import { toast } from '@/components/ui/use-toast';

export interface BatchInitiateAiReviewVariables {
  project_id: string;
  task_ids: string[];
}

export function useBatchInitiateAiReview() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, BatchInitiateAiReviewVariables>({
    mutationFn: async (variables: BatchInitiateAiReviewVariables) => {
      const requestData: BatchInitiateAiReviewRequest = {
        project_id: variables.project_id,
        task_ids: variables.task_ids,
      };
      return aiReviewsService.initiateBatchAiReview(requestData);
    },
    onSuccess: async (_, variables: BatchInitiateAiReviewVariables) => {
      // Invalidate relevant queries
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      await queryClient.invalidateQueries({ queryKey: ['aiReviews'] });

      toast({
        title: 'バッチ処理開始',
        description: `${variables.task_ids.length}件のタスクでバッチ処理を開始しました。`,
        variant: 'default',
      });
    },
    onError: (error: ApiError) => {
      toast({
        title: '処理開始エラー',
        description: `バッチ処理の開始に失敗しました: ${error.message || '予期しないエラーが発生しました。'}`,
        variant: 'destructive',
      });
    },
  });
}
