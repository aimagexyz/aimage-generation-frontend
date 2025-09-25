import { type QueryKey, useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ApiError } from '../../../api/apiClient';
import { reviewPointDefinitionsService } from '../../../api/reviewPointDefinitionsService';
import type { ReviewPointDefinitionSchema } from '../../../types/ReviewPointDefinition';

export const RPD_QUERY_KEYS = {
  all: ['reviewPointDefinitions'] as const,
  lists: () => [...RPD_QUERY_KEYS.all, 'list'] as const,
  list: (filters: { activeOnly?: boolean; projectId?: string }) => [...RPD_QUERY_KEYS.lists(), filters] as const,
  details: () => [...RPD_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...RPD_QUERY_KEYS.details(), id] as const,
};

interface UseReviewPointDefinitionsOptions {
  activeOnly?: boolean;
  projectId?: string;
  // Add other TanStack Query options as needed, e.g., enabled, staleTime, etc.
  // queryOptions?: Omit<UseQueryOptions<ReviewPointDefinitionSchema[], ApiError>, 'queryKey' | 'queryFn'>;
}

export const useReviewPointDefinitions = (
  options?: UseReviewPointDefinitionsOptions,
): UseQueryResult<ReviewPointDefinitionSchema[], ApiError> => {
  const { activeOnly, projectId, ...queryOptionsFromUser } = options || {};

  return useQuery<ReviewPointDefinitionSchema[], ApiError, ReviewPointDefinitionSchema[], QueryKey>({
    queryKey: RPD_QUERY_KEYS.list({ activeOnly, projectId }),
    queryFn: () => reviewPointDefinitionsService.listReviewPointDefinitions(activeOnly, projectId),
    ...queryOptionsFromUser, // Spread the rest of the options here
  });
};
