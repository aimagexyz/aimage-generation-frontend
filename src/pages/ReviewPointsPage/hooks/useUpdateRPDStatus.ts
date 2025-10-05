import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui/use-toast';

import { ApiError } from '../../../api/apiClient';
import { reviewPointDefinitionsService } from '../../../api/reviewPointDefinitionsService';
import type { ReviewPointDefinitionSchema, RPDStatusUpdate } from '../../../types/ReviewPointDefinition';

export interface UpdateRPDStatusVariables {
  rpdId: string;
  data: RPDStatusUpdate;
}

export function useUpdateRPDStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    ReviewPointDefinitionSchema, // Type of data returned by the mutationFn
    ApiError, // Type of error
    UpdateRPDStatusVariables // Type of variables passed to the mutationFn
  >({
    mutationFn: async ({ rpdId, data }: UpdateRPDStatusVariables) => {
      return reviewPointDefinitionsService.updateRPDStatus(rpdId, data);
    },
    onSuccess: async (updatedRPD: ReviewPointDefinitionSchema, variables: UpdateRPDStatusVariables) => {
      // Invalidate and refetch the list of RPDs
      await queryClient.invalidateQueries({ queryKey: ['reviewPointDefinitions'] });

      // Optionally, update the specific RPD in the cache if needed
      queryClient.setQueryData<ReviewPointDefinitionSchema>(['reviewPointDefinition', variables.rpdId], updatedRPD);

      toast({
        title: 'RPD Status Updated',
        description: `RPD "${updatedRPD.key}" has been ${updatedRPD.is_active ? 'activated' : 'deactivated'}.`,
        variant: 'default',
      });
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Error Updating RPD Status',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}
