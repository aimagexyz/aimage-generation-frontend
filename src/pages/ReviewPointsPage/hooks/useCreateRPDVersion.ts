import {
  type MutationFunctionContext,
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
  useQueryClient,
} from '@tanstack/react-query';

import type { ApiError } from '../../../api/apiClient';
import { reviewPointDefinitionsService } from '../../../api/reviewPointDefinitionsService';
import type {
  ReviewPointDefinitionSchema,
  ReviewPointDefinitionVersionBase,
  ReviewPointDefinitionVersionInDB,
} from '../../../types/ReviewPointDefinition';
import { RPD_QUERY_KEYS } from './useReviewPointDefinitions';

export interface CreateRPDVersionVariables {
  rpdId: string;
  data: ReviewPointDefinitionVersionBase;
}

export const useCreateRPDVersion = (
  options?: UseMutationOptions<
    ReviewPointDefinitionVersionInDB,
    ApiError,
    CreateRPDVersionVariables,
    // unknown // context type, defaults to unknown
    unknown
  >,
): UseMutationResult<ReviewPointDefinitionVersionInDB, ApiError, CreateRPDVersionVariables> => {
  const queryClient = useQueryClient();

  return useMutation<ReviewPointDefinitionVersionInDB, ApiError, CreateRPDVersionVariables>({
    mutationFn: (variables: CreateRPDVersionVariables) =>
      reviewPointDefinitionsService.createReviewPointDefinitionVersion(variables.rpdId, variables.data),

    // Spread the user-provided options first, so our onSuccess can augment or be overridden if needed
    ...options,

    onSuccess: (newVersion, variables, context) => {
      // Invalidate and refetch queries
      void queryClient.invalidateQueries({ queryKey: RPD_QUERY_KEYS.detail(variables.rpdId) });
      void queryClient.invalidateQueries({ queryKey: RPD_QUERY_KEYS.lists() });

      // Optimistically update the specific RPD detail in the cache
      queryClient.setQueryData<ReviewPointDefinitionSchema | undefined>(
        RPD_QUERY_KEYS.detail(variables.rpdId),
        (oldData): ReviewPointDefinitionSchema | undefined => {
          if (!oldData) {
            return undefined;
          }
          const updatedVersions: ReviewPointDefinitionVersionInDB[] = [...oldData.versions, newVersion].sort(
            (a, b) => a.version - b.version,
          );

          return {
            ...oldData,
            versions: updatedVersions,
            current_version_num: newVersion.version,
            current_version: newVersion,
          };
        },
      );

      // Call user's onSuccess if provided from options
      if (options?.onSuccess) {
        options.onSuccess(newVersion, variables, undefined, context as MutationFunctionContext);
      }
    },
  });
};
