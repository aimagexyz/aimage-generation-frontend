import { components } from '../api/schemas';
import { AiReviewFindingEntryInDB } from './AiReviewFinding';

type SubtaskType = components['schemas']['SubtaskType'];

// 注意: 这个 AiReviewFinding 类型专门用于前端 UI 组件的状态管理和显示
// 它是 AiReviewFindingEntryInDB 的简化版本，移除了数据库相关字段，
// 并将大部分字段设为可选以适应 UI 的灵活性需求
//
// 如果需要与后端 API 交互，请使用 AiReviewFinding.ts 中的类型
// 如果需要处理完整的数据库记录，请使用 schemas.d.ts 中的自动生成类型

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type DetectedElementType = 'character' | 'object' | 'text';

export interface DetectedElement {
  id: string;
  type: DetectedElementType;
  label: string;
  bounding_box?: number[];
  uiStatus?: 'pending' | 'adding_to_review' | 'ignored';
}

export interface AiDetectedElements {
  characters: DetectedElement[];
  objects: DetectedElement[];
  texts: DetectedElement[];
}

export interface AiReviewFindingArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AiReviewFindingCitation {
  text_snippet?: string;
  source_document_id?: string;
}

export interface AiReviewFinding {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'risk' | 'alert' | 'safe';
  suggestion?: string;
  area?: AiReviewFindingArea;
  citation?: AiReviewFindingCitation;
  status?: string;
  is_ai_generated?: boolean;
  reference_images?: string[];
  reference_source?: string;
  tag?: string[];
  review_point_definition_version_id?: string;
  original_ai_finding_id?: string | null;
  created_at?: string;
  updated_at?: string;
  is_fixed?: boolean;
  content_type: SubtaskType;
  content_metadata?: Record<string, never> | null;
}

export interface AiReviewResult {
  timestamp: string;
  subtaskId: string;
  overallScore: number;
  reviewSections: AiReviewSection[];
  detected_elements?: AiDetectedElements;
  id?: string;
  version?: number;
  is_latest?: boolean;
  findings?: AiReviewFinding[];
}

// Define AiReviewSection
export interface AiReviewSection {
  title: string;
  findings: AiReviewFinding[];
}

export type ViewpointKey = 'general_ng_review' | 'visual_review' | 'settings_review' | 'design_review' | 'text_review';

export const REVIEW_SECTION_TITLES: Record<ViewpointKey, string> = {
  general_ng_review: 'General NG Review',
  visual_review: 'Visual Review (Character & Objectives)',
  settings_review: 'Settings Review (Character & Objectives)',
  design_review: 'Design Review (Character Size / Layout)',
  text_review: 'Text Review (Typos)',
};

export const VIEWPOINT_KEY_BY_TITLE: { [title: string]: ViewpointKey } = Object.entries(REVIEW_SECTION_TITLES).reduce(
  (acc, [key, title]) => {
    acc[title] = key as ViewpointKey;
    return acc;
  },
  {} as { [title: string]: ViewpointKey },
);

export interface AiDetectedElement {
  element_id: string;
  description: string;
  bounding_box: number[];
  actions_taken: string[];
  resolution_applied: string;
  additional_notes?: string;
}

export interface AiReviewSchema {
  id: string;
  subtask_id: string;
  project_id: string;
  rpd_id: string;
  rpd_version_id: string;
  rpd_version_number: number;
  status: string;
  ai_model_name?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// 新增：AI review处理状态接口
export interface AiReviewProcessingStatus {
  subtask_id: string;
  is_processing: boolean;
  is_completed: boolean;
  is_cancelled?: boolean; // 新增：是否被取消
  latest_review_id?: string;
  processing_started_at?: string;
  completed_at?: string;
  findings_count: number;
  message: string;
  processing_status?: string; // 新增：明确的状态字符串
  error_message?: string; // 新增：错误信息
  should_cancel?: boolean; // 新增：中断信号
}

export interface AiReviewInDB extends AiReviewSchema {
  findings: AiReviewFindingEntryInDB[];
  detected_elements: AiDetectedElement[];
}

// AI Review Mode type
export type AiReviewMode = 'quality' | 'speed';

export interface InitiateAiReviewVariables {
  subtaskId: string;
  mode?: AiReviewMode; // 新增mode参数，可选，默认为quality
  rpdIds?: string[]; // 新增rpdIds参数，可选
}
