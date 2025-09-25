import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { ApiError } from '../../api/apiClient';
import { fetchApi } from '../../api/client';
import type { components } from '../../api/schemas';

export const LATEST_AI_REVIEW_QUERY_KEY_PREFIX = 'latestAiReview';

// 使用 OpenAPI schemas 中定义的 AiReview 类型
type AiReview = components['schemas']['AiReview'];

export function useLatestAiReview(
  subtaskId: string | null | undefined,
  // Allow passing through all UseQueryOptions for AiReview
  options?: Omit<UseQueryOptions<AiReview, ApiError, AiReview, (string | null | undefined)[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<AiReview, ApiError, AiReview, (string | null | undefined)[]>({
    queryKey: [LATEST_AI_REVIEW_QUERY_KEY_PREFIX, subtaskId],
    queryFn: async () => {
      if (!subtaskId) {
        // This case should be prevented by the `enabled` option below
        return Promise.reject(new Error('subtaskId is required to fetch the latest AI review.'));
      }

      // 使用正确的API路径
      const response = await fetchApi({
        url: `/api/v1/ai-reviews/subtasks/${subtaskId}/latest` as '/api/v1/ai-reviews/subtasks/{subtask_id}/latest',
        method: 'get',
      });

      return response.data;
    },
    // Default enabled is true, but only if subtaskId is present.
    // Allow override from options.
    enabled: !!subtaskId && (options?.enabled !== undefined ? options.enabled : true),
    ...options, // Spread the rest of the options
  });
}
