import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteTask } from '@/api/tasks';
import { toast } from '@/components/ui/use-toast';
import type { TasksApiResponse } from '@/pages/Tasks/hooks/useTasks';

/**
 * Hook for deleting a single task
 * SOLID: Single Responsibility - handles only single task deletion
 * 改进用户反馈和数据刷新机制
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: async (_, taskId) => {
      try {
        // 立即从缓存中移除已删除的任务，提供即时反馈
        queryClient.setQueriesData(
          { queryKey: ['tasks'] },
          (oldData: TasksApiResponse | undefined): TasksApiResponse | undefined => {
            if (!oldData?.data) {
              return oldData;
            }

            return {
              ...oldData,
              data: oldData.data.filter((task) => task.id !== taskId),
              total: Math.max(0, (oldData.total || 0) - 1),
            };
          },
        );

        // 强制重新获取任务列表以确保数据同步
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['tasks'] }),
          queryClient.refetchQueries({ queryKey: ['project-tasks'] }),
        ]);

        // 显示成功消息
        toast({
          title: 'タスクが削除されました',
          description: 'タスクは正常に削除されました。',
          variant: 'default',
        });
      } catch (error) {
        console.error('删除后数据刷新失败:', error);
        // 即使刷新失败，删除操作本身已成功
        toast({
          title: 'タスクが削除されました',
          variant: 'default',
        });
      }
    },
    onError: (error, taskId) => {
      console.error(`タスク ${taskId} の削除に失敗しました:`, error);

      // 显示具体的错误信息
      const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました';

      toast({
        title: 'タスクの削除に失敗しました',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
}
