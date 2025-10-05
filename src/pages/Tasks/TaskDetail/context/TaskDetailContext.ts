import { createContext } from 'react';

export interface TaskDetailContextType {
  handleSubtaskStatusUpdate: (subtaskId: string, newStatus: 'accepted' | 'denied' | 'pending') => Promise<void>;
  openCommentModalWithText?: (text: string) => void;
}

export const TaskDetailContext = createContext<TaskDetailContextType>({
  handleSubtaskStatusUpdate: () => Promise.resolve(),
  openCommentModalWithText: undefined,
});
