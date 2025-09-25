import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ApiError } from '../../api/apiClient';
import { reviewPointDefinitionsService } from '../../api/reviewPointDefinitionsService';
import type { Rpd } from '../../types/ReviewPointDefinition';

export const RPD_QUERY_KEY_PREFIX = 'rpd';

export function useReviewPointDefinitions(projectId: string): UseQueryResult<Rpd[], ApiError> {
  return useQuery<Rpd[], ApiError, Rpd[], [string, string]>({
    queryKey: [RPD_QUERY_KEY_PREFIX, projectId],
    queryFn: async () => {
      if (!projectId) {
        return Promise.reject(new Error('projectId is required to fetch RPDs.'));
      }
      return reviewPointDefinitionsService.listForProject(projectId);
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes - RPDs don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for reasonable time
  });
}
