import { useCallback, useState } from 'react';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoundingBoxCacheEntry {
  originalArea: BoundingBox;
  currentArea: BoundingBox;
  isDirty: boolean;
  isEditing: boolean;
  lastSaved: Date;
}

export interface BoundingBoxCache {
  [findingId: string]: BoundingBoxCacheEntry;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseBoundingBoxEditorOptions {
  onSave?: (findingId: string, newArea: BoundingBox) => Promise<void>;
}

export function useBoundingBoxEditor(options: UseBoundingBoxEditorOptions = {}) {
  const [cache, setCache] = useState<BoundingBoxCache>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const { onSave } = options;

  // 初始化或获取缓存条目
  const initializeFinding = useCallback((findingId: string, originalArea: BoundingBox) => {
    setCache((prev) => {
      if (prev[findingId]) {
        return prev; // 已存在，不重复初始化
      }

      return {
        ...prev,
        [findingId]: {
          originalArea,
          currentArea: { ...originalArea },
          isDirty: false,
          isEditing: false,
          lastSaved: new Date(),
        },
      };
    });
  }, []);

  // 开始编辑
  const startEditing = useCallback((findingId: string) => {
    setCache((prev) => ({
      ...prev,
      [findingId]: {
        ...prev[findingId],
        isEditing: true,
      },
    }));
  }, []);

  // 编辑过程中更新位置（不保存）
  const updateWhileEditing = useCallback((findingId: string, newArea: BoundingBox) => {
    setCache((prev) => ({
      ...prev,
      [findingId]: {
        ...prev[findingId],
        currentArea: { ...newArea },
        isDirty: true,
      },
    }));
  }, []);

  // 处理保存成功
  const handleSaveSuccess = useCallback((findingId: string) => {
    setCache((cacheState) => ({
      ...cacheState,
      [findingId]: {
        ...cacheState[findingId],
        isDirty: false,
        lastSaved: new Date(),
      },
    }));

    setSaveStatus((statusState) => ({ ...statusState, [findingId]: 'saved' }));

    // 2秒后清除保存状态
    setTimeout(() => {
      setSaveStatus((statusState) => ({ ...statusState, [findingId]: 'idle' }));
    }, 2000);
  }, []);

  // 处理保存错误
  const handleSaveError = useCallback((findingId: string, error: unknown) => {
    console.error('Failed to save bounding box:', error);
    setSaveStatus((statusState) => ({ ...statusState, [findingId]: 'error' }));

    // 5秒后清除错误状态，保持dirty状态以便重试
    setTimeout(() => {
      setSaveStatus((statusState) => ({ ...statusState, [findingId]: 'idle' }));
    }, 5000);
  }, []);

  // 完成编辑并保存
  const finishEditing = useCallback(
    (findingId: string) => {
      setCache((prev) => {
        const entry = prev[findingId];
        if (!entry) {
          return prev;
        }

        // 退出编辑模式
        const updatedCache = {
          ...prev,
          [findingId]: {
            ...entry,
            isEditing: false,
          },
        };

        // 如果有修改，则异步保存
        if (entry.isDirty) {
          setSaveStatus((prevStatus) => ({ ...prevStatus, [findingId]: 'saving' }));

          // 异步保存，不阻塞状态更新
          void (async () => {
            try {
              if (onSave) {
                await onSave(findingId, entry.currentArea);
              }
              handleSaveSuccess(findingId);
            } catch (error) {
              handleSaveError(findingId, error);
            }
          })();
        }

        return updatedCache;
      });
    },
    [onSave, handleSaveSuccess, handleSaveError],
  );

  // 取消编辑，恢复到原始状态
  const cancelEditing = useCallback((findingId: string) => {
    setCache((prev) => {
      const entry = prev[findingId];
      if (!entry) {
        return prev;
      }

      return {
        ...prev,
        [findingId]: {
          ...entry,
          currentArea: { ...entry.originalArea },
          isEditing: false,
          isDirty: false,
        },
      };
    });
  }, []);

  // 重置到原始位置
  const resetToOriginal = useCallback((findingId: string) => {
    setCache((prev) => {
      const entry = prev[findingId];
      if (!entry) {
        return prev;
      }

      return {
        ...prev,
        [findingId]: {
          ...entry,
          currentArea: { ...entry.originalArea },
          isDirty: false,
        },
      };
    });
  }, []);

  // 获取当前区域
  const getCurrentArea = useCallback(
    (findingId: string): BoundingBox | null => {
      return cache[findingId]?.currentArea || null;
    },
    [cache],
  );

  // 获取编辑状态
  const isEditing = useCallback(
    (findingId: string): boolean => {
      return cache[findingId]?.isEditing || false;
    },
    [cache],
  );

  // 获取脏状态
  const isDirty = useCallback(
    (findingId: string): boolean => {
      return cache[findingId]?.isDirty || false;
    },
    [cache],
  );

  // 获取保存状态
  const getSaveStatus = useCallback(
    (findingId: string): SaveStatus => {
      return saveStatus[findingId] || 'idle';
    },
    [saveStatus],
  );

  return {
    // 状态查询
    getCurrentArea,
    isEditing,
    isDirty,
    getSaveStatus,

    // 操作方法
    initializeFinding,
    startEditing,
    updateWhileEditing,
    finishEditing,
    cancelEditing,
    resetToOriginal,
  };
}
