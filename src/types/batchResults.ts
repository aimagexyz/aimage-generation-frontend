// バッチ処理の状態
export type BatchProcessingStatus = 'pending' | 'running' | 'completed' | 'failed' | 'partial_success';

// バッチ処理の種類
export type BatchProcessingType = 'copyright_check' | 'scenario_check' | 'image_analysis' | 'content_review';

// バッチ処理リスト項目（簡略版 - リスト表示用）
export interface BatchProcessingListItem {
  id: string;
  batch_id: string;
  processing_type: BatchProcessingType;
  status: BatchProcessingStatus;
  initiated_by_user_name: string | null;
  initiated_by_user_email: string | null;
  total_tasks: number;
  successful_tasks: number;
  failed_tasks: number;
  total_processing_time_seconds: number;
  created_at: string;
  completed_at?: string;
}

// バッチ処理結果の詳細
export interface BatchTaskResult {
  task_id: string;
  task_name: string;
  status: 'success' | 'failed' | 'skipped';
  error_message?: string;
  findings_count?: number;
  severity?: 'high' | 'medium' | 'low' | 'failed' | null;
  created_at: string;
  updated_at: string;
  // Navigation fields
  subtask_id: string;
  parent_task_id?: string | null;
}

// バッチ処理記録（詳細版）
export interface BatchProcessingRecord {
  id: string;
  batch_id: string;
  project_id: string | null;
  processing_type: BatchProcessingType;
  status: BatchProcessingStatus;
  initiated_by_user_id: string | null;
  initiated_by_user_name: string | null;
  initiated_by_user_email: string | null;
  total_tasks: number;
  successful_tasks: number;
  failed_tasks: number;
  skipped_tasks: number;
  max_concurrent_tasks?: number; // 最大并发任务数
  total_processing_time_seconds: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  task_results: BatchTaskResult[];
  error_summary?: string;
}

// バッチ処理統計
export interface BatchProcessingStats {
  total_batches: number;
  successful_batches: number;
  failed_batches: number;
  average_processing_time_seconds: number;
  total_tasks_processed: number;
  success_rate_percentage: number;
}

// バッチ処理フィルター
export interface BatchProcessingFilters {
  processing_type?: BatchProcessingType;
  status?: BatchProcessingStatus;
  initiated_by_user_id?: string;
  date_range?: {
    start_date: string;
    end_date: string;
  };
  search_query?: string;
}

// ページネーション
export interface BatchProcessingListResponse {
  records: BatchProcessingRecord[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  stats: BatchProcessingStats;
}
