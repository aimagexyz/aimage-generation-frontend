import { useMutation, useQueryClient } from '@tanstack/react-query';

import { aiReviewsService } from '@/api/aiReviewsService';
import type { AiReviewSchema } from '@/types/aiReview';
import type { AiReviewFindingHumanCreate } from '@/types/AiReviewFinding';

interface AddHumanFindingParams {
  aiReviewId: string;
  data: AiReviewFindingHumanCreate;
}

const mutationFn = async (params: AddHumanFindingParams): Promise<AiReviewSchema> => {
  const { aiReviewId, data } = params;
  return aiReviewsService.addHumanFindingToReview(aiReviewId, data);
};

export function useAddHumanFinding() {
  const queryClient = useQueryClient();

  return useMutation<AiReviewSchema, Error, AddHumanFindingParams>({
    mutationFn,
    onSuccess: async (updatedReview: AiReviewSchema) => {
      await queryClient.invalidateQueries({ queryKey: ['aiReview', updatedReview.id] });
      await queryClient.invalidateQueries({ queryKey: ['aiReviewHistory'] });
      queryClient.setQueryData(['aiReview', updatedReview.id], updatedReview);
      if (updatedReview.subtask_id) {
        await queryClient.invalidateQueries({ queryKey: ['latestAiReview', updatedReview.subtask_id] });
      }
    },
    onError: (error: Error, variables: AddHumanFindingParams) => {
      console.error(`Error adding human finding to review ${variables.aiReviewId}:`, error);
    },
  });
}
