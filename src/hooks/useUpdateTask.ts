import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateTaskDetails } from '@/api/tasks';
import type { TaskData } from '@/types/tasks';

interface UpdateTaskPayload {
  taskId: string;
  taskData: Partial<Omit<TaskData, 'id' | 'created_at' | 'updated_at' | 'assignee'>>;
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, taskData }: UpdateTaskPayload) => updateTaskDetails(taskId, taskData),
    onSuccess: (updatedTask) => {
      // Invalidate and refetch the tasks query to get fresh data
      void queryClient.invalidateQueries({ queryKey: ['tasks', updatedTask.project_id] });
      void queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] });
    },
    onError: (error, variables) => {
      console.error(`タスク ${variables.taskId} の更新に失敗しました:`, error);
      toast.error('タスクの更新に失敗しました。');
    },
  });
}
