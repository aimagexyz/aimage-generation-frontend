import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { fetchApi } from '@/api/client';
import type { components } from '@/api/schemas';
import { useAuth } from '@/hooks/useAuth';
import { enhanceTaskWithMockData } from '@/pages/Tasks/list/components/MockDataGenerator';

// Define sortable keys and order
export type TaskSortKey = 'created_at' | 'priority';
export type SortOrder = 'asc' | 'desc';

// Navigation API sort keys (different from regular tasks API)
export type NavigationSortKey = 'tid' | 'name' | 'created_at';

// API Response item types
export type TaskStatusItem = components['schemas']['TaskStatusOut'];
export type TaskPriorityItem = components['schemas']['TaskPriorityOut'];

// Helper type for task items
// Ensure all accessed properties are defined
export type TaskItem = components['schemas']['TaskOut'];

// Navigation API types
export type TaskNavigationItem = components['schemas']['TaskNavigationItem'];
export type TaskNavigationResponse = components['schemas']['TaskNavigationResponse'];
// API分页响应类型
export type TasksApiResponse = {
  data: TaskItem[];
  total: number;
  page: number;
  page_size: number;
};

// 共享的状态查询函数
function useTaskStatusesQuery() {
  const { userInfo } = useAuth();
  return useQuery({
    queryKey: ['taskStatuses', userInfo?.id],
    queryFn: (): Promise<TaskStatusItem[]> =>
      fetchApi({
        url: '/api/v1/tasks/statuses',
        method: 'get',
      })
        .then((res) => res.data.items)

        .then((items) => [...items].sort((a, b) => a.oid - b.oid)),

    enabled: !!userInfo,
    staleTime: Infinity,
    gcTime: Infinity, // 防止垃圾回收
  });
}

// 共享的优先级查询函数
function useTaskPrioritiesQuery() {
  const { userInfo } = useAuth();
  return useQuery({
    queryKey: ['taskPriorities', userInfo?.id],
    queryFn: (): Promise<TaskPriorityItem[]> =>
      fetchApi({
        url: '/api/v1/tasks/priorities',
        method: 'get',
      })
        .then((res) => res.data.items)

        .then((items) => [...items].sort((a, b) => a.oid - b.oid)),
    enabled: !!userInfo,
    staleTime: Infinity,
    gcTime: Infinity, // 防止垃圾回收
  });
}

// 共享的辅助函数
function createGetTaskStatus(taskStatuses: TaskStatusItem[] | undefined) {
  return (statusId: string) => {
    if (!taskStatuses || taskStatuses.length === 0) {
      return 'Loading...'; // 数据加载中的状态
    }
    return taskStatuses.find((status) => status.id === statusId)?.name || '';
  };
}

function createGetTaskPriority(taskPriorities: TaskPriorityItem[] | undefined) {
  return (priorityId: string) => {
    if (!taskPriorities || taskPriorities.length === 0) {
      return 'Loading...'; // 数据加载中的状态
    }
    return taskPriorities.find((priority) => priority.id === priorityId)?.name || '';
  };
}

// 更新 useTasks 参数类型
interface UseTasksParams {
  projectId?: string;
  page?: number;
  size?: number;
  statusId?: string | null;
  priorityId?: string | null;
  assigneeId?: string | null;
}

