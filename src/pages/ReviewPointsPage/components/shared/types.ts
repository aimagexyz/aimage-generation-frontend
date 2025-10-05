import type { GenerateImageDescriptionResponse, ImageDescriptionStatus } from '@/types/assets';

// 图片信息接口
export interface ImageInfo {
  id: string;
  file: File;
  preview?: string; // blob URL for preview (新上传的图片)
  s3Url?: string; // S3 URL after upload
  s3Path?: string; // S3 path for existing images
  status: ImageDescriptionStatus;
  description?: GenerateImageDescriptionResponse;
  error?: string;
  isExisting?: boolean; // 标记是否为现有图片
}

// 称呼表文件信息接口
export interface AppellationFileInfo {
  id: string;
  file: File;
  name: string;
  type: 'excel' | 'json';
  status: 'uploading' | 'completed' | 'error';
  s3Url?: string;
  error?: string;
}

// 特殊规则接口
export interface SpecialRule {
  speaker: string;
  target: string;
  alias: string;
  conditions: string[];
}

// RPD测试结果接口
export interface RPDTestResult {
  success: boolean;
  rpd_title?: string;
  rpd_type?: string;
  findings_count?: number;
  findings?: Array<{
    severity: string;
    description: string;
    suggestion?: string;
    tag?: string;
    area?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  message?: string;
}

// 消息类型定义
export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  fileInfo?: {
    name: string;
    type: 'image' | 'document';
    preview?: string; // 用于图片预览的URL
    size: number;
  };
  isLoading?: boolean; // AI回复是否在加载中
}

// NG子分类类型
export type NGSubcategoryType = 'concrete_shape' | 'abstract_type' | null;
