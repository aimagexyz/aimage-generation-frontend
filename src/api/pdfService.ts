import { fetchApi } from './client';
import type { UrlPaths } from './helper';

export interface PDFImageInfo {
  filename: string;
  original_filename: string;
  page: number;
  index: number;
  size_bytes: number;
  format: string;
  hash: string;
  dimensions: string;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  thumbnail_url: string;
  candidates_tried: string[];
  thumbnail_size_bytes: number;
}

export interface PDFExtractionPreviewResponse {
  session_id: string;
  total_pages: number;
  total_images_found: number;
  images_extracted: number;
  duplicates_skipped: number;
  small_images_skipped: number;
  errors: string[];
  extracted_images: PDFImageInfo[];
}

export interface ConfirmExtractionRequest {
  selected_images: string[];
  project_id?: string;
}

export interface ConfirmExtractionResponse {
  moved_files: string[];
  errors: string[];
  pdf_id: string;
  extracted_items_count: number;
}

export interface CleanupSessionResponse {
  session_id: string;
  deleted_count: number;
  deleted_files: string[];
  message: string;
}

export interface ExtractPreviewOptions {
  thumbnail_size?: number;
  min_size?: number;
  skip_duplicates?: boolean;
}

/**
 * PDF处理服务API客户端
 */
export const pdfService = {
  /**
   * 从PDF提取图片并生成预览
   */
  async extractPreview(
    sessionId: string,
    file: File,
    options: ExtractPreviewOptions = {},
  ): Promise<PDFExtractionPreviewResponse> {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('file', file);

    if (options.thumbnail_size !== undefined) {
      formData.append('thumbnail_size', options.thumbnail_size.toString());
    }
    if (options.min_size !== undefined) {
      formData.append('min_size', options.min_size.toString());
    }
    if (options.skip_duplicates !== undefined) {
      formData.append('skip_duplicates', options.skip_duplicates.toString());
    }

    const response = await fetchApi({
      url: '/api/v1/pdf/extract-preview' as UrlPaths,
      method: 'post',
      data: formData,
    });

    return response.data as PDFExtractionPreviewResponse;
  },

  /**
   * 确认PDF图片提取，将选中的图片移动到正式路径
   */
  async confirmExtraction(sessionId: string, request: ConfirmExtractionRequest): Promise<ConfirmExtractionResponse> {
    const response = await fetchApi({
      url: `/api/v1/pdf/confirm-extraction/${sessionId}` as UrlPaths,
      method: 'post',
      data: request,
    });

    return response.data as ConfirmExtractionResponse;
  },

  /**
   * 清理PDF会话的临时文件
   */
  async cleanupSession(sessionId: string): Promise<CleanupSessionResponse> {
    const response = await fetchApi({
      url: `/api/v1/pdf/sessions/${sessionId}` as UrlPaths,
      method: 'delete',
    });

    return response.data as CleanupSessionResponse;
  },

  /**
   * 批量选择图片的辅助方法
   */
  selectImagesByPattern(
    images: PDFImageInfo[],
    pattern: {
      minSize?: number;
      maxSize?: number;
      formats?: string[];
      pages?: number[];
      hasPosition?: boolean;
    },
  ): string[] {
    return images
      .filter((img) => {
        // 按文件大小过滤
        if (pattern.minSize && img.size_bytes < pattern.minSize) {
          return false;
        }
        if (pattern.maxSize && img.size_bytes > pattern.maxSize) {
          return false;
        }

        // 按格式过滤
        if (pattern.formats && !pattern.formats.includes(img.format.toLowerCase())) {
          return false;
        }

        // 按页面过滤
        if (pattern.pages && !pattern.pages.includes(img.page)) {
          return false;
        }

        // 按是否有位置信息过滤
        if (pattern.hasPosition !== undefined) {
          const hasPos = !!img.position;
          if (pattern.hasPosition !== hasPos) {
            return false;
          }
        }

        return true;
      })
      .map((img) => img.filename);
  },

  /**
   * 按页面分组图片
   */
  groupImagesByPage(images: PDFImageInfo[]): Record<number, PDFImageInfo[]> {
    return images.reduce(
      (groups, img) => {
        if (!groups[img.page]) {
          groups[img.page] = [];
        }
        groups[img.page].push(img);
        return groups;
      },
      {} as Record<number, PDFImageInfo[]>,
    );
  },

  /**
   * 获取图片统计信息
   */
  getImageStats(images: PDFImageInfo[]) {
    const totalSize = images.reduce((sum, img) => sum + img.size_bytes, 0);
    const formats = [...new Set(images.map((img) => img.format))];
    const pages = [...new Set(images.map((img) => img.page))].sort((a, b) => a - b);

    const sizeRanges = {
      small: images.filter((img) => img.size_bytes < 50000).length, // < 50KB
      medium: images.filter((img) => img.size_bytes >= 50000 && img.size_bytes < 500000).length, // 50KB-500KB
      large: images.filter((img) => img.size_bytes >= 500000).length, // >= 500KB
    };

    return {
      totalCount: images.length,
      totalSize,
      averageSize: Math.round(totalSize / images.length),
      formats,
      pages,
      sizeRanges,
      withPosition: images.filter((img) => img.position).length,
    };
  },

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) {
      return '0 Bytes';
    }

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * 生成下载建议
   */
  getDownloadSuggestions(images: PDFImageInfo[]): {
    recommended: string[];
    reasons: Record<string, string[]>;
  } {
    const recommended: string[] = [];
    const reasons: Record<string, string[]> = {};

    images.forEach((img) => {
      const imgReasons: string[] = [];
      let shouldRecommend = false;

      // 大尺寸图片
      if (img.size_bytes > 100000) {
        // > 100KB
        imgReasons.push('高质量图片');
        shouldRecommend = true;
      }

      // 常见图片格式
      if (['png', 'jpg', 'jpeg'].includes(img.format.toLowerCase())) {
        imgReasons.push('标准图片格式');
        shouldRecommend = true;
      }

      // 有位置信息的图片（可能是重要内容）
      if (img.position) {
        imgReasons.push('有明确位置信息');
        shouldRecommend = true;
      }

      // 文件名包含有意义信息
      if (img.candidates_tried.some((candidate) => candidate.includes('file_') || candidate.includes('internal_'))) {
        imgReasons.push('有意义的文件名');
        shouldRecommend = true;
      }

      if (shouldRecommend) {
        recommended.push(img.filename);
        reasons[img.filename] = imgReasons;
      }
    });

    return { recommended, reasons };
  },
};
