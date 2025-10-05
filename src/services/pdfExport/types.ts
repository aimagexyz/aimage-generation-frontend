import type { components } from '@/api/schemas';

// 复用现有类型 (DRY原则)
export type TaskDetail = components['schemas']['TaskOut'];
export type SubtaskDetail = components['schemas']['SubtaskDetail'];
export type AnnotationDetail = components['schemas']['SubtaskAnnotation'];

// PDF导出专用类型
export interface PDFExportOptions {
  taskId: string;
  includeComments: boolean;
  includeSolvedAnnotations: boolean;
  imageQuality: 'low' | 'medium' | 'high';
}

export interface PDFTaskData {
  task: TaskDetail;
  subtasks: SubtaskDetail[];
  annotations: Record<string, AnnotationDetail[]>; // subtaskId -> annotations
}

export interface AnnotationRenderData {
  annotation: AnnotationDetail;
  imageNaturalSize: { width: number; height: number };
  pdfImageSize: { width: number; height: number };
}

// PDF坐标转换相关类型
export interface PDFRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ToolSpecificProps {
  isArrow?: boolean;
  isCircle?: boolean;
  isText?: boolean;
  isRect?: boolean;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  showBackground?: boolean;
  borderRadius?: string;
}

// 图片处理相关类型
export interface ImageDimensions {
  width: number;
  height: number;
}

// Video Frame PDF专用类型 (KISS原则: 简单的视频帧数据结构)
export interface VideoFrameData {
  timestamp: number;
  frameDataUrl: string; // base64 data URL
  annotations: AnnotationDetail[];
}

export interface VideoFrameExtractionResult {
  success: boolean;
  frameDataMap: Map<number, string>;
  failedTimestamps: number[];
  errorMessage?: string;
}

// Video PDF Export Options (DRY: 扩展现有的PDF选项)
export interface VideoPDFExportOptions extends PDFExportOptions {
  frameQuality: 'low' | 'medium' | 'high';
  maxFramesPerVideo: number;
  skipFailedFrames: boolean;
}

// Video validation types
export interface VideoValidationResult {
  isSupported: boolean;
  hasAnnotations: boolean;
  annotationCount: number;
  uniqueTimestamps: number[];
  estimatedProcessingTime: number;
}
