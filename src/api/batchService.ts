import { UrlPaths } from '@/api/helper';
import type {
  BatchProcessingRecord,
  BatchProcessingStats,
  BatchProcessingStatus,
  BatchProcessingType,
} from '@/types/batchResults';

import { fetchApi } from './client';

const BASE_URL = '/api/v1/batch';

// 后端批处理任务列表项的类型定义
interface BatchProcessJobListItem {
  id: string;
  batch_id: string;
  job_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  total_items: number;
  successful_items: number;
  failed_items: number;
  duration_seconds: number | null;
  initiated_by_user_name: string | null;
  initiated_by_user_email: string | null;
}

export const batchService = {
  // 获取批处理统计信息
  getStats: async (projectId?: string): Promise<BatchProcessingStats> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await fetchApi({
      url: `${BASE_URL}/stats` as UrlPaths,
      method: 'get',
      params,
    });
    return response.data as BatchProcessingStats;
  },

  // 获取批处理任务详细信息
  getDetail: async (jobId: string): Promise<BatchProcessingRecord> => {
    const response = await fetchApi({
      url: `${BASE_URL}/${jobId}/detail` as UrlPaths,
      method: 'get',
    });
    return response.data as BatchProcessingRecord;
  },

  // 获取批处理任务列表
  getList: async (projectId?: string): Promise<BatchProcessingRecord[]> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await fetchApi({
      url: BASE_URL as UrlPaths,
      method: 'get',
      params,
    });

    // 后端现在返回简化的数据结构，映射到完整的Record类型（为列表不需要的字段提供默认值）
    const jobs = response.data as BatchProcessJobListItem[];

    return jobs.map(
      (job): BatchProcessingRecord => ({
        id: job.id,
        batch_id: job.batch_id,
        project_id: null, // 列表中不需要项目ID
        processing_type: mapJobTypeToProcessingType(job.job_type),
        status: mapJobStatusToProcessingStatus(job.status),
        initiated_by_user_id: null, // 列表中不需要用户ID
        initiated_by_user_name: job.initiated_by_user_name,
        initiated_by_user_email: job.initiated_by_user_email,
        total_tasks: job.total_items,
        successful_tasks: job.successful_items,
        failed_tasks: job.failed_items,
        skipped_tasks: Math.max(0, job.total_items - job.successful_items - job.failed_items),
        total_processing_time_seconds: job.duration_seconds || 0,
        created_at: job.created_at,
        updated_at: job.created_at, // 使用创建时间作为更新时间
        completed_at: job.completed_at || undefined,
        task_results: [], // 列表中不需要详细任务结果
        error_summary: undefined, // 列表中不需要错误摘要
      }),
    );
  },
};

// 辅助函数：映射任务类型
function mapJobTypeToProcessingType(jobType: string): BatchProcessingType {
  const mapping: Record<string, BatchProcessingType> = {
    ai_review_cr_check: 'copyright_check',
    scenario_check: 'scenario_check',
    image_analysis: 'image_analysis',
    content_review: 'content_review',
  };
  return mapping[jobType] || 'copyright_check'; // 提供默认值
}

// 辅助函数：映射状态
function mapJobStatusToProcessingStatus(status: string): BatchProcessingStatus {
  const mapping: Record<string, BatchProcessingStatus> = {
    pending: 'pending',
    running: 'running',
    completed: 'completed',
    failed: 'failed',
    cancelled: 'failed',
  };
  return mapping[status] || 'pending'; // 提供默认值
}
