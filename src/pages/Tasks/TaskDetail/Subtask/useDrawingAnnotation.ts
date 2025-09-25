import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchApi } from '@/api/client';

// Hook to manage drawing annotations for a subtask
export function useDrawingAnnotation(subtaskId: string) {
  const queryClient = useQueryClient();

  // Fetch existing drawing annotation
  const { data: drawingAnnotation, isLoading } = useQuery({
    queryKey: ['subtask-drawing', subtaskId],
    queryFn: async () => {
      if (!subtaskId) {
        return null;
      }

      try {
        // Use the dedicated drawing endpoint
        const response = await fetchApi({
          url: `/api/v1/drawing/subtasks/${subtaskId}` as '/api/v1/drawing/subtasks/{subtask_id}',
          method: 'get',
        });
        return response.data?.drawing_data || null;
      } catch (error) {
        console.error('Failed to fetch drawing annotation:', error);
        return null;
      }
    },
    enabled: !!subtaskId,
  });

  // Save drawing annotation
  const saveDrawingMutation = useMutation({
    mutationFn: async (drawingData: string) => {
      if (!subtaskId) {
        return;
      }

      // Save the drawing data to the backend
      await fetchApi({
        url: `/api/v1/drawing/subtasks/${subtaskId}` as '/api/v1/drawing/subtasks/{subtask_id}',
        method: 'put',
        data: {
          drawing_data: drawingData,
        },
      });
    },
    onSuccess: () => {
      // Invalidate the query to refetch the latest data
      void queryClient.invalidateQueries({ queryKey: ['subtask-drawing', subtaskId] });
    },
    onError: (error) => {
      console.error('Failed to save drawing annotation:', error);
    },
  });

  // Clear drawing annotation
  const clearDrawingMutation = useMutation({
    mutationFn: async () => {
      if (!subtaskId) {
        return;
      }

      await fetchApi({
        url: `/api/v1/drawing/subtasks/${subtaskId}` as '/api/v1/drawing/subtasks/{subtask_id}',
        method: 'delete',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subtask-drawing', subtaskId] });
    },
    onError: (error) => {
      console.error('Failed to clear drawing annotation:', error);
    },
  });

  return {
    drawingData: drawingAnnotation,
    isLoading,
    saveDrawing: saveDrawingMutation.mutate,
    clearDrawing: clearDrawingMutation.mutate,
    isSaving: saveDrawingMutation.isPending,
    isClearing: clearDrawingMutation.isPending,
  };
}
