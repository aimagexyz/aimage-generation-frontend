import { useQuery } from '@tanstack/react-query';

import { recommendationsService, type TaskReviewSetRecommendationsResponse } from '@/api/recommendationsService';

export function useTaskRecommendations(
  taskId: string,
  projectId: string,
  minScore: number = 0.0,
  enabled: boolean = true,
) {
  return useQuery<TaskReviewSetRecommendationsResponse>({
    queryKey: ['task-recommendations', taskId, projectId, minScore],
    queryFn: () => recommendationsService.getTaskReviewSetRecommendations(taskId, projectId, minScore),
    enabled: enabled && !!taskId && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
