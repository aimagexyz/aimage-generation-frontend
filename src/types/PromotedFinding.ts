export enum SharingScope {
  PROJECT = 'PROJECT',
  ORGANIZATION = 'ORGANIZATION',
  PUBLIC = 'PUBLIC',
}

export interface PromoteFindingRequestBody {
  finding_entry_id: string; // UUID of the AiReviewFindingEntryInDB
  subtask_id_context?: string; // UUID of the Subtask, optional
  notes?: string;
  tags?: string[];
  sharing_scope?: SharingScope; // Defaults to PROJECT on backend
}

export interface PromotedFindingResponseSchema {
  id: string; // UUID of the newly created PromotedFinding in the knowledge base
  finding_entry_id: string; // UUID, (Mistyped as original_finding_id before, corrected to match backend PromoteFindingCreate input)
  // ai_review_id: string; // This was in the old version, but not directly in backend PromotedFindingCreate or response, review if needed
  subtask_id_context?: string; // Added to match backend
  notes?: string; // Added to match backend
  tags?: string[]; // Added to match backend
  sharing_scope: SharingScope; // Added to match backend
  promoted_by_user_id: string; // Added from backend PromotedFinding model
  // title, description, recommendation come from the original finding, not explicitly separate fields in PromotedFinding DB model usually.
  // If they are denormalized, they should be added here based on backend's actual PromotedFinding schema.
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
}
