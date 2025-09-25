// src/types/tasks.ts

// Copied from src/pages/Tasks/TaskDetail/components/SubtaskContentWrapper.tsx
// These types define the structure of SubtaskData and related entities.

// TODO: components may need to be imported if it's used by these types, e.g. for SubtaskOut if that was also moved.
// import type { components } from '@/api/schemas';

export const SUBTASK_TYPE_LABELS = {
  text: 'テキスト',
  picture: '画像',
  video: '動画',
  audio: '音声',
  word: 'ワード',
  excel: 'エクセル',
} as const;

export type TaskType = keyof typeof SUBTASK_TYPE_LABELS;

export interface TaskAssignee {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
}

export interface TaskData {
  id: string;
  created_at: string;
  updated_at: string;
  tid: string;
  name: string;
  description: string;
  assignee: TaskAssignee;
  priority_id: string;
  project_id: string;
  status_id: string;
  due_date?: string | null; // 截止日期
}

export interface SubtaskContentType {
  title: string;
  s3_path: string;
  description: string;
  task_type: TaskType;
  author?: string | null;
  created_at?: string | null;
}

export type SubtaskStatus = 'pending' | 'denied' | 'accepted' | null;

export interface SubtaskData {
  id: string;
  created_at: string;
  updated_at: string;
  oid: number;
  name: string;
  task_type: TaskType | null;
  description?: string | null;
  content: SubtaskContentType | null;
  version: number;
  history?: SubtaskContentType[];
  task: TaskData;
  status: SubtaskStatus;
  character_ids?: string[] | null;
  user_selected_character_ids?: string[] | null; // 用户手动选择的角色ID
}

export type SubtaskUpdateStatusValue = 'pending' | 'denied' | 'accepted';

export interface TaskUpdatePayload {
  title?: string;
  description?: string;
}
