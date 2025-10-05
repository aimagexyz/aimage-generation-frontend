// 文件位置: rpd-create-types.ts
// 完善的类型定义，移除所有any类型

import type { UseFormReturn } from 'react-hook-form';

// 描述格式类型
export type DescriptionFormat = 'grouped' | 'traditional';

// 组信息类型
export interface GroupInfo {
  tag: string;
  visual_characteristics: string;
  key_considerations: string;
}

// 英语组信息类型
export interface EngGroupInfo {
  tag: string;
  visual_characteristics: string;
  key_considerations: string;
}

// 表单数据类型
export interface RPDCreateFormData {
  key: string;
  title: string;
  user_instruction: string; // 改为user_instruction以匹配后端期望
  ai_description_groups: GroupInfo[];
  is_active: boolean;
  reference_images: string[];
}

// 创建数据类型
export interface ReviewPointDefinitionCreate {
  key: string;
  title: string;
  user_instruction: string; // 用户输入的指令，后端会处理成description_for_ai
  ai_description_groups: GroupInfo[];
  is_active: boolean;
  reference_images: string[];
  project_id: string;
  tag_list?: string[];
  // text_review专用字段
  reference_files?: string[]; // 引用文件列表（如称呼表文件的S3 URL）
  special_rules?: SpecialRule[]; // 特殊规则列表
  // general_ng_review专用字段
  ng_subcategory?: 'concrete_shape' | 'abstract_type'; // NG监修子类
}

// 特殊规则类型定义（与主类型文件保持一致）
export interface SpecialRule {
  speaker: string; // 说话者角色
  target: string; // 目标角色
  alias: string; // 特殊称呼
  conditions: string[]; // 条件列表
}

// AI生成响应类型
export interface AIGenerateResponse {
  jpn_visual_characteristics: string;
  jpn_key_considerations: string;
  eng_visual_characteristics: string;
  eng_key_considerations: string;
}

// AI生成请求参数类型
export interface AIGenerateRequest {
  tag: string;
  image_url: string;
}

// Toast选项类型
export interface ToastOptions {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}

// Mutation成功回调类型
export interface MutationOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// 创建RPD Mutation类型
export interface CreateRPDMutation {
  mutate: (data: ReviewPointDefinitionCreate, options?: MutationOptions) => void;
  isPending: boolean;
}

// Hook状态类型
export interface UseRPDCreateState {
  selectedKey: string;
  setSelectedKey: (key: string) => void;
  hasUploadedImages: boolean;
  setHasUploadedImages: (has: boolean) => void;
  currentGroup: GroupInfo;
  setCurrentGroup: React.Dispatch<React.SetStateAction<GroupInfo>>;
  confirmedGroups: GroupInfo[];
  setConfirmedGroups: React.Dispatch<React.SetStateAction<GroupInfo[]>>;
  engDescriptionGroups: EngGroupInfo[];
  setEngDescriptionGroups: React.Dispatch<React.SetStateAction<EngGroupInfo[]>>;
  selectedImageIndex: number | null;
  setSelectedImageIndex: (index: number | null) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  descriptionFormat: DescriptionFormat;
  setDescriptionFormat: (format: DescriptionFormat) => void;
}

// 模态框Props类型
export interface RPDCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

// Modal Setters类型
export interface ModalSetters {
  setSelectedKey: (key: string) => void;
  setHasUploadedImages: (has: boolean) => void;
  setUploadedImages: (images: string[]) => void;
  setCurrentGroup: React.Dispatch<React.SetStateAction<GroupInfo>>;
  setConfirmedGroups: React.Dispatch<React.SetStateAction<GroupInfo[]>>;
  setEngDescriptionGroups: React.Dispatch<React.SetStateAction<EngGroupInfo[]>>;
  setSelectedImageIndex: (index: number | null) => void;
  setIsGenerating: (generating: boolean) => void;
  setDescriptionFormat: (format: DescriptionFormat) => void;
}

// 组操作状态类型
export interface GroupOperationState {
  currentGroup: GroupInfo;
  confirmedGroups: GroupInfo[];
  setCurrentGroup: React.Dispatch<React.SetStateAction<GroupInfo>>;
  setConfirmedGroups: React.Dispatch<React.SetStateAction<GroupInfo[]>>;
  setSelectedImageIndex: (index: number | null) => void;
}

// AI生成服务类型
export interface AIGenerationService {
  generateDescription: (params: AIGenerateRequest) => Promise<AIGenerateResponse>;
}

// Visual Prompt状态类型
export interface VisualPromptState {
  originalPrompt: string;
  rewrittenPrompt: string;
  rewrittenPromptEng: string;
  confidence: number;
  isRewriting: boolean;
  selectedImageIndex: number | null;
}

// Toast服务类型
export interface ToastService {
  (options: ToastOptions): void;
}

// 表单类型
export type FormType = UseFormReturn<RPDCreateFormData>;

// Visual Review Prompt转写相关类型
export interface VisualReviewPromptState {
  originalPrompt: string;
  rewrittenPrompt: string;
  confidence: number;
  isRewriting: boolean;
  selectedImageIndex: number | null;
}

// Prompt转写请求类型
export interface PromptRewriteRequest {
  original_prompt: string;
  context?: string;
  target_language?: 'japanese' | 'english' | 'chinese';
  subtask_id: string;
}

// Prompt转写响应类型
export interface PromptRewriteResponse {
  original_prompt: string;
  rewritten_prompt: string;
  confidence: number;
  processing_time?: number;
}
