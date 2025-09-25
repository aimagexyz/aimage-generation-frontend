import { useCallback, useState } from 'react';

import type { components } from '@/api/schemas';

type Rect = components['schemas']['Rect'];

interface UseEditableAnnotationProps {
  onSave: (annotationId: string, newRect: Rect) => Promise<void>;
}

interface EditableAnnotationState {
  editingId: string | null;
  currentRect: Rect | null;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  lastSavedId: string | null; // 用于跟踪刚保存的annotation
}

export function useEditableAnnotation({ onSave }: UseEditableAnnotationProps) {
  const [state, setState] = useState<EditableAnnotationState>({
    editingId: null,
    currentRect: null,
    isDirty: false,
    saveStatus: 'idle',
    lastSavedId: null,
  });

  const startEditing = useCallback((annotationId: string, initialRect: Rect) => {
    setState({
      editingId: annotationId,
      currentRect: initialRect,
      isDirty: false,
      saveStatus: 'idle',
      lastSavedId: null,
    });
  }, []);

  const updateWhileEditing = useCallback((annotationId: string, newRect: Rect) => {
    setState((prev) => {
      if (prev.editingId !== annotationId) {
        return prev;
      }
      return {
        ...prev,
        currentRect: newRect,
        isDirty: true,
      };
    });
  }, []);

  const finishEditing = useCallback(
    async (annotationId: string) => {
      const currentState = state;
      if (currentState.editingId !== annotationId || !currentState.currentRect || !currentState.isDirty) {
        setState((prev) => ({ ...prev, editingId: null, currentRect: null, isDirty: false, lastSavedId: null }));
        return;
      }

      setState((prev) => ({ ...prev, saveStatus: 'saving' }));

      try {
        await onSave(annotationId, currentState.currentRect);
        // 保存成功后，先保持currentRect不变，避免视觉跳跃
        setState((prev) => ({
          ...prev,
          editingId: null,
          isDirty: false,
          saveStatus: 'success',
          lastSavedId: annotationId, // 记录刚保存的annotation ID
        }));
        // 延迟清除currentRect和重置状态，确保UI平滑过渡
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            currentRect: null,
            saveStatus: 'idle',
            lastSavedId: null,
          }));
        }, 1000);
      } catch (error) {
        console.error('Failed to save annotation:', error);
        setState((prev) => ({ ...prev, saveStatus: 'error' }));
      }
    },
    [state, onSave],
  );

  const cancelEditing = useCallback((annotationId: string) => {
    setState((prev) => {
      if (prev.editingId !== annotationId) {
        return prev;
      }
      return {
        editingId: null,
        currentRect: null,
        isDirty: false,
        saveStatus: 'idle',
        lastSavedId: null,
      };
    });
  }, []);

  const isEditing = useCallback(
    (annotationId: string) => {
      return state.editingId === annotationId;
    },
    [state.editingId],
  );

  const getCurrentRect = useCallback(
    (annotationId: string) => {
      // 如果正在编辑这个annotation，或者这个annotation刚保存完成但还没清除currentRect
      return state.editingId === annotationId || state.lastSavedId === annotationId ? state.currentRect : null;
    },
    [state.editingId, state.currentRect, state.lastSavedId],
  );

  const isDirty = useCallback(
    (annotationId: string) => {
      return state.editingId === annotationId ? state.isDirty : false;
    },
    [state.editingId, state.isDirty],
  );

  const getSaveStatus = useCallback(
    (annotationId: string) => {
      return state.editingId === annotationId ? state.saveStatus : 'idle';
    },
    [state.editingId, state.saveStatus],
  );

  return {
    startEditing,
    updateWhileEditing,
    finishEditing,
    cancelEditing,
    isEditing,
    getCurrentRect,
    isDirty,
    getSaveStatus,
  };
}
