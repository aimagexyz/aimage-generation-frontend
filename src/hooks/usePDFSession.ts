import { useCallback, useEffect, useRef, useState } from 'react';

import { pdfService } from '@/api/pdfService';

// 错误类型检查辅助函数
const isNotFoundError = (error: unknown): boolean => {
  if (error && typeof error === 'object') {
    const err = error as { message?: string; status?: number };
    return err.message?.includes('Not Found') || err.status === 404;
  }
  return false;
};

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

export interface PDFExtractionResult {
  session_id: string;
  total_pages: number;
  total_images_found: number;
  images_extracted: number;
  duplicates_skipped: number;
  small_images_skipped: number;
  errors: string[];
  extracted_images: PDFImageInfo[];
}

export interface PDFConfirmResult {
  moved_files: string[];
  errors: string[];
  final_urls: string[];
}

export interface UsePDFSessionOptions {
  /**
   * 会话超时时间（毫秒），默认110分钟（比S3 TTL 2小时少一点）
   */
  sessionTimeout?: number;
  /**
   * 是否自动清理会话，默认true
   */
  autoCleanup?: boolean;
}

export interface UsePDFSessionReturn {
  /**
   * PDF会话ID
   */
  sessionId: string;

  /**
   * 会话是否活跃
   */
  isSessionActive: boolean;

  /**
   * 提取PDF图片预览
   */
  extractPreview: (
    file: File,
    options?: {
      thumbnail_size?: number;
      min_size?: number;
      skip_duplicates?: boolean;
    },
  ) => Promise<PDFExtractionResult>;

  /**
   * 确认选中的图片
   */
  confirmExtraction: (selectedImages: string[], projectId?: string) => Promise<PDFConfirmResult>;

  /**
   * 清理会话
   */
  cleanupSession: () => Promise<void>;

  /**
   * 刷新会话超时时间
   */
  refreshSession: () => void;

  /**
   * 当前提取状态
   */
  extractionState: {
    isExtracting: boolean;
    isConfirming: boolean;
    error: string | null;
  };
}

/**
 * PDF会话管理Hook
 * 提供PDF图片提取的完整流程管理，包括临时存储和会话清理
 */
