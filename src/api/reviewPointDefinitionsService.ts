import type { AutofillRequest, AutofillResponse } from '../types/autofill';
import type {
  GenerateDescriptionRequest,
  GenerateDescriptionResponse,
  GenerateRPDContentRequest,
  GenerateRPDContentResponse,
  PromptRewriteRequest,
  PromptRewriteResponse,
  ReviewPointDefinitionCreate,
  ReviewPointDefinitionSchema,
  ReviewPointDefinitionVersionBase,
  ReviewPointDefinitionVersionInDB,
  Rpd,
  RPDStatusUpdate,
} from '../types/ReviewPointDefinition';
import type {
  RPDBatchTestRequest,
  RPDBatchTestResponse,
  RPDImageTestRequest,
  RPDImageTestResponse,
  RPDTestFileUploadResponse,
  RPDTestHistory,
  RPDTestRequest,
  RPDTestResponse,
} from '../types/rpdTest';
// import { apiClient } from './apiClient';
import { fetchApi } from './client';
import type { UrlPaths } from './helper';
// Removed: import { ReviewPointDefinition, ReviewPointDefinitionCreatePayload, ReviewPointDefinitionUpdatePayload } from '@/types/reviewPointDefinition';

const BASE_URL = '/api/v1/review-point-definitions'; // Adjusted BASE_URL

