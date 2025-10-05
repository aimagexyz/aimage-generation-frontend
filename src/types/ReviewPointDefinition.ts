export interface ReviewPointDefinitionVersionBase {
  title: string;
  user_instruction: string; // 用户输入的指令，后端会处理成description_for_ai
  reference_images?: string[]; // Optional list of S3 paths for copyright reference images
  tag_list?: string[]; // Optional list of tags for general NG review
  // general_ng_review专用字段
  ng_subcategory?: 'concrete_shape' | 'abstract_type'; // NG监修子类
}

export interface ReviewPointDefinitionVersionInDB {
  version: number;
  rpd_id: string; // UUID
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
  title: string;
  user_instruction?: string; // 用户输入的原始指令，旧数据可能没有
  description_for_ai: string; // 处理后的AI指令
  reference_images?: string[]; // Optional list of S3 paths for copyright reference images
  tag_list?: string[]; // Optional list of tags for general NG review
  // general_ng_review专用字段
  ng_subcategory?: 'concrete_shape' | 'abstract_type'; // NG监修子类
}

export interface ReviewPointDefinitionSchema {
  id: string; // UUID
  key: string;
  is_active: boolean;
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
  versions: ReviewPointDefinitionVersionInDB[];
  current_version_num: number;
  current_version?: ReviewPointDefinitionVersionInDB; // Added based on common patterns, confirm with backend
  project_id?: string; // UUID - 项目ID
}

export interface RPDStatusUpdate {
  is_active: boolean;
}

export interface ReviewPointDefinitionCreate {
  key: string;
  is_active?: boolean;
  title: string;
  user_instruction: string; // 用户输入的指令，后端会处理成description_for_ai
  ai_description_groups?: Array<{
    tag: string;
    visual_characteristics: string;
    key_considerations: string;
  }>; // Groups of AI descriptions for general_ng_review
  reference_images?: string[]; // Optional list of S3 paths for copyright reference images
  tag_list?: string[]; // Optional list of tags for general NG review
  project_id: string; // UUID - 项目特定的RPD需要关联项目
  // text_review专用字段
  reference_files?: string[]; // 引用文件列表（如称呼表文件的S3 URL）
  special_rules?: SpecialRule[]; // 特殊规则列表
  // general_ng_review专用字段
  ng_subcategory?: 'concrete_shape' | 'abstract_type'; // NG监修子类
}

// 特殊规则类型定义
export interface SpecialRule {
  speaker: string; // 说话者角色
  target: string; // 目标角色
  alias: string; // 特殊称呼
  conditions: string[]; // 条件列表
}

// 生成AI描述相关的类型
export interface GenerateDescriptionRequest {
  tag: string;
  image_url: string;
}

export interface GenerateDescriptionResponse {
  eng_visual_characteristics: string;
  eng_key_considerations: string;
  jpn_visual_characteristics: string;
  jpn_key_considerations: string;
}

// Prompt转写相关的类型
export interface PromptRewriteRequest {
  original_prompt: string;
  context?: string;
  target_language?: 'japanese' | 'english' | 'chinese';
  image_url?: string; // S3 图片路径或URL (可选)
}

export interface PromptRewriteResponse {
  original_prompt: string;
  rewritten_prompt: string;
  rewritten_prompt_jpn: string;
  confidence: number;
  processing_time?: number;
}
// RPD内容生成相关的类型
export interface GenerateRPDContentRequest {
  user_input: string;
  image_url?: string; // 可选的图片URL
  context?: string; // 可选的上下文
}

export interface GenerateRPDContentResponse {
  title: string;
  description_for_ai: string;
  description_for_ai_jpn: string;
  suggested_tag: string;
}

// Simplified type for AI review multi-select combobox
export interface Rpd {
  id: string;
  key: string;
  title: string;
}
