import { useMutation, useQueryClient } from '@tanstack/react-query';

import { aiReviewFindingsService } from '@/api/aiReviewFindingsService';
import type { AiReviewSchema } from '@/types/aiReview';
import type { AiReviewFindingHumanOverrideCreate } from '@/types/AiReviewFinding';

interface OverrideFindingParams {
  originalAiFindingId: string;
  data: AiReviewFindingHumanOverrideCreate;
  // aiReviewId could be derived from the response (updatedReview.id)
}

const mutationFn = async (params: OverrideFindingParams): Promise<AiReviewSchema> => {
  const { originalAiFindingId, data } = params;
  return aiReviewFindingsService.overrideAiFinding(originalAiFindingId, data);
};

export function useOverrideFinding() {
  const queryClient = useQueryClient();

  return useMutation<AiReviewSchema, Error, OverrideFindingParams>({
    mutationFn,
    onSuccess: async (updatedReview: AiReviewSchema) => {
      await queryClient.invalidateQueries({ queryKey: ['aiReview', updatedReview.id] });
      await queryClient.invalidateQueries({ queryKey: ['aiReviewHistory'] });
      queryClient.setQueryData(['aiReview', updatedReview.id], updatedReview);
      if (updatedReview.subtask_id) {
        await queryClient.invalidateQueries({ queryKey: ['latestAiReview', updatedReview.subtask_id] });
      }
    },
    onError: (error: Error, variables: OverrideFindingParams) => {
      console.error(`Error overriding finding ${variables.originalAiFindingId}:`, error);
    },
  });
}
