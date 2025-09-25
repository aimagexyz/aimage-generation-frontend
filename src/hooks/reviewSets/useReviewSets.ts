import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ApiError } from '../../api/apiClient';
import { reviewSetsService } from '../../api/reviewSetsService';
import type { ReviewSetOut } from '../../types/ReviewSet';

export const REVIEW_SET_QUERY_KEY_PREFIX = 'reviewSet';

/**
 * Hook for fetching ReviewSets for a project
 * SOLID: Single responsibility for ReviewSet data management
 * DRY: Follows existing hook patterns (useReviewPointDefinitions)
 */
export function useReviewSets(projectId: string): UseQueryResult<ReviewSetOut[], ApiError> {
  return useQuery<ReviewSetOut[], ApiError, ReviewSetOut[], [string, string]>({
    queryKey: [REVIEW_SET_QUERY_KEY_PREFIX, projectId],
    queryFn: async () => {
      if (!projectId) {
        return Promise.reject(new Error('projectId is required to fetch ReviewSets.'));
      }
      return reviewSetsService.listReviewSets(projectId);
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes - ReviewSets don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for reasonable time
  });
}

/**
 * Hook for fetching a single ReviewSet by ID
 * Useful for detailed views or when we need full ReviewSet information
 */
export function useReviewSet(reviewSetId: string): UseQueryResult<ReviewSetOut, ApiError> {
  return useQuery<ReviewSetOut, ApiError, ReviewSetOut, [string, string]>({
    queryKey: [REVIEW_SET_QUERY_KEY_PREFIX, reviewSetId],
    queryFn: async () => {
      if (!reviewSetId) {
        return Promise.reject(new Error('reviewSetId is required to fetch ReviewSet.'));
      }
      return reviewSetsService.getReviewSet(reviewSetId);
    },
    enabled: !!reviewSetId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
