// 文件位置: rpd-edit-types.ts
// Edit Modal特有的类型定义

import type { UseFormReturn } from 'react-hook-form';

import type { DescriptionFormat } from '../types/rpd-create-types';

// Edit Modal Props
export interface RPDEditModalProps {
  rpdId: string | null;
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

// 当前组类型（Edit中使用的组结构）
export interface CurrentGroup {
  tag: string;
  visual_characteristics: string;
  key_considerations: string;
}

// RPD版本表单数据
export interface RPDVersionFormData {
  title: string;
  user_instruction: string;
  reference_images: string[];
  tag_list: string[];
  ai_description_groups: CurrentGroup[];
  is_active: boolean;
}

// 创建RPD版本的变量
export interface CreateRPDVersionVariables {
  rpdId: string;
  data: ReviewPointDefinitionVersionBase;
}

// RPD版本基础数据
export interface ReviewPointDefinitionVersionBase {
  title: string;
  user_instruction: string; // 用户输入的指令，后端会处理成description_for_ai
  reference_images?: string[]; // 改为可选，与主类型文件保持一致
  tag_list?: string[]; // 改为可选，与主类型文件保持一致
  // text_review专用字段
  reference_files?: string[]; // 引用文件列表（如称呼表文件的S3 URL）
  special_rules?: SpecialRule[]; // 特殊规则列表
  // general_ng_review专用字段
  ng_subcategory?: 'concrete_shape' | 'abstract_type'; // NG监修子类
}

// 特殊规则类型定义
export interface SpecialRule {
  speaker: string;
  target: string;
  alias: string;
  conditions: string[];
}

// AI生成描述响应类型
export interface GenerateDescriptionResponse {
  jpn_visual_characteristics?: string;
  jpn_key_considerations?: string;
  eng_visual_characteristics?: string;
  eng_key_considerations?: string;
}

// 当前RPD数据类型
export interface CurrentRPDData {
  key: string;
  is_active: boolean;
  current_version_num: number;
  current_version?: {
    title?: string;
    user_instruction?: string;
    description_for_ai?: string;
    reference_images?: string[];
    tag_list?: string[];
  };
}

// Edit状态管理类型
export interface UseRPDEditState {
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
  tagInput: string;
  setTagInput: (input: string) => void;
  hasUploadedImages: boolean;
  setHasUploadedImages: (has: boolean) => void;
  currentGroup: CurrentGroup;
  setCurrentGroup: React.Dispatch<React.SetStateAction<CurrentGroup>>;
  confirmedGroups: CurrentGroup[];
  setConfirmedGroups: React.Dispatch<React.SetStateAction<CurrentGroup[]>>;
  selectedImageIndex: number | null;
  setSelectedImageIndex: (index: number | null) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  descriptionFormat: DescriptionFormat;
  setDescriptionFormat: (format: DescriptionFormat) => void;
  isFormatLocked: boolean;
  setIsFormatLocked: (locked: boolean) => void;
}

// Edit Hook参数类型
export interface EditModalSetters {
  setIsSubmitting: (submitting: boolean) => void;
  setTagInput: (input: string) => void;
  setHasUploadedImages: (has: boolean) => void;
  setCurrentGroup: React.Dispatch<React.SetStateAction<CurrentGroup>>;
  setConfirmedGroups: React.Dispatch<React.SetStateAction<CurrentGroup[]>>;
  setSelectedImageIndex: (index: number | null) => void;
  setIsGenerating: (generating: boolean) => void;
  setDescriptionFormat: (format: DescriptionFormat) => void;
  setIsFormatLocked: (locked: boolean) => void;
}

// 组操作状态类型（Edit版本）
export interface EditGroupOperationState {
  currentGroup: CurrentGroup;
  confirmedGroups: CurrentGroup[];
  setCurrentGroup: React.Dispatch<React.SetStateAction<CurrentGroup>>;
  setConfirmedGroups: React.Dispatch<React.SetStateAction<CurrentGroup[]>>;
  setSelectedImageIndex: (index: number | null) => void;
}

// Mutation类型
export interface CreateRPDVersionMutation {
  mutate: (
    variables: CreateRPDVersionVariables,
    options?: {
      onSuccess?: (data: { version: number }) => void;
      onError?: (error: Error) => void;
    },
  ) => void;
  isPending: boolean;
}

// 表单类型
export type EditFormType = UseFormReturn<RPDVersionFormData>;

// Toast选项类型
export interface EditToastOptions {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}

// AI生成参数返回类型
export interface EditAIGenerationParams {
  tag: string;
  imageUrl: string;
  onSuccess: (response: GenerateDescriptionResponse) => void;
  onError: (error: unknown) => void;
  onFinally: () => void;
}
