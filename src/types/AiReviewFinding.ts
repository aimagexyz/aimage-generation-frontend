import { components } from '../api/schemas';

export type SubtaskType = components['schemas']['SubtaskType'];

export enum FindingStatus {
  PENDING_REVIEW = 'pending_review',
  CONFIRMED_ISSUE = 'confirmed_issue',
  FALSE_POSITIVE = 'false_positive',
  RESOLVED = 'resolved',
  WONT_FIX = 'wont_fix',
  PROMOTED_TO_KB = 'promoted_to_kb',
}

export enum Severity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFORMATIONAL = 'informational',
}

export interface FindingArea {
  page_number?: number;
  bounding_box?: number[]; // [x_min, y_min, x_max, y_max]
}

export interface FindingCitation {
  source_document_id?: string; // UUID, e.g., RPD ID or other knowledge base doc
  page_number?: number;
  text_snippet?: string;
}

export interface AiReviewFindingBase {
  findingKey: string; // Unique key for the type of finding
  severity: Severity;
  description: string;
  area?: FindingArea;
  citation?: FindingCitation;
  suggestion?: string;
  additionalNotes?: string;
  reference_images?: string[];
  reference_source?: string;
  tag?: string[]; // 标签列表
  is_fixed: boolean; // Whether this finding is marked as fixed/resolved by user
  content_type: SubtaskType;
  content_metadata: Record<string, unknown>;
}

export interface AiReviewFindingEntryInDB extends AiReviewFindingBase {
  id: string; // UUID
  ai_review_id: string; // UUID
  status: FindingStatus;
  is_human_override: boolean;
  is_fixed: boolean; // Whether this finding is marked as fixed/resolved by user
  original_ai_finding_id?: string; // UUID, if this is an override
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
  // user_id who last updated? - consider if needed
}

export interface FindingStatusUpdate {
  status: FindingStatus;
}

export interface FindingFixedStatusUpdate {
  is_fixed: boolean;
}

export interface AiReviewFindingHumanOverrideCreate {
  description: string;
  severity: Severity;
  suggestion?: string;
  area: FindingArea;
  reference_images?: string[];
  reference_source?: string;
  status: FindingStatus;
}

export interface AiReviewFindingHumanCreate extends AiReviewFindingBase {
  status?: FindingStatus; // Optional, might default to PENDING_REVIEW
}
