/**
 * 资产相关的类型定义
 */

// 图片上传响应
export interface AssetResponse {
  url: string;
}

// 图片描述生成请求
export interface GenerateImageDescriptionRequest {
  image_url: string;
  context?: string | null;
  rpd_type: string;
  rpd_title: string;
}

// 图片描述生成响应
export interface GenerateImageDescriptionResponse {
  detailed_description: string;
  key_elements: string[];
  style_analysis: string;
  suggested_keywords: string[];
  confidence: number;
}

// 图片描述状态
export type ImageDescriptionStatus = 'idle' | 'uploading' | 'generating' | 'completed' | 'error';

// 图片描述完整状态
export interface ImageDescriptionState {
  status: ImageDescriptionStatus;
  description?: GenerateImageDescriptionResponse;
  error?: string;
}

// 图片上传进度回调
export interface ImageUploadProgressCallback {
  (progress: number): void;
}

// 上传文件信息
export interface UploadFileInfo {
  file: File;
  preview: string; // blob URL for preview
  id: string; // unique identifier
  status: ImageDescriptionStatus;
  description?: GenerateImageDescriptionResponse;
  error?: string;
  s3Url?: string; // S3 URL after upload
  isTemporary?: boolean; // 是否为临时文件
  sessionId?: string; // 所属会话ID（临时文件）
}

// 临时文件提升响应
export interface PromoteTempImagesResponse {
  movedFiles: string[];
  errors: string[];
}

// 会话清理响应
export interface CleanupSessionResponse {
  deletedFiles: number;
  errors: string[];
}
