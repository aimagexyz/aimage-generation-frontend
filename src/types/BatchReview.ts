/**
 * Batch Review Types and Interfaces
 *
 * Following SOLID principles:
 * - Interface Segregation: Focused, single-purpose interfaces
 * - Dependency Inversion: Abstract batch operations through interfaces
 *
 * Following DRY principle:
 * - Reuses existing ReviewSet and task type patterns
 * - Consistent with existing API response interfaces
 */

export interface BatchReviewConfig {
  rpdIds: string[];
  reviewSetIds: string[];
  selectedTaskIds: string[];
  projectId: string;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  processing: number;
  percentage: number;
  currentTask?: string;
  currentTaskName?: string;
}

export interface BatchTaskResult {
  taskId: string;
  taskName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  aiReviewId?: string;
  startedAt?: Date;
  completedAt?: Date;
  subtasksProcessed?: number;
  totalSubtasks?: number;
}

export interface BatchReviewState {
  isProcessing: boolean;
  progress: BatchProgress;
  results: BatchTaskResult[];
  error: string | null;
  config?: BatchReviewConfig;
  isCancelled: boolean;
}

export interface BatchReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTaskIds: string[];
  projectId: string;
}

export interface BatchTaskPreviewProps {
  /** Task IDs to preview */
  taskIds: string[];
  /** Project ID for fetching task details */
  projectId: string;
  /** Optional callback to remove a task from the batch */
  onRemoveTask?: (taskId: string) => void;
  /** Maximum number of tasks to show before scrolling */
  maxVisible?: number;
  /** Show compact view for many tasks */
  compact?: boolean;
}

export interface BatchProgressTrackerProps {
  /** Current progress state */
  progress: BatchProgress;
  /** Individual task results */
  results: BatchTaskResult[];
  /** Whether to show detailed task-by-task progress */
  showDetails?: boolean;
  /** Callback to retry failed tasks */
  onRetryFailed?: (taskIds: string[]) => void;
  /** Callback to cancel ongoing batch */
  onCancel?: () => void;
}

// DRY: Extends existing task interfaces with batch-specific fields
export interface BatchTaskInfo {
  /** Task ID */
  id: string;
  /** Task name */
  name: string;
  /** Task thumbnail URL */
  thumbnailUrl?: string;
  /** Current task status */
  status: string;
  /** Number of subtasks */
  subtaskCount?: number;
  /** Task type (picture, video, etc.) */
  taskType?: string;
}

// Utility types for better type safety
export type BatchStatus = 'idle' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type TaskProcessingStatus = BatchTaskResult['status'];

// Helper interface for batch operation results
export interface BatchOperationResult {
  /** Overall batch status */
  status: BatchStatus;
  /** Summary of results */
  summary: {
    total: number;
    successful: number;
    failed: number;
    cancelled: number;
  };
  /** Detailed results per task */
  taskResults: BatchTaskResult[];
  /** Total processing time in milliseconds */
  processingTime?: number;
  /** Error details if batch failed */
  error?: string;
}
