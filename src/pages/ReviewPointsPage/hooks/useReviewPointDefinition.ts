import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ApiError } from '../../../api/apiClient';
import { reviewPointDefinitionsService } from '../../../api/reviewPointDefinitionsService';
import type { ReviewPointDefinitionSchema } from '../../../types/ReviewPointDefinition';
import { RPD_QUERY_KEYS } from './useReviewPointDefinitions'; // Re-use query keys

interface UseReviewPointDefinitionOptions {
  // Add other TanStack Query options as needed, e.g., enabled, staleTime, etc.
  enabled?: boolean;
}

export const useReviewPointDefinition = (
  rpdId: string | undefined, // Allow undefined to disable the query if id is not available
  options?: UseReviewPointDefinitionOptions,
): UseQueryResult<ReviewPointDefinitionSchema, ApiError> => {
  const { enabled = !!rpdId, ...queryOptionsFromUser } = options || {}; // Default enabled to true if rpdId is present

  return useQuery<ReviewPointDefinitionSchema, ApiError>({
    queryKey: RPD_QUERY_KEYS.detail(rpdId!), // Assertion: rpdId will be defined if enabled is true
    queryFn: () => reviewPointDefinitionsService.getReviewPointDefinition(rpdId!),
    enabled,
    ...queryOptionsFromUser,
  });
};
