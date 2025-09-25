import { useCallback, useEffect, useRef, useState } from 'react';

import { assetsService } from '@/api/assetsService';

export interface UseRPDSessionOptions {
  /** 自动清理会话，默认为true */
  autoCleanup?: boolean;
  /** 会话超时时间（毫秒），默认2小时 */
  sessionTimeout?: number;
}

export interface UseRPDSessionReturn {
  /** 会话ID */
  sessionId: string;
  /** 手动清理会话 */
  cleanupSession: () => Promise<void>;
  /** 将临时文件提升为正式文件 */
  promoteTempImages: (projectId: string) => Promise<void>;
  /** 会话是否活跃 */
  isSessionActive: boolean;
  /** 重新激活会话 */
  refreshSession: () => void;
}

/**
 * RPD创建会话管理Hook
 * 用于管理临时图片上传和自动清理
 */
export const useRPDSession = (options: UseRPDSessionOptions = {}): UseRPDSessionReturn => {
  const {
    autoCleanup = true,
    sessionTimeout = 2 * 60 * 60 * 1000, // 2小时
  } = options;

  // 生成会话ID
  const [sessionId] = useState(() => {
    const timestamp = Date.now();
    const random = crypto.randomUUID().slice(0, 8);
    return `rpd-${timestamp}-${random}`;
  });

  const [isSessionActive, setIsSessionActive] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const cleanupPromiseRef = useRef<Promise<void> | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // 刷新会话活跃状态
  const refreshSession = useCallback(() => {
    setLastActivity(Date.now());
    setIsSessionActive(true);

    // 清除现有超时
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 设置新的超时
    timeoutRef.current = setTimeout(() => {
      setIsSessionActive(false);
      if (autoCleanup) {
        void cleanupSession();
      }
    }, sessionTimeout);
  }, [sessionTimeout, autoCleanup]);

  // 清理会话
  const cleanupSession = useCallback(async (): Promise<void> => {
    // 避免重复清理
    if (cleanupPromiseRef.current) {
      return cleanupPromiseRef.current;
    }

    cleanupPromiseRef.current = (async () => {
      try {
        console.log(`Cleaning up RPD session: ${sessionId}`);
        await assetsService.cleanupTempSession(sessionId);
        setIsSessionActive(false);

        // 清除超时定时器
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } catch (error) {
        console.error(`Failed to cleanup session ${sessionId}:`, error);
        // 即使清理失败，也标记为非活跃状态
        setIsSessionActive(false);
      } finally {
        cleanupPromiseRef.current = null;
      }
    })();

    return cleanupPromiseRef.current;
  }, [sessionId]);

  // 将临时文件提升为正式文件
  const promoteTempImages = useCallback(
    async (projectId: string): Promise<void> => {
      try {
        console.log(`Promoting temp images from session ${sessionId} to project ${projectId}`);
        await assetsService.promoteTempImages(sessionId, projectId);

        // 提升成功后，不需要清理（文件已移动）
        setIsSessionActive(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } catch (error) {
        console.error(`Failed to promote temp images from session ${sessionId}:`, error);
        throw error;
      }
    },
    [sessionId],
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

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (autoCleanup && isSessionActive) {
        // 延迟清理，给其他组件时间完成操作
        setTimeout(() => {
          void cleanupSession();
        }, 1000);
      }
    };
  }, [autoCleanup, isSessionActive, cleanupSession]);

  // 页面卸载时清理
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isSessionActive && autoCleanup) {
        // 同步清理（页面卸载时）
        navigator.sendBeacon(`/api/v1/assets/temp-sessions/${sessionId}`, JSON.stringify({ method: 'DELETE' }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionId, isSessionActive, autoCleanup]);

  // 定期检查会话状态
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastActivity > sessionTimeout) {
        setIsSessionActive(false);
        if (autoCleanup) {
          void cleanupSession();
        }
      }
    }, 60000); // 每分钟检查一次

    return () => clearInterval(checkInterval);
  }, [lastActivity, sessionTimeout, autoCleanup, cleanupSession]);

  return {
    sessionId,
    cleanupSession,
    promoteTempImages,
    isSessionActive,
    refreshSession,
  };
};
