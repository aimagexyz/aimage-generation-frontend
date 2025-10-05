import type { AiReviewInDB, AiReviewMode, AiReviewProcessingStatus, AiReviewSchema } from '../types/aiReview';
import type { AiReviewFindingHumanCreate, FindingFixedStatusUpdate } from '../types/AiReviewFinding';
import { fetchApi } from './client';
import type { UrlPaths } from './helper';

// Local type definition for batch AI review initiation
export interface BatchInitiateAiReviewRequest {
  project_id: string;
  task_ids: string[];
}

// Type definition for custom batch AI review initiation
export interface BatchInitiateCustomAiReviewRequest {
  project_id: string;
  task_ids: string[];
  rpd_ids?: string[];
  review_set_ids?: string[];
  mode?: 'quality' | 'speed';
}

// Type definition for batch AI review response
export interface BatchInitiateCustomAiReviewResponse {
  message: string;
  batch_id: string;
  subtask_count: number;
  max_concurrent: number;
  mode: string;
  rpd_count: number;
  review_set_count: number;
}

// Type definition for latest executed RPD
export interface LatestExecutedRPD {
  rpd_key: string;
  rpd_title: string;
  version_number: number;
  executed_at: string;
  ai_review_version: number;
  finding_count: number;
}

// Type definition for latest executed RPDs response
export interface LatestExecutedRPDsResponse {
  ai_review_version: number | null;
  executed_at: string | null;
  executed_rpds: LatestExecutedRPD[];
  total_findings: number;
}

// Type definition for execution history RPD detail
export interface ExecutionHistoryRPDDetail {
  id: string;
  title: string;
  version_number: number;
  review_point_definition: {
    id: string;
    key: string;
    is_active: boolean;
  };
  is_active_version: boolean;
  created_at: string;
}

// Type definition for execution history response
export interface ExecutionHistoryResponse {
  execution_history_id: string;
  ai_review_id: string;
  ai_review_version: number;
  executed_by_user?: {
    id: string;
    display_name: string;
  } | null;
  executed_rpd_version_ids: string[];
  execution_parameters: {
    mode: string;
    cr_check: boolean;
    rpd_ids?: string[] | null;
    content_type?: string | null;
    subtask_id: string;
  };
  execution_summary: {
    total_rpd_versions: number;
    rpd_version_details: Array<{
      id: string;
      title: string;
      parent_key: string;
      version_number: number;
    }>;
    total_findings?: number;
  };
  execution_status: string;
  execution_started_at?: string | null;
  execution_completed_at?: string | null;
  error_message?: string | null;
  created_at: string;
  rpd_details: ExecutionHistoryRPDDetail[];
}

const BASE_URL = '/api/v1/ai-reviews';

