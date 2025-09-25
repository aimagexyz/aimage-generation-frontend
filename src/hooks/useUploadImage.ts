import { useMutation, useQueryClient } from '@tanstack/react-query';

import { fetchApi } from '@/api/client';

type UpdateSubtaskVariables = {
  subtaskId: string;
  s3Path: string;
};

export function useUpdateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subtaskId, s3Path }: UpdateSubtaskVariables) => {
      await fetchApi({
        url: `/api/v1/subtasks/${subtaskId}/content` as '/api/v1/subtasks/{subtask_id}/content',
        method: 'patch',
        params: {
          s3_path: s3Path,
        },
      });
    },
    onSuccess: (_, { subtaskId }) => {
      // Invalidate subtask, subtasks and annotations queries
      void queryClient.invalidateQueries({ queryKey: ['subtask', subtaskId] });
      void queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      void queryClient.invalidateQueries({ queryKey: ['annotations', subtaskId] });
    },
  });
}

export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetchApi({
        url: '/api/v1/assets/images',
        method: 'post',
        data: formData,
      });

      return response.data;
    },
  });
}
