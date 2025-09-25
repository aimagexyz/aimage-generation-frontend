// 智能补全相关类型定义

export interface AutofillSuggestion {
  text: string;
  confidence: number; // 置信度 (0-1)
}

export interface AutofillRequest {
  user_input: string;
  context?: string; // 可选的上下文信息
  rpd_type: string; // RPD类型（如：general_ng_review等）
  max_suggestions?: number; // 最大建议数量，默认5
}

export interface AutofillResponse {
  suggestions: AutofillSuggestion[];
  original_input: string;
  success: boolean;
  error_message?: string;
}
