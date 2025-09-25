import type { components } from '@/api/schemas';

import { fetchApi } from './client';
import type { UrlPaths } from './helper';

// Define types based on the schema
export type TaskTagOut = components['schemas']['TaskTagOut'];
export type TaskTagCreate = components['schemas']['TaskTagCreate'];
export type TaskTagUpdate = components['schemas']['TaskTagUpdate'];

const BASE_URL = '/api/v1/task-tags';

export const taskTagsService = {
  // List task tags for a project
  listTaskTags: async (projectId: string): Promise<TaskTagOut[]> => {
    const response = await fetchApi({
      url: `${BASE_URL}/` as UrlPaths,
      method: 'get',
      params: {
        project_id: projectId,
      },
    });
    return response.data as TaskTagOut[];
  },

  // Get a task tag detail
  getTaskTag: async (tagId: string): Promise<TaskTagOut> => {
    const response = await fetchApi({
      url: `${BASE_URL}/${tagId}` as '/api/v1/task-tags/{tag_id}',
      method: 'get',
    });
    return response.data;
  },

  // Create a new task tag
  createTaskTag: async (data: TaskTagCreate): Promise<TaskTagOut> => {
    const response = await fetchApi({
      url: `${BASE_URL}/` as UrlPaths,
      method: 'post',
      data,
    });
    return response.data as TaskTagOut;
  },

  // Update a task tag
  updateTaskTag: async (tagId: string, data: TaskTagUpdate): Promise<TaskTagOut> => {
    const response = await fetchApi({
      url: `${BASE_URL}/${tagId}` as '/api/v1/task-tags/{tag_id}',
      method: 'put',
      data,
    });
    return response.data;
  },

  // Delete a task tag
  deleteTaskTag: async (tagId: string): Promise<void> => {
    await fetchApi({
      url: `${BASE_URL}/${tagId}` as '/api/v1/task-tags/{tag_id}',
      method: 'delete',
    });
  },

  // Task-Tag Associations
  // Add a tag to a task
  addTagToTask: async (taskId: string, tagId: string): Promise<void> => {
    await fetchApi({
      url: `/api/v1/tasks/${taskId}/tags/${tagId}` as UrlPaths,
      method: 'post',
    });
  },

  // Remove a tag from a task
  removeTagFromTask: async (taskId: string, tagId: string): Promise<void> => {
    await fetchApi({
      url: `/api/v1/tasks/${taskId}/tags/${tagId}` as UrlPaths,
      method: 'delete',
    });
  },

  // Get all tags for a task
  getTaskTags: async (taskId: string): Promise<TaskTagOut[]> => {
    const response = await fetchApi({
      url: `/api/v1/tasks/${taskId}/tags` as UrlPaths,
      method: 'get',
    });
    return response.data as TaskTagOut[];
  },
};
