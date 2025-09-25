import { useQuery } from '@tanstack/react-query';

import { batchService } from '@/api/batchService';
import type { BatchProcessingRecord, BatchProcessingStats } from '@/types/batchResults';

// 获取批处理统计信息的hook
export function useBatchStats(projectId?: string) {
  return useQuery<BatchProcessingStats>({
    queryKey: ['batch', 'stats', projectId],
    queryFn: () => batchService.getStats(projectId),
    refetchInterval: 30000, // 每30秒刷新一次
  });
}

// 获取批处理任务列表的hook
export function useBatchList(projectId?: string) {
  return useQuery<BatchProcessingRecord[]>({
    queryKey: ['batch', 'list', projectId],
    queryFn: () => batchService.getList(projectId),
    refetchInterval: 10000, // 每10秒刷新一次
  });
}

// 获取批处理任务详细信息的hook
export function useBatchDetail(jobId: string | null) {
  return useQuery<BatchProcessingRecord>({
    queryKey: ['batch', 'detail', jobId],
    queryFn: () => batchService.getDetail(jobId!),
    enabled: !!jobId, // 只有当jobId存在时才执行查询
  });
}
