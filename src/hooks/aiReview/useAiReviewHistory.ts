import { useQuery } from '@tanstack/react-query';

import { aiReviewsService } from '@/api/aiReviewsService';
import type { AiReviewSchema } from '@/types/aiReview'; // Using AiReviewSchema as it's a list view

interface UseAiReviewHistoryOptions {
  enabled?: boolean;
}

export function useAiReviewHistory(subtaskId: string | null | undefined, options?: UseAiReviewHistoryOptions) {
  return useQuery<AiReviewSchema[], Error>({
    queryKey: ['aiReviewHistory', subtaskId],
    queryFn: async () => {
      if (!subtaskId) {
        // Or throw an error, or return an empty array, depending on desired behavior for disabled queries
        // For now, let's assume queryFn won't be called if subtaskId is null/undefined due to 'enabled' option
        return Promise.reject(new Error('Subtask ID is required to fetch AI review history.'));
      }
      return aiReviewsService.listAiReviewsForSubtask(subtaskId);
    },
    enabled: !!subtaskId && (options?.enabled !== undefined ? options.enabled : true),
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Add other React Query options as needed, e.g., onError, onSuccess
  });
}