export const usePDFSession = (options: UsePDFSessionOptions = {}): UsePDFSessionReturn => {
  const {
    sessionTimeout = 110 * 60 * 1000, // 110分钟
    autoCleanup = true,
  } = options;

  // 生成唯一的会话ID
  const [sessionId] = useState(() => {
    // 使用crypto.getRandomValues()生成更安全的随机数
    const array = new Uint32Array(2);
    crypto.getRandomValues(array);
    const randomStr = array[0].toString(36) + array[1].toString(36);
    return `pdf-${Date.now()}-${randomStr}`;
  });
  const [isSessionActive, setIsSessionActive] = useState(true);
  // 跟踪session是否已经在服务器端创建过
  const [sessionCreated, setSessionCreated] = useState(false);

  // 提取状态
  const [extractionState, setExtractionState] = useState({
    isExtracting: false,
    isConfirming: false,
    error: null as string | null,
  });

  // 超时和清理相关的refs
  const timeoutRef = useRef<number | null>(null);
  const cleanupPromiseRef = useRef<Promise<void> | null>(null);

  // 清理会话
  const cleanupSession = useCallback(async (): Promise<void> => {
    // 如果session已经不活跃，不需要清理
    if (!isSessionActive) {
      console.log(`PDF session ${sessionId} is already inactive, skipping cleanup`);
      return;
    }

    // 如果session从未在服务器端创建过，不需要清理
    if (!sessionCreated) {
      console.log(`PDF session ${sessionId} was never created on server, skipping cleanup`);
      setIsSessionActive(false);
      return;
    }

    // 避免重复清理
    if (cleanupPromiseRef.current) {
      console.log(`PDF session ${sessionId} cleanup already in progress`);
      return cleanupPromiseRef.current;
    }

    cleanupPromiseRef.current = (async () => {
      try {
        console.log(`Cleaning up PDF session: ${sessionId}`);
        await pdfService.cleanupSession(sessionId);
        setIsSessionActive(false);

        // 清除超时定时器
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        console.log(`PDF session ${sessionId} cleaned up successfully`);
      } catch (error) {
        // 404错误说明session已经不存在，这是正常的
        if (isNotFoundError(error)) {
          console.log(`PDF session ${sessionId} already cleaned up or doesn't exist`);
        } else {
          console.error(`Failed to cleanup PDF session ${sessionId}:`, error);
        }
        // 无论如何都标记为非活跃状态
        setIsSessionActive(false);
      } finally {
        cleanupPromiseRef.current = null;
      }
    })();

    return cleanupPromiseRef.current;
  }, [sessionId, isSessionActive, sessionCreated]);

  // 刷新会话超时
  const refreshSession = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (autoCleanup && isSessionActive) {
      timeoutRef.current = setTimeout(() => {
        console.log(`PDF session ${sessionId} timed out, cleaning up...`);
        void cleanupSession();
      }, sessionTimeout) as unknown as number;
    }
  }, [sessionTimeout, autoCleanup, isSessionActive, sessionId, cleanupSession]);

  // 提取PDF图片预览
  const extractPreview = useCallback(
    async (
      file: File,
      options: {
        thumbnail_size?: number;
        min_size?: number;
        skip_duplicates?: boolean;
      } = {},
    ): Promise<PDFExtractionResult> => {
      if (!isSessionActive) {
        throw new Error('PDF session is not active');
      }

      setExtractionState((prev) => ({ ...prev, isExtracting: true, error: null }));

      try {
        const result = await pdfService.extractPreview(sessionId, file, {
          thumbnail_size: options.thumbnail_size || 300,
          min_size: options.min_size || 1000,
          skip_duplicates: options.skip_duplicates !== false,
        });

        // 标记session已在服务器端创建
        setSessionCreated(true);

        // 刷新会话超时
        refreshSession();

        setExtractionState((prev) => ({ ...prev, isExtracting: false }));
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'PDF提取失败';
        setExtractionState((prev) => ({
          ...prev,
          isExtracting: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    [sessionId, isSessionActive, refreshSession],
  );

  // 确认选中的图片
  const confirmExtraction = useCallback(
    async (selectedImages: string[], projectId?: string): Promise<PDFConfirmResult> => {
      if (!isSessionActive) {
        throw new Error('PDF session is not active');
      }

      if (selectedImages.length === 0) {
        throw new Error('必须选择至少一张图片');
      }

      setExtractionState((prev) => ({ ...prev, isConfirming: true, error: null }));

      try {
        const result = await pdfService.confirmExtraction(sessionId, {
          selected_images: selectedImages,
          project_id: projectId,
        });

        // 确认成功后，会话结束（文件已移动）
        setIsSessionActive(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        setExtractionState((prev) => ({ ...prev, isConfirming: false }));

        // 转换API响应为hook期望的格式
        return {
          moved_files: result.moved_files,
          errors: result.errors,
          final_urls: result.moved_files, // 使用moved_files作为final_urls
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '确认提取失败';
        setExtractionState((prev) => ({
          ...prev,
          isConfirming: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    [sessionId, isSessionActive],
  );

  // 初始化会话超时
  useEffect(() => {
    refreshSession();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [refreshSession]);

  // 使用ref保存最新的状态值，避免useEffect闭包问题
  const isSessionActiveRef = useRef(isSessionActive);
  const autoCleanupRef = useRef(autoCleanup);
  const sessionCreatedRef = useRef(sessionCreated);

  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  useEffect(() => {
    autoCleanupRef.current = autoCleanup;
  }, [autoCleanup]);

  useEffect(() => {
    sessionCreatedRef.current = sessionCreated;
  }, [sessionCreated]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 使用ref的值，确保获取最新状态
      if (isSessionActiveRef.current && autoCleanupRef.current && sessionCreatedRef.current) {
        console.log(`Component unmounting, cleaning up PDF session: ${sessionId}`);
        // 异步清理，不阻塞组件卸载
        pdfService.cleanupSession(sessionId).catch((error) => {
          // 404错误说明session已经不存在，这是正常的
          if (isNotFoundError(error)) {
            console.log(`PDF session ${sessionId} already cleaned up or doesn't exist`);
          } else {
            console.error('Failed to cleanup PDF session on unmount:', error);
          }
        });
      } else {
        console.log(
          `Component unmounting, PDF session ${sessionId} - active: ${isSessionActiveRef.current}, autoCleanup: ${autoCleanupRef.current}, created: ${sessionCreatedRef.current}`,
        );
      }
    };
    // 只在sessionId变化时重新绑定cleanup
  }, [sessionId]);

  return {
    sessionId,
    isSessionActive,
    extractPreview,
    confirmExtraction,
    cleanupSession,
    refreshSession,
    extractionState,
  };
};
