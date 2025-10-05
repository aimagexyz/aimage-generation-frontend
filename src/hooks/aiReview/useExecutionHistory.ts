import { useQuery } from '@tanstack/react-query';

import { aiReviewsService, type ExecutionHistoryResponse } from '@/api/aiReviewsService';

interface UseExecutionHistoryProps {
  subtaskId: string;
  enabled?: boolean;
}

export const useExecutionHistory = ({ subtaskId, enabled = true }: UseExecutionHistoryProps) => {
  return useQuery<ExecutionHistoryResponse>({
    queryKey: ['executionHistory', subtaskId],
    queryFn: () => aiReviewsService.getExecutionHistory(subtaskId),
    enabled: enabled && !!subtaskId,
    staleTime: 5 * 60 * 1000, // 5分钟内不重复请求
    refetchOnWindowFocus: false,
    retry: false, // 如果没有执行历史记录，不要重试
  });
};
