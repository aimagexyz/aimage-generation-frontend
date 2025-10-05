import type { TaskUpdatePayload } from '../types/tasks';
import { fetchApi } from './client';
import type { UrlPaths } from './helper';
import type { components } from './schemas';

// Use TaskOut from the generated schemas instead of a placeholder ITask
type TaskOut = components['schemas']['TaskOut'];
type TaskSimpleOut = components['schemas']['TaskSimpleOut'];

/**
 * Creates a new task from an uploaded image.
 * @param projectId The ID of the project.
 * @param imageFile The image file to upload.
 * @returns A promise that resolves to the created task data.
 */
export const createTaskFromImage = async (projectId: string, imageFile: File): Promise<TaskOut> => {
  const formData = new FormData();
  formData.append('image_file', imageFile);

  // The Path type for UrlPaths should ideally be generated from OpenAPI spec.
  // For this specific path, we assert it to the known type from UrlPaths.
  // The response type is TaskOut, which corresponds to the 201 response schema.
  const response = await fetchApi({
    url: `/api/v1/projects/${projectId}/tasks/create-from-image` as '/api/v1/projects/{project_id}/tasks/create-from-image',
    method: 'post',
    data: formData,
    headers: {
      // Axios should set Content-Type to multipart/form-data automatically for FormData
      // but if explicit control is needed for some reason:
      // 'Content-Type': 'multipart/form-data',
    },
  });

  // Even with typed paths, ResponseData helper might default to 200 OK,
  // while this endpoint returns 201 Created. So, explicit cast might still be needed
  // if the inferred type for response.data is 'unknown' or incorrect.
  return response.data as TaskOut;
};

/**
 * Creates a new task from an uploaded video.
 * @param projectId The ID of the project.
 * @param videoFile The video file to upload.
 * @returns A promise that resolves to the created task data.
 */
export const createTaskFromVideo = async (projectId: string, videoFile: File): Promise<TaskOut> => {
  const formData = new FormData();
  formData.append('video_file', videoFile);

  const response = await fetchApi({
    url: `/api/v1/projects/${projectId}/tasks/create-from-video` as UrlPaths,
    method: 'post',
    data: formData,
    headers: {
      // 'Content-Type': 'multipart/form-data', // Let browser set it
    },
  });

  return response.data as TaskOut;
};

export const updateTaskDetails = async (taskId: string, payload: TaskUpdatePayload): Promise<TaskOut> => {
  const response = await fetchApi({
    url: `/api/v1/tasks/${taskId}` as '/api/v1/tasks/{task_id}',
    method: 'put',
    data: payload as components['schemas']['TaskUpdate'],
  });
  return response.data as unknown as TaskOut;
};

export const updateSubtaskDetails = async (
  subtaskId: string,
  payload: components['schemas']['SubtaskUpdate'],
): Promise<components['schemas']['SubtaskDetail']> => {
  const response = await fetchApi({
    url: `/api/v1/subtasks/${subtaskId}` as '/api/v1/subtasks/{subtask_id}',
    method: 'put',
    data: payload,
  });

  return response.data as unknown as components['schemas']['SubtaskDetail'];
};

/**
 * Updates a subtask annotation.
 * @param subtaskId The ID of the subtask.
 * @param annotationId The ID of the annotation to update.
 * @param data The update payload containing the new text and/or rect.
 * @returns A promise that resolves to the updated subtask details.
 */
export const updateSubtaskAnnotation = async (
  subtaskId: string,
  annotationId: string,
  data: components['schemas']['SubtaskAnnotationUpdate'],
): Promise<components['schemas']['SubtaskDetail']> => {
  const response = await fetchApi({
    url: `/api/v1/subtasks/${subtaskId}/annotations/${annotationId}` as '/api/v1/subtasks/{subtask_id}/annotations/{annotation_id}',
    method: 'patch',
    data,
  });

  return response.data;
};

/**
 * Updates subtask associated characters (user manual selection).
 * @param subtaskId The ID of the subtask.
 * @param characterIds Array of character UUIDs to associate with the subtask.
 * @returns A promise that resolves to the updated subtask details.
 */
