import type { PDFExportOptions } from '@/services/pdfExport/types';

/**
 * PDF Preview Generation Status
 * SOLID: Interface segregation - specific status types
 */
export type PDFPreviewStatus = 'idle' | 'validating' | 'generating' | 'completed' | 'error';

/**
 * PDF Preview Error Types
 * SOLID: Single responsibility for error categorization
 */
export interface PDFPreviewError {
  code: 'VALIDATION_FAILED' | 'GENERATION_FAILED' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  details?: string;
  timestamp: Date;
}

/**
 * PDF Preview Generation Progress
 * SOLID: Single responsibility for progress tracking
 */
export interface PDFPreviewProgress {
  stage: 'fetching_data' | 'generating_pdf' | 'creating_preview' | 'finalizing';
  percentage: number;
  estimatedTimeRemaining: number; // in milliseconds
  message: string;
}

/**
 * PDF Preview Data
 * SOLID: Interface segregation - only preview-related data
 */
export interface PDFPreviewData {
  blob: Blob;
  dataURL: string;
  size: number; // in bytes
  pageCount: number;
  generatedAt: Date;
  options: PDFExportOptions;
}

/**
 * PDF Preview State
 * SOLID: Single responsibility for state management
 * DRY: Reusable state interface across components
 */
export interface PDFPreviewState {
  status: PDFPreviewStatus;
  data: PDFPreviewData | null;
  error: PDFPreviewError | null;
  progress: PDFPreviewProgress | null;
  isValidForPreview: boolean;
}

/**
 * PDF Preview Modal State
 * SOLID: Interface segregation for modal-specific state
 */
export interface PDFPreviewModalState {
  isOpen: boolean;
  taskId: string | null;
  currentOptions: PDFExportOptions | null;
  previewState: PDFPreviewState;
}

/**
 * PDF Export Options with Preview Settings
 * SOLID: Open/Closed principle - extends base options
 */
export interface PDFPreviewOptions extends PDFExportOptions {
  // Preview-specific options
  enablePreview: boolean;
  previewQuality: 'low' | 'medium' | 'high';
  autoGenerate: boolean; // Auto-generate preview when options change
}

/**
 * PDF Preview Event Handlers
 * SOLID: Interface segregation for event handling
 */
export interface PDFPreviewEventHandlers {
  onPreviewGenerate: (options: PDFExportOptions) => Promise<void>;
  onPreviewClear: () => void;
  onPreviewExport: () => Promise<void>;
  onPreviewError: (error: PDFPreviewError) => void;
  onPreviewProgress: (progress: PDFPreviewProgress) => void;
}

/**
 * PDF Preview Component Props
 * SOLID: Interface segregation for component props
 * DRY: Reusable across different preview components
 */
export interface PDFPreviewComponentProps {
  taskId: string;
  initialOptions?: Partial<PDFExportOptions>;
  className?: string;
  onClose?: () => void;
  onExport?: (blob: Blob, filename: string) => void;
}

/**
 * PDF Preview Service Configuration
 * SOLID: Single responsibility for service config
 */
export interface PDFPreviewServiceConfig {
  maxRetries: number;
  timeoutMs: number;
  enableProgressTracking: boolean;
  enableErrorRecovery: boolean;
  cacheEnabled: boolean;
  cacheTTL: number; // in milliseconds
}

/**
 * PDF Preview Cache Entry
 * SOLID: Single responsibility for cache management
 */
export interface PDFPreviewCacheEntry {
  key: string; // Hash of options + taskId
  data: PDFPreviewData;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

/**
 * PDF Preview Analytics Event
 * SOLID: Single responsibility for analytics tracking
 */
export interface PDFPreviewAnalyticsEvent {
  type: 'preview_generated' | 'preview_exported' | 'preview_error' | 'preview_cancelled';
  taskId: string;
  options: PDFExportOptions;
  duration?: number; // in milliseconds
  error?: PDFPreviewError;
  timestamp: Date;
  userAgent?: string;
}

/**
 * PDF Preview Validation Result
 * SOLID: Single responsibility for validation results
 */
export interface PDFPreviewValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  estimatedSize: number; // in bytes
  estimatedGenerationTime: number; // in milliseconds
}

/**
 * PDF Preview Export Result
 * SOLID: Single responsibility for export results
 */
export interface PDFPreviewExportResult {
  success: boolean;
  filename: string;
  size: number; // in bytes
  downloadUrl?: string;
  error?: PDFPreviewError;
  exportedAt: Date;
}

/**
 * Type Guards for PDF Preview Types
 * SOLID: Single responsibility for type checking
 * DRY: Reusable type guards
 */
export const PDFPreviewTypeGuards = {
  isPreviewData: (value: unknown): value is PDFPreviewData => {
    return (
      typeof value === 'object' &&
      value !== null &&
      'blob' in value &&
      'dataURL' in value &&
      'size' in value &&
      'pageCount' in value
    );
  },

  isPreviewError: (value: unknown): value is PDFPreviewError => {
    return typeof value === 'object' && value !== null && 'code' in value && 'message' in value && 'timestamp' in value;
  },

  isPreviewOptions: (value: unknown): value is PDFPreviewOptions => {
    return typeof value === 'object' && value !== null && 'taskId' in value && 'enablePreview' in value;
  },
} as const;

/**
 * PDF Preview Constants
 * SOLID: Single responsibility for configuration constants
 */
export const PDF_PREVIEW_CONSTANTS = {
  // File size limits
  MAX_PREVIEW_SIZE_MB: 50,
  MAX_EXPORT_SIZE_MB: 100,

  // Timeout limits
  GENERATION_TIMEOUT_MS: 30000, // 30 seconds
  EXPORT_TIMEOUT_MS: 60000, // 1 minute

  // Cache settings
  DEFAULT_CACHE_TTL_MS: 300000, // 5 minutes
  MAX_CACHE_ENTRIES: 50,

  // Progress intervals
  PROGRESS_UPDATE_INTERVAL_MS: 500,

  // Error retry settings
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;
