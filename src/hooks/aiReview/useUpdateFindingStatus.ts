import { useMutation, useQueryClient } from '@tanstack/react-query';

import { aiReviewFindingsService } from '@/api/aiReviewFindingsService';
import type { AiReviewSchema } from '@/types/aiReview';
import type { FindingStatusUpdate } from '@/types/AiReviewFinding';

interface UpdateFindingStatusParams {
  findingId: string;
  data: FindingStatusUpdate;
}

// Define the mutation function separately for clarity and to ensure its signature is correct.
const mutationFn = async (params: UpdateFindingStatusParams): Promise<AiReviewSchema> => {
  const { findingId, data } = params;
  return aiReviewFindingsService.updateFindingStatus(findingId, data);
};

export function useUpdateFindingStatus() {
  const queryClient = useQueryClient();

  return useMutation<AiReviewSchema, Error, UpdateFindingStatusParams>({
    mutationFn, // Pass the defined mutation function here
    onSuccess: async (updatedReview: AiReviewSchema) => {
      // Made async and prefixed variables
      await queryClient.invalidateQueries({ queryKey: ['aiReview', updatedReview.id] });
      await queryClient.invalidateQueries({ queryKey: ['aiReviewHistory'] });
      queryClient.setQueryData(['aiReview', updatedReview.id], updatedReview);
      // Potentially invalidate latest review for subtask:
      if (updatedReview.subtask_id) {
        await queryClient.invalidateQueries({ queryKey: ['latestAiReview', updatedReview.subtask_id] });
      }
    },
    onError: (error: Error, variables: UpdateFindingStatusParams) => {
      // variables is used here
      console.error(`Error updating status for finding ${variables.findingId}:`, error);
    },
  });
}
