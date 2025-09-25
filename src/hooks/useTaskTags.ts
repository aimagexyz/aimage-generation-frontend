import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type TaskTagCreate, taskTagsService, type TaskTagUpdate } from '@/api/taskTagsService';
import { toast } from '@/components/ui/use-toast';

// Query Keys
const TASK_TAGS_QUERY_KEY = 'task-tags';

/**
 * Hook to fetch task tags for a project
 */
export function useTaskTags(projectId: string) {
  return useQuery({
    queryKey: [TASK_TAGS_QUERY_KEY, projectId],
    queryFn: () => taskTagsService.listTaskTags(projectId),
    enabled: !!projectId,
  });
}

/**
 * Hook to fetch a single task tag
 */
export function useTaskTag(tagId: string) {
  return useQuery({
    queryKey: [TASK_TAGS_QUERY_KEY, tagId],
    queryFn: () => taskTagsService.getTaskTag(tagId),
    enabled: !!tagId,
  });
}

/**
 * Hook to create a new task tag
 */
export function useCreateTaskTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TaskTagCreate) => taskTagsService.createTaskTag(data),
    onSuccess: (newTag) => {
      // Invalidate and refetch task tags for the project
      void queryClient.invalidateQueries({
        queryKey: [TASK_TAGS_QUERY_KEY, newTag.project_id],
      });
      // Success toast is handled in the component for better context
    },
    onError: (error) => {
      console.error('Failed to create task tag:', error);
      // Error toast is handled in the component for better error messages
    },
  });
}

/**
 * Hook to update a task tag
 */
export function useUpdateTaskTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, data }: { tagId: string; data: TaskTagUpdate }) => taskTagsService.updateTaskTag(tagId, data),
    onSuccess: (updatedTag) => {
      // Invalidate and refetch task tags for the project
      void queryClient.invalidateQueries({
        queryKey: [TASK_TAGS_QUERY_KEY, updatedTag.project_id],
      });
      // Update the specific tag in cache
      queryClient.setQueryData([TASK_TAGS_QUERY_KEY, updatedTag.id], updatedTag);
      toast({
        title: '成功',
        description: 'タスクタグが更新されました',
      });
    },
    onError: (error) => {
      console.error('Failed to update task tag:', error);
      toast({
        title: 'エラー',
        description: 'タスクタグの更新に失敗しました',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a task tag
 */
export function useDeleteTaskTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagId: string) => {
      await taskTagsService.deleteTaskTag(tagId);
      return tagId;
    },
    onSuccess: (deletedTagId) => {
      // Invalidate all task tags queries
      void queryClient.invalidateQueries({
        queryKey: [TASK_TAGS_QUERY_KEY],
      });
      // Remove the specific tag from cache
      queryClient.removeQueries({
        queryKey: [TASK_TAGS_QUERY_KEY, deletedTagId],
      });
      toast({
        title: '成功',
        description: 'タスクタグが削除されました',
      });
    },
    onError: (error) => {
      console.error('Failed to delete task tag:', error);
      toast({
        title: 'エラー',
        description: 'タスクタグの削除に失敗しました',
        variant: 'destructive',
      });
    },
  });
}