export function useTasks({ projectId, page = 1, size = 20, statusId, priorityId, assigneeId }: UseTasksParams) {
  // State for sorting
  const [sortKey, setSortKey] = useState<TaskSortKey>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // State for search
  const [searchQuery, setSearchQuery] = useState<string>('');

  // State for filters - remove internal state since we're getting filters from props
  const filters = {
    statusId: statusId ?? undefined,
    priorityId: priorityId ?? undefined,
    assigneeId: assigneeId ?? undefined,
  };

  const { data: taskStatuses } = useTaskStatusesQuery();
  const { data: taskPriorities } = useTaskPrioritiesQuery();

  const getTaskStatus = createGetTaskStatus(taskStatuses);
  const getTaskPriority = createGetTaskPriority(taskPriorities);

  // 修改任务查询以支持分页和后端排序
  const {
    data: tasksPageResponse,
    refetch: refetchTasks,
    dataUpdatedAt: fetchedTasksAt,
    isLoading: isTasksLoading,
  } = useQuery({
    queryKey: ['tasks', projectId, page, size, sortKey, sortOrder, filters],
    queryFn: async (): Promise<TasksApiResponse> => {
      // 构建查询参数，过滤掉 undefined 值
      const params: Record<string, string | number> = {
        page,
        page_size: size,
        sort_by: sortKey,
        order: sortOrder,
      };

      if (filters.statusId) {
        params.status_id = filters.statusId;
      }
      if (filters.priorityId) {
        params.priority_id = filters.priorityId;
      }
      if (filters.assigneeId) {
        // Handle special case for unassigned filter
        if (filters.assigneeId === 'unassigned') {
          params.assignee_id = 'null'; // Backend may expect 'null' string for unassigned
        } else {
          params.assignee_id = filters.assigneeId;
        }
      }

      // 首先获取分页的任务数据
      const tasksResponse = await fetchApi({
        url: `/api/v1/projects/${projectId}/tasks` as '/api/v1/projects/{project_id}/tasks',
        method: 'get',
        params,
      });

      // 后端返回的数据结构已经是 { total, page, page_size, data }
      // 直接返回data即可
      return tasksResponse.data as unknown as TasksApiResponse;
    },
    enabled: !!projectId && !!taskStatuses && !!taskPriorities, // 确保状态和优先级数据已加载
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // 对当前页的任务进行增强
  const enhancedTasks = useMemo(() => {
    if (!tasksPageResponse?.data) {
      return [];
    }
    // 后端已排序，前端只需增强
    return tasksPageResponse.data.map((task) => enhanceTaskWithMockData(task));
  }, [tasksPageResponse?.data]);

  const { mutate: updateTaskStatus, mutateAsync: updateTaskStatusAsync } = useMutation({
    mutationFn: async (data: { taskId: string; statusId: string }) => {
      const result = await fetchApi({
        url: `/api/v1/tasks/${data.taskId}/status` as '/api/v1/tasks/{task_id}/status',
        method: 'patch',
        params: {
          status_id: data.statusId,
        },
      });
      return result;
    },
  });

  const { mutate: updateTaskPriority, mutateAsync: updateTaskPriorityAsync } = useMutation({
    mutationFn: async (data: { taskId: string; priorityId: string }) => {
      const result = await fetchApi({
        url: `/api/v1/tasks/${data.taskId}/priority` as '/api/v1/tasks/{task_id}/priority',
        method: 'patch',
        params: {
          priority_id: data.priorityId,
        },
      });
      return result;
    },
  });

  const handleSort = (key: TaskSortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const totalTasks = tasksPageResponse?.total || 0;
  const totalPages = tasksPageResponse?.page_size ? Math.ceil(totalTasks / tasksPageResponse.page_size) : 1;

  return {
    // 任务数据
    tasks: enhancedTasks,
    totalTasks,
    currentPage: tasksPageResponse?.page || page,
    totalPages,
    pageSize: tasksPageResponse?.page_size || size,

    // 其他数据
    taskStatuses,
    taskPriorities,
    getTaskStatus,
    getTaskPriority,

    // 操作函数
    refetchTasks,
    updateTaskStatus,
    updateTaskStatusAsync,
    updateTaskPriority,
    updateTaskPriorityAsync,

    // 排序相关
    handleSort,
    currentSortKey: sortKey,
    currentSortOrder: sortOrder,

    // 搜索相关
    searchQuery,
    setSearchQuery,

    // 过滤相关
    filters,

    // 元数据
    fetchedTasksAt,
    isTasksLoading,
  };
}

/**
 * Hook for fetching task navigation data (lightweight for navigation purposes)
 * This is the recommended replacement for useAllTasks for navigation use cases
 */
export function useTaskNavigation({
  projectId,
  sortBy = 'created_at',
  order = 'desc',
}: {
  projectId: string | undefined;
  sortBy?: NavigationSortKey;
  order?: SortOrder;
}) {
  const {
    data: navigationResponse,
    refetch: refetchNavigation,
    error: navigationError,
  } = useQuery({
    queryKey: ['task-navigation', projectId, sortBy, order],
    queryFn: async (): Promise<TaskNavigationResponse> => {
      const response = await fetchApi({
        url: `/api/v1/projects/${projectId}/tasks/navigation` as '/api/v1/projects/{project_id}/tasks/navigation',
        method: 'get',
        params: { sort_by: sortBy, order },
      });

      return response.data;
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Handle error case
  if (navigationError) {
    console.error('Failed to fetch task navigation:', navigationError);
  }

  return {
    navigationTasks: navigationResponse?.items ?? [],
    totalTasks: navigationResponse?.total ?? 0,
    refetchNavigation,
    error: navigationError,
  };
}

/**
 * Hook for fetching all tasks (without pagination) - used for batch operations
 * @deprecated Consider using useTaskNavigation for navigation purposes as it's more efficient
 */
export function useAllTasks({ projectId }: { projectId: string | undefined }) {
  const { data: allTasksResponse, refetch: refetchAllTasks } = useQuery({
    queryKey: ['all-tasks', projectId],
    queryFn: async (): Promise<TaskItem[]> => {
      // 获取所有任务（不分页）
      const tasksResponse = await fetchApi({
        url: `/api/v1/projects/${projectId}/tasks` as '/api/v1/projects/{project_id}/tasks',
        method: 'get',
        params: { page: 1, page_size: 500 }, // 使用一个很大的 size 来获取所有任务
      });

      const tasksData = (tasksResponse.data as unknown as TasksApiResponse).data; // API返回 { data: [...] }

      const tasksToProcess: TaskItem[] = [...tasksData];

      return tasksToProcess;
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  return {
    allTasks: allTasksResponse ?? [],
    refetchAllTasks,
  };
}

/**
 * Hook for fetching only task metadata (statuses and priorities) - used by status/priority components
 */
export function useTaskMetadata() {
  const { data: taskStatuses } = useTaskStatusesQuery();
  const { data: taskPriorities } = useTaskPrioritiesQuery();

  const getTaskStatus = createGetTaskStatus(taskStatuses);
  const getTaskPriority = createGetTaskPriority(taskPriorities);

  const { mutate: updateTaskStatus, mutateAsync: updateTaskStatusAsync } = useMutation({
    mutationFn: async (data: { taskId: string; statusId: string }) => {
      const result = await fetchApi({
        url: `/api/v1/tasks/${data.taskId}/status` as '/api/v1/tasks/{task_id}/status',
        method: 'patch',
        params: {
          status_id: data.statusId,
        },
      });
      return result;
    },
  });

  const { mutate: updateTaskPriority, mutateAsync: updateTaskPriorityAsync } = useMutation({
    mutationFn: async (data: { taskId: string; priorityId: string }) => {
      const result = await fetchApi({
        url: `/api/v1/tasks/${data.taskId}/priority` as '/api/v1/tasks/{task_id}/priority',
        method: 'patch',
        params: {
          priority_id: data.priorityId,
        },
      });
      return result;
    },
  });

  return {
    taskStatuses,
    taskPriorities,
    getTaskStatus,
    getTaskPriority,
    updateTaskStatus,
    updateTaskStatusAsync,
    updateTaskPriority,
    updateTaskPriorityAsync,
  };
}
