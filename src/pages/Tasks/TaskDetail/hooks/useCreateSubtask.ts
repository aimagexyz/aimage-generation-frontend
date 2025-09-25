import { useMutation, useQueryClient } from '@tanstack/react-query';

import { fetchApi } from '@/api/client';

type CreateSubtaskParams = {
  taskId: string;
  name: string;
  description?: string;
  file: File;
  taskType?: 'picture' | 'video' | 'text' | 'audio' | 'word' | 'excel';
};

export function useCreateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, name, description, file, taskType = 'picture' }: CreateSubtaskParams) => {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('task_type_str', taskType);
      formData.append('file', file);

      if (description) {
        formData.append('description', description);
      }

      const result = await fetchApi({
        url: `/api/v1/tasks/${taskId}/subtasks` as '/api/v1/tasks/{task_id}/subtasks',
        method: 'post',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return result.data;
    },
    onSuccess: (_, { taskId }) => {
      void queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
    },
  });
}
