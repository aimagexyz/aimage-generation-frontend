import { useMutation, useQueryClient } from '@tanstack/react-query';

import { aiReviewsService } from '@/api/aiReviewsService';
import { toast } from '@/components/ui/use-toast';
import type { FindingFixedStatusUpdate } from '@/types/AiReviewFinding';

interface UpdateFindingFixedStatusParams {
  findingId: string;
  data: FindingFixedStatusUpdate;
}

const mutationFn = async ({ findingId, data }: UpdateFindingFixedStatusParams) => {
  return await aiReviewsService.updateFindingFixedStatus(findingId, data);
};

export function useUpdateFindingFixedStatus() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn,
    onSuccess: async (response: { finding_id: string; is_fixed: boolean }) => {
      // 刷新相关缓存
      await queryClient.invalidateQueries({ queryKey: ['latestAiReview'] });
      await queryClient.invalidateQueries({ queryKey: ['aiReview'] });
      await queryClient.invalidateQueries({ queryKey: ['aiReviewHistory'] });

      toast({
        title: response.is_fixed ? '保留としてマーク' : '保留を解除',
        description: response.is_fixed ? 'この指摘は保留されました。' : 'この指摘の保留が解除されました。',
        duration: 2000,
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to update finding fixed status:', errorMessage);

      toast({
        title: 'エラー',
        description: '保留状態の更新に失敗しました。',
        variant: 'destructive',
        duration: 3000,
      });
    },
  });

  const updateFixedStatus = async (findingId: string, isFixed: boolean) => {
    try {
      await mutation.mutateAsync({ findingId, data: { is_fixed: isFixed } });
      return true;
    } catch (error) {
      console.error('Failed to update finding fixed status:', error);
      return false;
    }
  };

  const isUpdating = () => {
    return mutation.isPending;
  };

  return {
    updateFixedStatus,
    isUpdating,
  };
}
