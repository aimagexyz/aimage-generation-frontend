import { useMutation, useQueryClient } from '@tanstack/react-query';

import { fetchApi } from '@/api/client';

// 前端使用的参数格式
type CreateTaskParams = {
  tid: string;
  name: string;
  description: string;
  assignee_id: string;
  priority_id: string;
  project_id: string;
  status_id: string;
};

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateTaskParams) => {
      const result = await fetchApi({
        url: `/api/v1/projects/${params.project_id}/tasks` as '/api/v1/projects/{project_id}/tasks',
        method: 'post',
        data: params,
      });
      return result.data;
    },
    onSuccess: (_, { project_id }) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', project_id] });
    },
  });
}
