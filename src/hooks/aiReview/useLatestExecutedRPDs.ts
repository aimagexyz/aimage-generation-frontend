import { useQuery } from '@tanstack/react-query';

import { aiReviewsService, type LatestExecutedRPDsResponse } from '@/api/aiReviewsService';

interface UseLatestExecutedRPDsProps {
  subtaskId: string;
  enabled?: boolean;
}

export const useLatestExecutedRPDs = ({ subtaskId, enabled = true }: UseLatestExecutedRPDsProps) => {
  return useQuery<LatestExecutedRPDsResponse>({
    queryKey: ['latestExecutedRPDs', subtaskId],
    queryFn: () => aiReviewsService.getLatestExecutedRPDs(subtaskId),
    enabled: enabled && !!subtaskId,
    staleTime: 5 * 60 * 1000, // 5分钟内不重复请求
    refetchOnWindowFocus: false,
  });
};