export const updateSubtaskCharacters = async (
  subtaskId: string,
  characterIds: string[],
): Promise<components['schemas']['SubtaskDetail']> => {
  const response = await fetchApi({
    url: `/api/v1/subtasks/${subtaskId}/characters` as '/api/v1/subtasks/{subtask_id}/characters',
    method: 'patch',
    data: { character_ids: characterIds },
  });

  return response.data;
};

/**
 * Deletes a subtask annotation.
 * @param subtaskId The ID of the subtask.
 * @param annotationId The ID of the annotation to delete.
 * @returns A promise that resolves to the updated subtask details.
 */
export const deleteSubtaskAnnotation = async (
  subtaskId: string,
  annotationId: string,
): Promise<components['schemas']['SubtaskDetail']> => {
  const response = await fetchApi({
    url: `/api/v1/subtasks/${subtaskId}/annotations/${annotationId}` as '/api/v1/subtasks/{subtask_id}/annotations/{annotation_id}',
    method: 'delete',
  });

  return response.data;
};

/**
 * Soft-deletes a task.
 * @param taskId The ID of the task to delete.
 * @returns A promise that resolves when the task is successfully deleted.
 */
export const deleteTask = async (taskId: string): Promise<void> => {
  await fetchApi({
    url: `/api/v1/tasks/${taskId}` as '/api/v1/tasks/{task_id}',
    method: 'delete',
  });
};

/**
 * Creates a new task.
 * @param projectId The ID of the project.
 * @param taskData The task data.
 * @returns A promise that resolves to the created task data.
 */
export const createTask = async (
  projectId: string,
  taskData: components['schemas']['TaskIn'],
): Promise<TaskSimpleOut> => {
  const response = await fetchApi({
    url: `/api/v1/projects/${projectId}/tasks` as '/api/v1/projects/{project_id}/tasks',
    method: 'post',
    data: taskData,
  });

  return response.data as TaskSimpleOut;
};

/**
 * Creates a new subtask with image file.
 * @param taskId The ID of the task.
 * @param name The name of the subtask.
 * @param imageFile The image file to upload.
 * @param description Optional description for the subtask.
 * @returns A promise that resolves to the created subtask data.
 */
export const createSubtaskWithImage = async (
  taskId: string,
  name: string,
  imageFile: File,
  description?: string,
): Promise<components['schemas']['SubtaskOut']> => {
  if (!taskId || String(taskId) === 'undefined') {
    throw new Error('Invalid task ID provided to createSubtaskWithImage');
  }

  const formData = new FormData();
  formData.append('name', name);
  formData.append('task_type_str', 'picture');
  formData.append('file', imageFile);

  if (description) {
    formData.append('description', description);
  }

  const response = await fetchApi({
    url: `/api/v1/tasks/${taskId}/subtasks` as '/api/v1/tasks/{task_id}/subtasks',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data as components['schemas']['SubtaskOut'];
};

/**
 * Creates a new subtask with video file.
 * @param taskId The ID of the task.
 * @param name The name of the subtask.
 * @param videoFile The video file to upload.
 * @param description Optional description for the subtask.
 * @returns A promise that resolves to the created subtask data.
 */
export const createSubtaskWithVideo = async (
  taskId: string,
  name: string,
  videoFile: File,
  description?: string,
): Promise<components['schemas']['SubtaskOut']> => {
  if (!taskId || String(taskId) === 'undefined') {
    throw new Error('Invalid task ID provided to createSubtaskWithVideo');
  }

  const formData = new FormData();
  formData.append('name', name);
  formData.append('task_type_str', 'video');
  formData.append('file', videoFile);

  if (description) {
    formData.append('description', description);
  }

  const response = await fetchApi({
    url: `/api/v1/tasks/${taskId}/subtasks` as '/api/v1/tasks/{task_id}/subtasks',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data as components['schemas']['SubtaskOut'];
};

/**
 * Gets task thumbnails (first few image subtasks).
 * @param taskId The ID of the task.
 * @param limit The number of thumbnails to return (default: 3).
 * @returns A promise that resolves to the task thumbnails data.
 */
export const getTaskThumbnails = async (
  taskId: string,
  limit: number = 3,
): Promise<components['schemas']['TaskThumbnailsResponse']> => {
  const response = await fetchApi({
    url: `/api/v1/tasks/${taskId}/thumbnails` as '/api/v1/tasks/{task_id}/thumbnails',
    method: 'get',
    params: { limit },
  });

  return response.data;
};
