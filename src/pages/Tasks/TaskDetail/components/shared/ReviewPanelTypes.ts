// 共享的审查面板类型定义
export type ReviewSeverity = 'risk' | 'alert' | 'safe';

export type ReviewInteractionType = 'enter' | 'leave' | 'click';

// 通用的审查项目结构
export interface BaseReviewFinding {
  id: string;
  description: string;
  severity: ReviewSeverity;
  suggestion?: string;
  referenceImages?: string[];
  referenceSource?: string;
  timestamp?: string;
}

// AI审查专用的查找项目（保持向后兼容）
export interface AiReviewFinding extends BaseReviewFinding {
  area?: { x: number; y: number; width: number; height: number };
}

// 标注审查专用的查找项目
export interface AnnotationReviewFinding extends BaseReviewFinding {
  author?: string | null;
  type?: 'annotation' | 'ai-annotation' | 'comment';
  solved?: boolean;
  attachmentImageUrl?: string | null;
  startAt?: number | null;
  endAt?: number | null;
  order?: number;
}

// 样式详情接口
export interface SeverityStyleDetails {
  textColor: string;
  bgColorClass: string;
  borderColorClass: string;
  badgeClasses: string;
  summaryTextClass: string;
  pillTextColor: string;
  pillBgColor: string;
  pillSelectedBorderColor: string;
}