export const aiReviewsService = {
  initiateAiReview: async (
    subtaskId: string,
    mode: AiReviewMode = 'quality',
    rpdIds?: string[],
  ): Promise<AiReviewInDB> => {
    const response = await fetchApi({
      url: `${BASE_URL}/subtasks/${subtaskId}/initiate?mode=${mode}` as UrlPaths,
      method: 'post',
      data: rpdIds ? { rpd_ids: rpdIds } : undefined,
    });
    return response.data as AiReviewInDB;
  },

  // 新增：检查AI review处理状态
  checkProcessingStatus: async (subtaskId: string): Promise<AiReviewProcessingStatus> => {
    const response = await fetchApi({
      url: `${BASE_URL}/subtasks/${subtaskId}/processing-status` as UrlPaths,
      method: 'get',
    });

    return response.data as AiReviewProcessingStatus;
  },

  // 新增：中断AI review处理
  interruptAiReview: async (subtaskId: string): Promise<{ message: string; status: string; subtask_id: string }> => {
    const response = await fetchApi({
      url: `${BASE_URL}/subtasks/${subtaskId}/interrupt` as UrlPaths,
      method: 'post',
    });

    return response.data as { message: string; status: string; subtask_id: string };
  },

  getAiReview: async (aiReviewId: string): Promise<AiReviewSchema> => {
    const response = await fetchApi({
      url: `${BASE_URL}/${aiReviewId}` as UrlPaths,
      method: 'get',
    });
    return response.data as AiReviewSchema;
  },

  getLatestAiReviewForSubtask: async (subtaskId: string): Promise<AiReviewSchema> => {
    const response = await fetchApi({
      url: `${BASE_URL}/subtasks/${subtaskId}/findings-summary` as UrlPaths,
      method: 'get',
    });
    return response.data as AiReviewSchema;
  },

  listAiReviewsForSubtask: async (subtaskId: string): Promise<AiReviewSchema[]> => {
    const response = await fetchApi({
      url: `${BASE_URL}/subtasks/${subtaskId}/all` as UrlPaths,
      method: 'get',
    });
    return response.data as AiReviewSchema[];
  },

  addHumanFindingToReview: async (aiReviewId: string, data: AiReviewFindingHumanCreate): Promise<AiReviewSchema> => {
    const response = await fetchApi({
      url: `${BASE_URL}/${aiReviewId}/human-findings` as UrlPaths,
      method: 'post',
      data,
    });
    return response.data as AiReviewSchema;
  },

  // New function for reviewing a specific viewpoint
  reviewViewpointForSubtask: async (
    subtaskId: string,
    viewpointKey: string, // Assuming viewpointKey is a string for now, adjust if needed
    // Add any specific data payload if this endpoint expects one
  ): Promise<AiReviewInDB> => {
    const response = await fetchApi({
      url: `${BASE_URL}/subtasks/${subtaskId}/review-viewpoint/${viewpointKey}` as UrlPaths,
      method: 'post',
    });
    return response.data as AiReviewInDB;
  },

  // New function for batch AI review initiation
  initiateBatchAiReview: async (data: BatchInitiateAiReviewRequest): Promise<void> => {
    await fetchApi({
      url: `${BASE_URL}/batch/cr-check/initiate` as UrlPaths,
      method: 'post',
      data,
    });
  },

  // New function for custom batch AI review initiation with RPDs
  initiateBatchCustomAiReview: async (
    data: BatchInitiateCustomAiReviewRequest,
  ): Promise<BatchInitiateCustomAiReviewResponse> => {
    const response = await fetchApi({
      url: `${BASE_URL}/batch/initiate` as UrlPaths,
      method: 'post',
      data,
    });
    return response.data as BatchInitiateCustomAiReviewResponse;
  },

  // Update finding fixed status
  updateFindingFixedStatus: async (
    findingId: string,
    data: FindingFixedStatusUpdate,
  ): Promise<{ finding_id: string; is_fixed: boolean }> => {
    const response = await fetchApi({
      url: `${BASE_URL}/findings/${findingId}/fixed-status` as UrlPaths,
      method: 'patch',
      data,
    });
    return response.data as { finding_id: string; is_fixed: boolean };
  },

  // Update finding content
  updateFindingContent: async (
    findingId: string,
    data: {
      description?: string | null;
      severity?: 'risk' | 'alert' | 'safe' | 'high' | 'medium' | 'low' | null;
      suggestion?: string | null;
    },
  ): Promise<{
    finding_id: string;
    description: string;
    severity: string;
    suggestion?: string;
    updated_at: string;
  }> => {
    const response = await fetchApi({
      url: `${BASE_URL}/findings/${findingId}/content` as UrlPaths,
      method: 'patch',
      data,
    });
    return response.data as {
      finding_id: string;
      description: string;
      severity: string;
      suggestion?: string;
      updated_at: string;
    };
  },

  // Get latest executed RPDs for a subtask
  getLatestExecutedRPDs: async (subtaskId: string): Promise<LatestExecutedRPDsResponse> => {
    const response = await fetchApi({
      url: `${BASE_URL}/subtasks/${subtaskId}/latest-executed-rpds` as UrlPaths,
      method: 'GET',
    });

    return response.data as LatestExecutedRPDsResponse;
  },

  // Get execution history for a subtask
  getExecutionHistory: async (subtaskId: string): Promise<ExecutionHistoryResponse> => {
    const response = await fetchApi({
      url: `${BASE_URL}/subtasks/${subtaskId}/execution-history` as UrlPaths,
      method: 'GET',
    });

    return response.data as ExecutionHistoryResponse;
  },

  // Update finding bounding box
  updateFindingBoundingBox: async (
    findingId: string,
    data: { area: { x: number; y: number; width: number; height: number } },
  ): Promise<{
    finding_id: string;
    area: { x: number; y: number; width: number; height: number };
    updated_at: string;
  }> => {
    // Ensure all coordinates are integers as required by backend
    const requestData = {
      area: {
        x: Math.round(data.area.x),
        y: Math.round(data.area.y),
        width: Math.round(data.area.width),
        height: Math.round(data.area.height),
      },
    };

    const response = await fetchApi({
      url: `${BASE_URL}/findings/${findingId}/bounding-box` as UrlPaths,
      method: 'patch',
      data: requestData,
    });

    return response.data as {
      finding_id: string;
      area: { x: number; y: number; width: number; height: number };
      updated_at: string;
    };
  },

  // Batch update finding bounding boxes
  //   batchUpdateFindingBoundingBoxes: async (data: {
  //     updates: Array<{
  //       finding_id: string;
  //       area: { x: number; y: number; width: number; height: number };
  //     }>;
  //   }): Promise<{
  //     updated_count: number;
  //     errors?: Array<{ finding_id: string; error: string }>;
  //   }> => {
  //     // Ensure all coordinates are integers as required by backend
  //     const requestData = {
  //       updates: data.updates.map((update) => ({
  //         finding_id: update.finding_id,
  //         area: {
  //           x: Math.round(update.area.x),
  //           y: Math.round(update.area.y),
  //           width: Math.round(update.area.width),
  //           height: Math.round(update.area.height),
  //         },
  //       })),
  //     };

  //     const response = await fetchApi({
  //       url: `${BASE_URL}/findings/bounding-boxes/batch` as UrlPaths,
  //       method: 'patch',
  //       data: requestData,
  //     });
  //     return response.data as {
  //       updated_count: number;
  //       errors?: Array<{ finding_id: string; error: string }>;
  //     };
  //   },
};
