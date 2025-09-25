import type {
  AssetResponse,
  GenerateImageDescriptionRequest,
  GenerateImageDescriptionResponse,
  ImageUploadProgressCallback,
} from '../types/assets';
import { fetchApi } from './client';
import type { UrlPaths } from './helper';

const ASSETS_BASE_URL = '/api/v1/assets';
const RPD_BASE_URL = '/api/v1/review-point-definitions';

export const assetsService = {
  /**
   * 上传临时图片到S3（带有TTL自动清理）
   * @param file 要上传的文件
   * @param sessionId 会话ID
   * @param onProgress 上传进度回调（可选）
   * @returns Promise<AssetResponse> 包含S3 URL的响应
   */
  uploadTempImage: async (
    file: File,
    sessionId: string,
    onProgress?: ImageUploadProgressCallback,
  ): Promise<AssetResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);

    try {
      const response = await fetchApi({
        url: `${ASSETS_BASE_URL}/temp-images` as UrlPaths,
        method: 'post',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: onProgress
          ? (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
              }
            }
          : undefined,
      });

      return response.data as AssetResponse;
    } catch (error) {
      console.error('Failed to upload temp image:', error);
      throw new Error(`临时图片上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  /**
   * 清理临时会话的所有文件
   * @param sessionId 会话ID
   * @returns Promise<void>
   */
  cleanupTempSession: async (sessionId: string): Promise<void> => {
    try {
      await fetchApi({
        url: `${ASSETS_BASE_URL}/temp-sessions/${sessionId}` as UrlPaths,
        method: 'delete',
      });
    } catch (error) {
      console.error(`Failed to cleanup temp session ${sessionId}:`, error);
      throw new Error(`临时会话清理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  /**
   * 将临时图片提升为正式项目文件
   * @param sessionId 会话ID
   * @param projectId 项目ID
   * @returns Promise<{movedFiles: string[], errors: string[]}> 移动结果
   */
  promoteTempImages: async (
    sessionId: string,
    projectId: string,
  ): Promise<{
    movedFiles: string[];
    errors: string[];
  }> => {
    try {
      const response = await fetchApi({
        url: `${ASSETS_BASE_URL}/temp-sessions/${sessionId}/promote` as UrlPaths,
        method: 'post',
        data: {
          project_id: projectId,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data as {
        movedFiles: string[];
        errors: string[];
      };
    } catch (error) {
      console.error(`Failed to promote temp images from session ${sessionId}:`, error);
      throw new Error(`临时图片提升失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },
  /**
   * 上传图片到S3
   * @param file 要上传的文件
   * @param onProgress 上传进度回调（可选）
   * @returns Promise<AssetResponse> 包含S3 URL的响应
   */
  uploadImage: async (file: File, onProgress?: ImageUploadProgressCallback): Promise<AssetResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetchApi({
        url: `${ASSETS_BASE_URL}/images` as UrlPaths,
        method: 'post',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: onProgress
          ? (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
              }
            }
          : undefined,
      });

      return response.data as AssetResponse;
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw new Error(`图片上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  /**
   * 批量上传图片
   * @param files 要上传的文件数组
   * @param onProgress 单个文件上传进度回调（可选）
   * @returns Promise<AssetResponse[]> 包含所有上传结果
   */
  uploadMultipleImages: async (
    files: File[],
    onProgress?: (fileIndex: number, progress: number) => void,
  ): Promise<AssetResponse[]> => {
    const uploadPromises = files.map((file, index) =>
      assetsService.uploadImage(file, onProgress ? (progress) => onProgress(index, progress) : undefined),
    );

    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Failed to upload multiple images:', error);
      throw new Error(`批量图片上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  /**
   * 生成图片详细描述
   * @param request 图片描述生成请求
   * @returns Promise<GenerateImageDescriptionResponse> 图片描述响应
   */
  generateImageDescription: async (
    request: GenerateImageDescriptionRequest,
  ): Promise<GenerateImageDescriptionResponse> => {
    try {
      if (!request.image_url?.trim()) {
        throw new Error('图片URL不能为空');
      }

      const response = await fetchApi({
        url: `${RPD_BASE_URL}/generate-image-description` as UrlPaths,
        method: 'post',
        data: request,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data as GenerateImageDescriptionResponse;
    } catch (error) {
      console.error('Failed to generate image description:', error);
      throw new Error(`图片描述生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  /**
   * 批量生成图片描述
   * @param requests 图片描述生成请求数组
   * @returns Promise<GenerateImageDescriptionResponse[]> 图片描述响应数组
   */
  generateMultipleImageDescriptions: async (
    requests: GenerateImageDescriptionRequest[],
  ): Promise<GenerateImageDescriptionResponse[]> => {
    const descriptionPromises = requests.map((request) => assetsService.generateImageDescription(request));

    try {
      return await Promise.all(descriptionPromises);
    } catch (error) {
      console.error('Failed to generate multiple image descriptions:', error);
      throw new Error(`批量图片描述生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  /**
   * 完整的图片处理流程：上传 + 生成描述
   * @param file 要处理的文件
   * @param context 可选的上下文信息
   * @param type RPD类型
   * @param onUploadProgress 上传进度回调
   * @returns Promise<{s3Url: string, description: GenerateImageDescriptionResponse}>
   */
  uploadAndGenerateDescription: async (
    file: File,
    context?: string,
    rpd_type: string = 'general_ng_review',
    rpd_title: string = '',
    onUploadProgress?: ImageUploadProgressCallback,
  ): Promise<{
    s3Url: string;
    description: GenerateImageDescriptionResponse;
  }> => {
    try {
      // 第一步：上传图片
      const uploadResult = await assetsService.uploadImage(file, onUploadProgress);

      // 第二步：生成描述
      const descriptionResult = await assetsService.generateImageDescription({
        image_url: uploadResult.url,
        context,
        rpd_type,
        rpd_title,
      });

      return {
        s3Url: uploadResult.url,
        description: descriptionResult,
      };
    } catch (error) {
      console.error('Failed to upload and generate description:', error);
      throw error; // 重新抛出原始错误，让调用者处理
    }
  },

  /**
   * 临时存储的完整图片处理流程：上传到临时位置 + 生成描述
   * @param file 要处理的文件
   * @param sessionId 会话ID
   * @param context 可选的上下文信息
   * @param rpd_type RPD类型
   * @param rpd_title RPD标题
   * @param onUploadProgress 上传进度回调
   * @returns Promise<{s3Url: string, description: GenerateImageDescriptionResponse}>
   */
  uploadTempAndGenerateDescription: async (
    file: File,
    sessionId: string,
    context?: string,
    rpd_type: string = 'general_ng_review',
    rpd_title: string = '',
    onUploadProgress?: ImageUploadProgressCallback,
  ): Promise<{
    s3Url: string;
    description: GenerateImageDescriptionResponse;
  }> => {
    try {
      // 第一步：上传到临时位置
      const uploadResult = await assetsService.uploadTempImage(file, sessionId, onUploadProgress);

      // 第二步：生成描述
      const descriptionResult = await assetsService.generateImageDescription({
        image_url: uploadResult.url,
        context,
        rpd_type,
        rpd_title,
      });

      return {
        s3Url: uploadResult.url,
        description: descriptionResult,
      };
    } catch (error) {
      console.error('Failed to upload temp and generate description:', error);
      throw error; // 重新抛出原始错误，让调用者处理
    }
  },

  /**
   * 批量处理图片：上传 + 生成描述
   * @param files 要处理的文件数组
   * @param context 可选的上下文信息
   * @param rpd_type RPD类型
   * @param rpd_title RPD标题
   * @param onProgress 进度回调 (completedCount, totalCount) => void
   * @returns Promise<Array<{s3Url: string, description: GenerateImageDescriptionResponse}>>
   */
  batchUploadAndGenerateDescriptions: async (
    files: File[],
    context?: string,
    rpd_type: string = 'general_ng_review',
    rpd_title: string = '',
    onProgress?: (completedCount: number, totalCount: number) => void,
  ): Promise<
    Array<{
      s3Url: string;
      description: GenerateImageDescriptionResponse;
    }>
  > => {
    const results: Array<{
      s3Url: string;
      description: GenerateImageDescriptionResponse;
    }> = [];

    let completedCount = 0;

    // 序列处理以避免过多并发请求
    for (const file of files) {
      try {
        const result = await assetsService.uploadAndGenerateDescription(file, context, rpd_type, rpd_title);
        results.push(result);
        completedCount++;

        if (onProgress) {
          onProgress(completedCount, files.length);
        }
      } catch (error) {
        console.error(`Failed to process file ${file.name}:`, error);
        // 继续处理其他文件，但记录错误
        throw error; // 或者你可以选择继续处理其他文件
      }
    }

    return results;
  },
};
