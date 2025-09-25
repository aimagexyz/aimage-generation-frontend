import { useQuery } from '@tanstack/react-query';

import { getTaskThumbnails } from '@/api/tasks';

interface UseTaskThumbnailsOptions {
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook for fetching task thumbnails (first few image subtasks)
 * @param taskId The ID of the task
 * @param options Options for the query
 * @returns Query result with thumbnails data
 */
export function useTaskThumbnails(taskId: string, options?: UseTaskThumbnailsOptions) {
  const { limit = 3, enabled = true } = options || {};

  return useQuery({
    queryKey: ['task-thumbnails', taskId, limit],
    queryFn: () => getTaskThumbnails(taskId, limit),
    enabled: enabled && !!taskId,
    staleTime: 1000 * 60 * 5, // 5分钟内不重新获取
    gcTime: 1000 * 60 * 30, // 30分钟垃圾回收
    refetchOnWindowFocus: false, // 窗口焦点变化时不重新获取
  });
}
