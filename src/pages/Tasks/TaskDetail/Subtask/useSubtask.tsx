import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchApi } from '@/api/client';
import { type components } from '@/api/schemas';
import { deleteSubtaskAnnotation, updateSubtaskAnnotation } from '@/api/tasks';

import { type Annotation } from './FrameAnnotation/useFrameAnnotation';

type SubtaskAnnotation = components['schemas']['SubtaskAnnotation'];

export function useSubtask(subtaskId: string, selectedVersion?: number) {
  // Get current subtask to access its version
  const { data: subtask } = useQuery({
    queryKey: ['subtask', subtaskId],
    queryFn: () =>
      fetchApi({
        url: `/api/v1/subtasks/${subtaskId}` as '/api/v1/subtasks/{subtask_id}',
        method: 'get',
      }).then((res) => res.data),
    enabled: !!subtaskId,
  });

  const { data: annotations, refetch: refetchAnnotations } = useQuery({
    queryKey: ['annotations', subtaskId],
    queryFn: () =>
      fetchApi({
        url: `/api/v1/subtasks/${subtaskId}/annotations` as '/api/v1/subtasks/{subtask_id}/annotations',
        method: 'get',
      }).then((res) => res.data?.items),
    enabled: !!subtaskId,
  });

  const { mutate: createNewAnnotation, isPending: isCreatingAnnotation } = useMutation({
    mutationFn: async (annotation: Annotation) => {
      const data = await fetchApi({
        url: `/api/v1/subtasks/${subtaskId}/annotations` as '/api/v1/subtasks/{subtask_id}/annotations',
        method: 'post',
        data: {
          ...annotation,
          version: selectedVersion,
        },
      });
      return data;
    },
    onSuccess: async () => {
      await refetchAnnotations();
    },
  });

  const { mutate: updateAnnotation, isPending: isUpdatingAnnotation } = useMutation({
    mutationFn: async ({
      annotationId,
      text,
      rect,
    }: {
      annotationId: string;
      text?: string;
      rect?: components['schemas']['Rect'];
    }) => {
      const updateData: Record<string, unknown> = {};
      if (text !== undefined) {
        updateData.text = text;
      }
      if (rect !== undefined) {
        updateData.rect = rect;
      }
      return updateSubtaskAnnotation(
        subtaskId,
        annotationId,
        updateData as components['schemas']['SubtaskAnnotationUpdate'],
      );
    },
    onSuccess: async () => {
      await refetchAnnotations();
    },
  });

  const { mutate: deleteAnnotation, isPending: isDeletingAnnotation } = useMutation({
    mutationFn: async (annotationId: string) => {
      return deleteSubtaskAnnotation(subtaskId, annotationId);
    },
    onSuccess: async () => {
      await refetchAnnotations();
    },
  });

  // Filter annotations by version
  const filteredAnnotations = useMemo(() => {
    if (!annotations || !subtask) {
      return [];
    }
    return annotations.filter((annotation: SubtaskAnnotation) => {
      // If annotation has no version, it's from the current version
      if (!annotation.version) {
        return selectedVersion === subtask.version;
      }
      return annotation.version === selectedVersion;
    });
  }, [annotations, subtask, selectedVersion]);

  const value = useMemo(
    () => ({
      annotations: filteredAnnotations,
      refetchAnnotations,
      createNewAnnotation,
      isCreatingAnnotation,
      updateAnnotation,
      deleteAnnotation,
      isUpdatingAnnotation,
      isDeletingAnnotation,
    }),
    [
      filteredAnnotations,
      createNewAnnotation,
      refetchAnnotations,
      isCreatingAnnotation,
      updateAnnotation,
      deleteAnnotation,
      isUpdatingAnnotation,
      isDeletingAnnotation,
    ],
  );

  return value;
}

/**
 * 创建子任务的 mutation hook
 */
export function useCreateSubtaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, formData }: { taskId: string; formData: FormData }) => {
      const response = await fetchApi({
        url: `/api/v1/tasks/${taskId}/subtasks` as '/api/v1/tasks/{task_id}/subtasks',
        method: 'post',
        data: formData,
        // 使用FormData时，不要手动设置Content-Type，让浏览器自动处理
      });
      return response.data;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['task-subtasks', variables.taskId] });
    },
  });
}