export const reviewPointDefinitionsService = {
  listReviewPointDefinitions: async (
    activeOnly?: boolean,
    projectId?: string,
  ): Promise<ReviewPointDefinitionSchema[]> => {
    const apiParams: Record<string, boolean | string> = {};

    if (typeof activeOnly === 'boolean') {
      // Use a computed property to set the snake_case key, satisfying linters
      // and ensuring the backend gets the correct parameter name.
      apiParams['active_only'] = activeOnly;
    }

    if (projectId) {
      apiParams['project_id'] = projectId;
    }

    const response = await fetchApi({
      url: `${BASE_URL}/` as UrlPaths, // Ensure trailing slash as per schema
      method: 'get',
      params: apiParams,
    });
    return response.data as ReviewPointDefinitionSchema[];
  },

  // Simplified function for AI review multi-select - returns only essential fields
  listForProject: async (projectId: string): Promise<Rpd[]> => {
    const response = await fetchApi({
      url: `${BASE_URL}/` as UrlPaths,
      method: 'get',
      params: { project_id: projectId, active_only: true },
    });

    // Transform the full schema to simplified Rpd type
    const fullRpds = response.data as ReviewPointDefinitionSchema[];
    return fullRpds.map((rpd) => ({
      id: rpd.id,
      key: rpd.key,
      title: rpd.current_version?.title || rpd.key, // Fallback to key if no title
    }));
  },

  getReviewPointDefinition: async (rpdId: string): Promise<ReviewPointDefinitionSchema> => {
    const response = await fetchApi({
      url: `${BASE_URL}/${rpdId}/` as UrlPaths, // Ensure trailing slash
      method: 'get',
    });
    return response.data as ReviewPointDefinitionSchema;
  },

  createReviewPointDefinition: async (data: ReviewPointDefinitionCreate): Promise<ReviewPointDefinitionSchema> => {
    const response = await fetchApi({
      url: `${BASE_URL}/` as UrlPaths, // Ensure trailing slash
      method: 'post',
      data,
    });
    return response.data as ReviewPointDefinitionSchema;
  },

  createReviewPointDefinitionVersion: async (
    rpdId: string,
    data: ReviewPointDefinitionVersionBase,
  ): Promise<ReviewPointDefinitionVersionInDB> => {
    const response = await fetchApi({
      url: `${BASE_URL}/${rpdId}/versions/` as UrlPaths, // Ensure trailing slash
      method: 'post',
      data,
    });
    return response.data as ReviewPointDefinitionVersionInDB;
  },

  updateRPDStatus: async (rpdId: string, data: RPDStatusUpdate): Promise<ReviewPointDefinitionSchema> => {
    const response = await fetchApi({
      url: `${BASE_URL}/${rpdId}/status/` as UrlPaths, // Ensure trailing slash
      method: 'patch',
      data,
    });
    return response.data as ReviewPointDefinitionSchema;
  },

  deleteReviewPointDefinition: async (rpdId: string): Promise<void> => {
    await fetchApi({
      url: `${BASE_URL}/${rpdId}/` as UrlPaths, // Ensure trailing slash
      method: 'delete',
    });
    // 204 No Content response, no return data
  },

  generateDescription: async (data: GenerateDescriptionRequest): Promise<GenerateDescriptionResponse> => {
    const response = await fetchApi({
      url: `${BASE_URL}/generate-description/` as UrlPaths,
      method: 'post',
      data,
    });
    return response.data as GenerateDescriptionResponse;
  },

  rewritePrompt: async (data: PromptRewriteRequest): Promise<PromptRewriteResponse> => {
    const response = await fetchApi({
      url: `${BASE_URL}/rewrite-prompt` as UrlPaths,
      method: 'post',
      data,
    });
    return response.data as PromptRewriteResponse;
  },

  generateRPDContent: async (data: GenerateRPDContentRequest): Promise<GenerateRPDContentResponse> => {
    const response = await fetchApi({
      url: `${BASE_URL}/generate-rpd-content` as UrlPaths,
      method: 'post',
      data,
    });
    return response.data as GenerateRPDContentResponse;
  },

  autofillTitle: async (data: AutofillRequest): Promise<AutofillResponse> => {
    const response = await fetchApi({
      url: `${BASE_URL}/autofill-title` as UrlPaths,
      method: 'post',
      data,
    });
    return response.data as AutofillResponse;
  },

  // RPD测试相关方法

  /**
   * 执行单个RPD测试
   * 支持文本、图片和文档的测试
   */
  testRPD: async (data: RPDTestRequest): Promise<RPDTestResponse> => {
    const response = await fetchApi({
      url: `${BASE_URL}/test` as UrlPaths,
      method: 'post',
      data,
    });
    return response.data as RPDTestResponse;
  },

  /**
   * 批量执行RPD测试
   * 用于测试多个用例
   */
  batchTestRPD: async (data: RPDBatchTestRequest): Promise<RPDBatchTestResponse> => {
    const response = await fetchApi({
      url: `${BASE_URL}/batch-test` as UrlPaths,
      method: 'post',
      data,
    });
    return response.data as RPDBatchTestResponse;
  },

  /**
   * 上传测试文件（用于图片和文档测试）
   * 返回临时文件URL供测试使用
   */
  uploadTestFile: async (file: File, projectId: string): Promise<RPDTestFileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId);

    const response = await fetchApi({
      url: `${BASE_URL}/test/upload-file` as UrlPaths,
      method: 'post',
      data: formData,
      // Axios 会自动为 FormData 设置 Content-Type 为 multipart/form-data
    });
    return response.data as RPDTestFileUploadResponse;
  },

  /**
   * 获取RPD测试历史记录
   * 用于查看之前的测试结果
   */
  getTestHistory: async (projectId: string, rpdKey?: string, limit?: number): Promise<RPDTestHistory[]> => {
    const params: Record<string, string | number> = { project_id: projectId };
    if (rpdKey) {
      params.rpd_key = rpdKey;
    }
    if (limit) {
      params.limit = limit;
    }

    const response = await fetchApi({
      url: `${BASE_URL}/test/history` as UrlPaths,
      method: 'get',
      params,
    });
    return response.data as RPDTestHistory[];
  },

  /**
   * 直接使用图片文件测试RPD
   * 支持传入RPD配置数据和图片文件进行测试
   */
  testRPDWithImage: async (imageFile: File, rpdData: RPDImageTestRequest): Promise<RPDImageTestResponse> => {
    const formData = new FormData();

    // 添加图片文件
    formData.append('image_file', imageFile);

    // 添加RPD配置数据
    formData.append('rpd_title', rpdData.rpd_title);
    formData.append('rpd_parent_key', rpdData.rpd_parent_key);

    if (rpdData.rpd_description_for_ai) {
      formData.append('rpd_description_for_ai', rpdData.rpd_description_for_ai);
    }
    // rpd_eng_description_for_ai: Deprecated, using rpd_description_for_ai instead
    if (rpdData.rpd_tag_list) {
      formData.append('rpd_tag_list', rpdData.rpd_tag_list);
    }
    if (rpdData.rpd_reference_images) {
      formData.append('rpd_reference_images', rpdData.rpd_reference_images);
    }

    // 测试配置
    formData.append('mode', rpdData.mode || 'quality');
    formData.append('cr_check', String(rpdData.cr_check || false));

    const response = await fetchApi({
      url: `${BASE_URL}/test-rpd-with-image` as UrlPaths,
      method: 'post',
      data: formData,
      // Axios 会自动为 FormData 设置 Content-Type 为 multipart/form-data
    });
    return response.data as RPDImageTestResponse;
  },

  /**
   * 获取单个测试结果的详细信息
   */
  getTestResult: async (testId: string): Promise<RPDTestResponse> => {
    const response = await fetchApi({
      url: `${BASE_URL}/test/${testId}` as UrlPaths,
      method: 'get',
    });
    return response.data as RPDTestResponse;
  },

  // 称呼表相关API
  uploadAppellationFile: async (
    file: File,
    projectId: string,
    sessionId?: string,
  ): Promise<AppellationUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId);
    if (sessionId) {
      formData.append('session_id', sessionId);
    }

    const response = await fetchApi({
      url: `${BASE_URL}/upload-appellation-file/` as UrlPaths,
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data as AppellationUploadResponse;
  },

  getAppellationData: async (s3Url: string): Promise<AppellationDataResponse> => {
    const response = await fetchApi({
      url: `${BASE_URL}/appellation-data/?s3_url=${encodeURIComponent(s3Url)}` as UrlPaths,
      method: 'get',
    });
    return response.data as AppellationDataResponse;
  },

  /**
   * 使用文本对话测试text review RPD
   * 支持称呼表和特殊规则的检查
   */
  testRPDWithText: async (data: TextRPDTestRequest): Promise<TextRPDTestResponse> => {
    const response = await fetchApi({
      url: `${BASE_URL}/test-rpd-with-text` as UrlPaths,
      method: 'post',
      data,
    });
    return response.data as TextRPDTestResponse;
  },

  // Removed duplicated/problematic getAll and getGlobalReviewPointDefinitions functions
};

// 称呼表相关类型定义
export interface AppellationUploadResponse {
  success: boolean;
  message: string;
  s3_url: string;
  file_type: string;
  characters: string[];
  character_count: number;
  total_appellations: number;
  validation_warnings: string[];
}

export interface AppellationDataResponse {
  success: boolean;
  message: string;
  data: Record<string, Record<string, string>>;
  characters: string[];
  character_count: number;
}

// Text Review 测试相关类型定义
export interface TextRPDTestRequest {
  dialogue_text: string;
  rpd_title: string;
  appellation_file_s3_url: string;
  special_rules?: Array<{
    speaker: string;
    target: string;
    alias: string;
    conditions: string[];
  }>;
  project_id: string;
}

export interface TextRPDTestResponse {
  success: boolean;
  message: string;
  analysis: string;
  processing_time_seconds?: number;
  rpd_title: string;
  detected_speaker?: string;
  detected_targets: string[];
}
