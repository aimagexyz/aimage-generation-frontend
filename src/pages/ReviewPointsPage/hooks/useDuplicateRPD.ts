import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui/use-toast';

import { ApiError } from '../../../api/apiClient';
import { reviewPointDefinitionsService } from '../../../api/reviewPointDefinitionsService';
import type { ReviewPointDefinitionCreate, ReviewPointDefinitionSchema } from '../../../types/ReviewPointDefinition';
import { RPD_QUERY_KEYS } from './useReviewPointDefinitions';

export interface DuplicateRPDVariables {
  sourceRpd: ReviewPointDefinitionSchema;
  projectId: string;
}

export function useDuplicateRPD() {
  const queryClient = useQueryClient();

  return useMutation<
    ReviewPointDefinitionSchema, // Type of data returned by the mutationFn
    ApiError, // Type of error
    DuplicateRPDVariables // Type of variables passed to the mutationFn
  >({
    mutationFn: async ({ sourceRpd, projectId }: DuplicateRPDVariables) => {
      const currentVersion = sourceRpd.current_version;
      if (!currentVersion) {
        throw new Error('Source RPD has no current version');
      }

      // Create the duplicate RPD data
      const duplicateData: ReviewPointDefinitionCreate = {
        key: sourceRpd.key,
        is_active: sourceRpd.is_active,
        title: `${currentVersion.title} (Copy)`,
        user_instruction: currentVersion.user_instruction || currentVersion.description_for_ai || '',
        project_id: projectId,
        reference_images: currentVersion.reference_images || [],
      };

      return reviewPointDefinitionsService.createReviewPointDefinition(duplicateData);
    },
    onSuccess: (duplicatedRPD: ReviewPointDefinitionSchema) => {
      // Invalidate and refetch the list of RPDs
      void queryClient.invalidateQueries({ queryKey: RPD_QUERY_KEYS.lists() });

      toast({
        title: 'RPD Duplicated Successfully',
        description: `"${duplicatedRPD.current_version?.title || 'Untitled RPD'}" has been created as a copy.`,
        variant: 'default',
      });
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Error Duplicating RPD',
        description: error.message || 'An unexpected error occurred while duplicating the RPD.',
        variant: 'destructive',
      });
    },
  });
}
