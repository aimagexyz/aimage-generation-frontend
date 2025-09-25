import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { aiReviewsService } from '../../api/aiReviewsService';
import { ApiError } from '../../api/apiClient';
import type { AiReviewSchema } from '../../types/aiReview'; // Ensure lowercase to match existing usage

export const AI_REVIEW_QUERY_KEY_PREFIX = 'aiReview';

export function useAiReview(
  aiReviewId: string | null | undefined,
  options?: Omit<
    UseQueryOptions<AiReviewSchema, ApiError, AiReviewSchema, (string | null | undefined)[]>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<AiReviewSchema, ApiError, AiReviewSchema, (string | null | undefined)[]>({
    queryKey: [AI_REVIEW_QUERY_KEY_PREFIX, aiReviewId],
    queryFn: async () => {
      if (!aiReviewId) {
        return Promise.reject(new Error('aiReviewId is required to fetch an AI review.'));
      }
      return aiReviewsService.getAiReview(aiReviewId);
    },
    enabled: !!aiReviewId && (options?.enabled !== undefined ? options.enabled : true),
    ...options,
  });
}
