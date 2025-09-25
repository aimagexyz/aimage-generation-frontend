import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui/use-toast';

import { ApiError } from '../../../api/apiClient';
import { reviewPointDefinitionsService } from '../../../api/reviewPointDefinitionsService';
import { reviewSetsQueryKeys } from '../../../hooks/useReviewSets';
import { RPD_QUERY_KEYS } from './useReviewPointDefinitions';

export function useDeleteRPD() {
  const queryClient = useQueryClient();

  return useMutation<
    void, // Type of data returned by the mutationFn (void for delete)
    ApiError, // Type of error
    string // Type of variables passed to the mutationFn (rpdId as string)
  >({
    mutationFn: async (rpdId: string) => {
      return reviewPointDefinitionsService.deleteReviewPointDefinition(rpdId);
    },
    onSuccess: (_, rpdId) => {
      // Invalidate the RPD lists to refetch
      void queryClient.invalidateQueries({ queryKey: RPD_QUERY_KEYS.lists() });

      // Remove the specific RPD from the cache
      queryClient.removeQueries({ queryKey: RPD_QUERY_KEYS.detail(rpdId) });

      // 清理另一个RPD查询键前缀的缓存
      void queryClient.invalidateQueries({ queryKey: ['rpd'] });

      // 重要：也要invalidate Review Set的缓存，因为Review Set中可能包含已删除的RPD
      void queryClient.invalidateQueries({ queryKey: reviewSetsQueryKeys.all() });

      // 重要：也要invalidate RPD-Character关联的缓存，避免在Character页面显示"unknown RPD"
      void queryClient.invalidateQueries({ queryKey: ['rpdCharacterAssociations'] });

      toast({
        title: 'RPD Deleted',
        description: 'Review Point Definition has been successfully deleted.',
        variant: 'default',
      });
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Error Deleting RPD',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}
