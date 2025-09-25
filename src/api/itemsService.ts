import { fetchApi } from './client';
import { UrlPaths } from './helper';

interface ExtractionStats {
  total_pages: number;
  total_images_found: number;
  images_extracted: number;
  duplicates_skipped: number;
  small_images_skipped: number;
  errors: string[];
}

export interface PDFResponse {
  id: string;
  filename: string;
  s3_path: string;
  file_size: number;
  total_pages: number;
  extraction_session_id?: string;
  extracted_at: string;
  extraction_method: string;
  extraction_stats?: ExtractionStats;
  project_id: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface ItemResponse {
  id: string;
  filename: string;
  s3_path: string;
  s3_url?: string;
  image_url: string;
  content_type: string;
  file_size: number;
  tags?: string[];
  description?: string;
  project_id?: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  // PDF相关字段
  source_type: string;
  source_pdf_id?: string;
  pdf_page_number?: number;
  pdf_image_index?: number;
}

export interface ItemBatchUploadResponse {
  uploaded_items: ItemResponse[];
  failed_uploads: Array<{
    filename: string;
    error: string;
  }>;
  total_uploaded: number;
  total_failed: number;
}

// 新的批量上传响应格式（后台任务）
export interface BatchUploadInitiateResponse {
  message: string;
  batch_id: string;
  status: string;
  total_files: number;
  project_id?: string;
}

// 批量上传状态响应
export interface BatchUploadStatusResponse {
  batch_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_items: number;
  processed_items: number;
  successful_items: number;
  failed_items: number;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  parameters?: Record<string, unknown>;
}

// 旧版本的批量上传函数（保持向后兼容）
export const batchUploadItems = async (
  files: File[],
  projectId?: string,
  tags?: string[],
  description?: string,
  onProgress?: (progress: number, status: string) => void,
) => {
  // 使用新的后台任务上传方式
  const batchResult = await initiateBatchUpload(files, projectId, tags, description);

  if (onProgress) {
    onProgress(10, 'アップロード開始中...');
  }

  // 轮询批处理状态
  const finalResult = await pollBatchUploadStatus(batchResult.batch_id, (status) => {
    if (onProgress) {
      const progress = Math.min(95, Math.round((status.processed_items / status.total_items) * 85) + 10);

      let statusText: string;
      if (status.status === 'running') {
        statusText = `処理中: ${status.processed_items}/${status.total_items} (成功: ${status.successful_items}, 失敗: ${status.failed_items})`;
      } else if (status.status === 'completed') {
        statusText = 'アップロード完了';
      } else if (status.status === 'failed') {
        statusText = 'アップロード失敗';
      } else {
        statusText = 'アップロード準備中...';
      }

      onProgress(progress, statusText);
    }
  });

  if (onProgress) {
    onProgress(100, 'アップロード完了');
  }

  // 转换为旧格式以保持兼容性
  return {
    uploaded_items: [], // 新版本不返回具体的item信息
    failed_uploads: [],
    total_uploaded: finalResult.successful_items,
    total_failed: finalResult.failed_items,
  } as ItemBatchUploadResponse;
};

// 新的批量上传初始化函数
export const initiateBatchUpload = async (
  files: File[],
  projectId?: string,
  tags?: string[],
  description?: string,
): Promise<BatchUploadInitiateResponse> => {
  const formData = new FormData();

  // Add all files to FormData
  files.forEach((file) => {
    formData.append('files', file);
  });

  // Add optional parameters
  if (projectId) {
    formData.append('project_id', projectId);
  }
  if (tags && tags.length > 0) {
    formData.append('tags', JSON.stringify(tags));
  }
  if (description) {
    formData.append('description', description);
  }

  const response = await fetchApi({
    url: '/api/v1/items/batch-upload' as UrlPaths,
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data as BatchUploadInitiateResponse;
};

// 获取批量上传状态
export const getBatchUploadStatus = async (batchId: string): Promise<BatchUploadStatusResponse> => {
  const response = await fetchApi({
    url: `/api/v1/items/batch-upload/${batchId}/status` as UrlPaths,
    method: 'get',
  });

  return response.data as BatchUploadStatusResponse;
};

// 时间预估相关接口
export interface TimeEstimation {
  estimatedTotalSeconds: number;
  estimatedRemainingSeconds: number;
  estimatedCompletionTime: Date;
  processingRate: number; // 每秒处理的文件数
}

// 计算时间预估
const calculateTimeEstimation = (
  totalItems: number,
  processedItems: number,
  startTime: string,
  currentTime: Date = new Date(),
): TimeEstimation => {
  const startDate = new Date(startTime);
  const elapsedSeconds = (currentTime.getTime() - startDate.getTime()) / 1000;

  // 基于实际数据：30张图片10秒，平均0.33秒/张
  const AVERAGE_SECONDS_PER_FILE = 0.33;

  let processingRate = 0;
  let estimatedRemainingSeconds = 0;

  if (processedItems > 0 && elapsedSeconds > 0) {
    // 基于实际处理速度计算
    processingRate = processedItems / elapsedSeconds;
    const remainingItems = totalItems - processedItems;
    estimatedRemainingSeconds = remainingItems / processingRate;
  } else {
    // 使用平均速度预估
    processingRate = 1 / AVERAGE_SECONDS_PER_FILE;
    estimatedRemainingSeconds = (totalItems - processedItems) * AVERAGE_SECONDS_PER_FILE;
  }

  const estimatedTotalSeconds = elapsedSeconds + estimatedRemainingSeconds;
  const estimatedCompletionTime = new Date(currentTime.getTime() + estimatedRemainingSeconds * 1000);

  return {
    estimatedTotalSeconds,
    estimatedRemainingSeconds: Math.max(0, estimatedRemainingSeconds),
    estimatedCompletionTime,
    processingRate,
  };
};

// 格式化剩余时间显示
const formatRemainingTime = (seconds: number): string => {
  if (seconds < 60) {
    return `約${Math.ceil(seconds)}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `約${minutes}分`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil((seconds % 3600) / 60);
    return `約${hours}時間${minutes}分`;
  }
};

// 扩展的批量上传状态响应，包含时间预估
export interface ExtendedBatchUploadStatusResponse extends BatchUploadStatusResponse {
  timeEstimation?: TimeEstimation;
  remainingTimeText?: string;
}

// 根据预估时间计算智能轮询间隔
const calculateSmartPollInterval = (
  estimatedRemainingSeconds: number,
  totalItems: number,
  processedItems: number,
): number => {
  const MIN_INTERVAL = 500; // 最小500ms（合理响应性）
  const MAX_INTERVAL = 5000; // 最大5秒
  const DEFAULT_INTERVAL = 1000; // 默认1秒

  if (!estimatedRemainingSeconds || estimatedRemainingSeconds <= 0) {
    return DEFAULT_INTERVAL;
  }

  // 根据剩余时间分段设置间隔（平衡响应性和资源消耗）
  const timeIntervals = [
    { maxTime: 30, interval: 1000 }, // ≤30秒: 1秒 (快速处理)
    { maxTime: 120, interval: 1500 }, // ≤2分钟: 1.5秒 (正常处理)
    { maxTime: 300, interval: 2000 }, // ≤5分钟: 2秒 (慢速处理)
    { maxTime: Infinity, interval: 3000 }, // >5分钟: 3秒 (超慢处理)
  ];

  const baseInterval = timeIntervals.find((t) => estimatedRemainingSeconds <= t.maxTime)?.interval || DEFAULT_INTERVAL;

  // 根据进度调整：开始和结束阶段适度提高频率
  const progressRatio = totalItems > 0 ? processedItems / totalItems : 0;
  const progressMultiplier = progressRatio < 0.1 || progressRatio > 0.95 ? 0.9 : 1.0;

  const finalInterval = baseInterval * progressMultiplier;
  return Math.max(MIN_INTERVAL, Math.min(MAX_INTERVAL, finalInterval));
};

// 处理轮询状态和时间预估
const processPollingStatus = (
  status: BatchUploadStatusResponse,
  currentPollInterval: number,
): { extendedStatus: ExtendedBatchUploadStatusResponse; newInterval: number } => {
  let extendedStatus: ExtendedBatchUploadStatusResponse = { ...status };
  let newInterval = currentPollInterval;

  if (status.status === 'running' && status.started_at && status.total_items > 0) {
    const timeEstimation = calculateTimeEstimation(status.total_items, status.processed_items, status.started_at);

    extendedStatus = {
      ...status,
      timeEstimation,
      remainingTimeText: formatRemainingTime(timeEstimation.estimatedRemainingSeconds),
    };

    newInterval = calculateSmartPollInterval(
      timeEstimation.estimatedRemainingSeconds,
      status.total_items,
      status.processed_items,
    );

    // 调试信息
    if (Math.abs(newInterval - currentPollInterval) > 200) {
      console.debug(
        `智能轮询间隔调整: ${currentPollInterval}ms -> ${newInterval}ms (剩余${timeEstimation.estimatedRemainingSeconds}秒)`,
      );
    }
  }

  return { extendedStatus, newInterval };
};

// 轮询批量上传状态直到完成
export const pollBatchUploadStatus = async (
  batchId: string,
  onProgress?: (status: ExtendedBatchUploadStatusResponse) => void,
  initialPollInterval: number = 1000, // 初始轮询间隔
  maxDurationMinutes: number = 15, // 最大轮询15分钟
): Promise<ExtendedBatchUploadStatusResponse> => {
  const startTime = Date.now();
  const maxDuration = maxDurationMinutes * 60 * 1000; // 转换为毫秒
  let currentPollInterval = initialPollInterval;
  let consecutiveNoProgressCount = 0;
  let previousProcessedItems = 0;

  while (Date.now() - startTime < maxDuration) {
    const status = await getBatchUploadStatus(batchId);

    // 处理状态和时间预估
    const { extendedStatus, newInterval } = processPollingStatus(status, currentPollInterval);
    currentPollInterval = newInterval;

    if (onProgress) {
      onProgress(extendedStatus);
    }

    // 如果已完成或失败，返回最终状态
    if (status.status === 'completed' || status.status === 'failed') {
      return extendedStatus;
    }

    // 检测进展并调整轮询频率
    if (status.status === 'running') {
      const hasProgress = previousProcessedItems !== status.processed_items;
      consecutiveNoProgressCount = hasProgress ? 0 : consecutiveNoProgressCount + 1;

      // 连续无进展时降低轮询频率
      if (consecutiveNoProgressCount > 5) {
        currentPollInterval = Math.min(currentPollInterval * 1.2, 5000);
      }

      previousProcessedItems = status.processed_items;
    }

    // 等待下次轮询（使用智能间隔）
    await new Promise((resolve) => setTimeout(resolve, currentPollInterval));
  }

  // 超时情况
  throw new Error(`批量上传状态轮询超时（${maxDurationMinutes}分钟）`);
};

// 高级批量上传函数（推荐使用）
export const advancedBatchUpload = async (
  files: File[],
  projectId?: string,
  tags?: string[],
  description?: string,
  onProgress?: (status: ExtendedBatchUploadStatusResponse) => void,
): Promise<ExtendedBatchUploadStatusResponse> => {
  // 初始化批量上传
  const initiateResult = await initiateBatchUpload(files, projectId, tags, description);

  // 轮询状态直到完成
  return await pollBatchUploadStatus(initiateResult.batch_id, onProgress);
};

export const listItems = async (projectId?: string, tags?: string) => {
  const params: Record<string, string> = {};

  if (projectId) {
    params.project_id = projectId;
  }
  if (tags) {
    params.tags = tags;
  }

  const response = await fetchApi({
    url: '/api/v1/items/' as UrlPaths,
    method: 'get',
    params,
  });

  return response.data;
};

export const getItem = async (itemId: string) => {
  const response = await fetchApi({
    url: `/api/v1/items/${itemId}` as UrlPaths,
    method: 'get',
  });

  return response.data as ItemResponse;
};

export const deleteItem = async (itemId: string) => {
  const response = await fetchApi({
    url: `/api/v1/items/${itemId}` as UrlPaths,
    method: 'delete',
  });

  return response.data;
};

// 添加新的接口来描述后端返回的原始数据格式
export interface RawSearchResult {
  id: string;
  anon_1: number; // 相似度分数
  metadata: {
    tags: string[];
    item_id: string;
    s3_path: string;
    filename: string;
    created_at: string;
    project_id: string;
    description: string;
    uploaded_by: string;
    content_type: string;
  };
}

export interface ItemSearchResult extends Omit<ItemResponse, 'file_size' | 'updated_at'> {
  similarity_score: number;
}

export interface ItemSearchByImageResponse {
  results: ItemSearchResult[];
  total: number;
}

// 定义后端返回的响应类型
interface SearchByImageApiResponse {
  results: RawSearchResult[];
  total: number;
}

interface CropInfo {
  x: number; // 相对于原图的x坐标 (0-1)
  y: number; // 相对于原图的y坐标 (0-1)
  width: number; // 相对于原图的宽度 (0-1)
  height: number; // 相对于原图的高度 (0-1)
}

export const searchItemsByImage = async (
  projectId: string,
  imageUrl: string,
  limit: number = 20,
  crop?: CropInfo,
): Promise<ItemSearchByImageResponse> => {
  const response = await fetchApi({
    url: `/api/v1/items/projects/${projectId}/search-by-image` as UrlPaths,
    method: 'post',
    data: {
      image_url: imageUrl,
      limit,
      ...(crop && { crop }),
    },
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });

  // 转换后端返回的原始数据格式为前端期望的格式
  const apiResponse = response.data as SearchByImageApiResponse;
  const rawResults = apiResponse.results;

  const transformedResults: ItemSearchResult[] = rawResults.map((rawResult) => ({
    id: rawResult.metadata.item_id,
    filename: rawResult.metadata.filename,
    s3_path: rawResult.metadata.s3_path,
    // 生成预签名URL作为image_url，基于S3路径
    image_url: `https://ai-mage-supervision.s3.amazonaws.com/${rawResult.metadata.s3_path}`,
    content_type: rawResult.metadata.content_type,
    file_size: 0, // 后端没有返回文件大小，设为0
    tags: rawResult.metadata.tags || [],
    description: rawResult.metadata.description || '',
    project_id: rawResult.metadata.project_id,
    uploaded_by: rawResult.metadata.uploaded_by,
    created_at: rawResult.metadata.created_at,
    updated_at: rawResult.metadata.created_at, // 使用created_at作为fallback
    // PDF相关字段
    source_type: 'unknown', // 搜索结果中没有返回source_type，设为默认值
    source_pdf_id: undefined,
    pdf_page_number: undefined,
    pdf_image_index: undefined,
    similarity_score: 1 - rawResult.anon_1, // 使用anon_1作为相似度分数
  }));

  return {
    results: transformedResults,
    total: apiResponse.total || transformedResults.length,
  };
};

// 物品检测相关接口
export interface BoundingBox {
  label: string;
  box_2d: [number, number, number, number]; // [y1, x1, y2, x2] normalized coordinates (0-1000)
  confidence?: number;
}

export interface BoundingBoxDetectionRequest {
  image_url: string;
  subtask_id: string;
  limit?: number;
}

export interface BoundingBoxDetectionResponse {
  bounding_boxes: BoundingBox[];
  total: number;
  project_id: string;
  subtask_id: string;
  image_url: string;
  saved_to_database: boolean;
}

export interface AiDetectionData {
  bounding_boxes?: BoundingBox[];
  total?: number;
  detected_at?: string;
  detection_version?: string;
  error?: string;
  failed_at?: string;
  status?: 'processing' | 'completed' | 'failed';
  started_at?: string;
}

// 检测图片中的物品边界框
export const detectObjectsInImage = async (
  projectId: string,
  request: BoundingBoxDetectionRequest,
): Promise<BoundingBoxDetectionResponse> => {
  const response = await fetchApi({
    url: `/api/v1/items/projects/${projectId}/detect-objects` as UrlPaths,
    method: 'post',
    data: request,
  });

  return response.data as BoundingBoxDetectionResponse;
};
