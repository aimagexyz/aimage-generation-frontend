import { useMutation, useQueryClient } from '@tanstack/react-query';

import { promotedFindingsService } from '@/api/promotedFindingsService';
import type { AiReviewSchema } from '@/types/aiReview'; // For invalidating parent review
// import type { FindingStatus } from '@/types/AiReviewFinding'; // Removed unused import
import type { PromotedFindingResponseSchema, PromoteFindingRequestBody } from '@/types/PromotedFinding';

interface PromoteFindingParams {
  data: PromoteFindingRequestBody;
  originalFindingId: string;
  aiReviewId: string;
}

const mutationFn = async (params: PromoteFindingParams): Promise<PromotedFindingResponseSchema> => {
  return promotedFindingsService.promoteFinding(params.data);
};

export function usePromoteFinding() {
  const queryClient = useQueryClient();

  return useMutation<PromotedFindingResponseSchema, Error, PromoteFindingParams>({
    mutationFn,
    onSuccess: async (_promotedFindingData: PromotedFindingResponseSchema, variables: PromoteFindingParams) => {
      await queryClient.invalidateQueries({ queryKey: ['aiReview', variables.aiReviewId] });
      await queryClient.invalidateQueries({ queryKey: ['aiReviewHistory'] });

      const oldReview = queryClient.getQueryData<AiReviewSchema>(['aiReview', variables.aiReviewId]);

      if (oldReview && oldReview.subtask_id) {
        const currentLatestReview = queryClient.getQueryData<AiReviewSchema>(['latestAiReview', oldReview.subtask_id]);
        if (currentLatestReview && currentLatestReview.id === variables.aiReviewId) {
          await queryClient.invalidateQueries({ queryKey: ['latestAiReview', oldReview.subtask_id] });
        }
      }
    },
    onError: (error: Error, variables: PromoteFindingParams) => {
      console.error(`Error promoting finding ${variables.originalFindingId}:`, error);
    },
  });
}
