// 文件位置: rpd-create-constants.ts
// 创建这个新文件，与 RPDCreateModal 组件在同一目录

import type { DescriptionFormat, GroupInfo, RPDCreateFormData } from './types/rpd-create-types';
import type {
  CurrentGroup,
  CurrentRPDData,
  EditFormType,
  RPDVersionFormData,
  UseRPDEditState,
} from './types/rpd-edit-types';

// 常量定义
export const FORM_DEFAULTS: Omit<RPDCreateFormData, 'key'> = {
  title: '',
  user_instruction: '',
  ai_description_groups: [],
  is_active: true,
  reference_images: [],
};

export const LIMITS = {
  MAX_GROUPS: 10,
  MAX_TITLE_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_VISUAL_CHARS: 2500,
  MAX_CONSIDERATIONS_CHARS: 2500,
} as const;

export const EMPTY_GROUP: GroupInfo = {
  tag: '',
  visual_characteristics: '',
  key_considerations: '',
};

// 分离器常量
export const GROUP_SEPARATOR = '\n\n=== グループ分割 ===\n\n';
export const ENG_GROUP_SEPARATOR = '\n\n=== Group Separation ===\n\n';

// 验证函数
export const isValidGroup = (group: GroupInfo): boolean => {
  return Boolean(group.tag?.trim() && group.visual_characteristics?.trim() && group.key_considerations?.trim());
};

export const canGenerateWithImage = (hasImages: boolean, selectedIndex: number | null, tag: string): boolean => {
  return Boolean(hasImages && selectedIndex !== null && tag.trim());
};

export const canSubmitForm = (
  selectedKey: string,
  confirmedGroups: GroupInfo[],
  title: string,
  isFormValid: boolean,
  descriptionFormat?: DescriptionFormat,
  descriptionForAI?: string,
): boolean => {
  // AI用说明是必须的（所有类型）
  const hasDescription = Boolean(descriptionForAI?.trim());
  const hasTitle = Boolean(title?.trim());

  if (!hasDescription || !hasTitle || !isFormValid) {
    return false;
  }

  // 基本要求：表单验证通过 + 有标题 + 有AI说明
  const basicRequirements = isFormValid && hasTitle && hasDescription;

  if (selectedKey === 'general_ng_review') {
    // 如果是分组格式，还需要有确认的组
    if (descriptionFormat === 'grouped') {
      return basicRequirements && confirmedGroups.length > 0;
    }
    // 如果是传统格式，只需要基本要求
    return basicRequirements;
  }

  return basicRequirements;
};

// 文件位置: rpd-edit-constants.ts
// Edit Modal特有的常量定义

// Edit表单默认值
export const EDIT_FORM_DEFAULTS: Omit<RPDVersionFormData, 'is_active'> = {
  title: '',
  user_instruction: '',
  reference_images: [],
  tag_list: [],
  ai_description_groups: [],
};

// Edit限制常量（与共享的LIMITS相同，但为了明确性单独定义）
export const EDIT_LIMITS = {
  MAX_GROUPS: 10,
  MAX_TITLE_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_VISUAL_CHARS: 2500,
  MAX_CONSIDERATIONS_CHARS: 2500,
  MAX_TAG_LENGTH: 100,
} as const;

// 空组定义（Edit版本）
export const EDIT_EMPTY_GROUP: CurrentGroup = {
  tag: '',
  visual_characteristics: '',
  key_considerations: '',
};

// 分离器常量
export const EDIT_GROUP_SEPARATOR = '\n\n=== グループ分割 ===\n\n';

// Edit特有验证函数
export const canSubmitEditForm = (
  currentRPD: CurrentRPDData | null | undefined,
  state: UseRPDEditState,
  form: EditFormType,
): boolean => {
  if (!currentRPD) {
    return false;
  }

  const hasChanges = form.formState.isDirty;
  if (!hasChanges) {
    return false;
  }

  const isGeneralNgReview = currentRPD.key === 'general_ng_review';

  if (isGeneralNgReview) {
    // 对于general_ng_review，至少需要有组或者描述
    const hasGroups = state.confirmedGroups.length > 0;
    const hasDescription = Boolean(form.watch('user_instruction')?.trim());
    return hasGroups || hasDescription;
  }

  // 对于其他类型，需要有描述
  return Boolean(form.watch('user_instruction')?.trim());
};

// 检查是否为分组格式描述
export const isGroupedDescription = (description: string): boolean => {
  if (!description || !description.trim()) {
    return false;
  }

  // 检查是否包含分组格式的必要字段
  const hasTag = description.includes('タグ:');
  const hasVisualCharacteristics = description.includes('視覚的特徴:');
  const hasKeyConsiderations = description.includes('重要な考慮事項:');

  // 只要包含这三个字段，就认为是分组格式（无论是单个组还是多个组）
  return hasTag && hasVisualCharacteristics && hasKeyConsiderations;
};

// 确定描述格式
export const determineDescriptionFormat = (description: string, tagList: string[]): DescriptionFormat => {
  // 如果描述包含分组格式的字段，则为分组格式
  if (isGroupedDescription(description)) {
    return 'grouped';
  }

  // 如果有多个标签且描述不为空，可能是分组格式但字段不完整
  if (tagList.length > 1 && description.trim()) {
    // 检查是否包含多个"タグ:"标记
    const tagMatches = description.match(/タグ:/g);
    if (tagMatches && tagMatches.length > 1) {
      return 'grouped';
    }
  }

  return 'traditional';
};

// 检查组是否可以确认（Edit版本）
export const canConfirmEditGroup = (group: CurrentGroup): boolean => {
  return Boolean(group.tag?.trim() && group.visual_characteristics?.trim() && group.key_considerations?.trim());
};

// 验证AI生成输入
export const validateEditGenerationInputs = (
  currentGroup: CurrentGroup,
  selectedImageIndex: number | null,
  hasUploadedImages: boolean,
  referenceImages: string[],
): boolean => {
  if (!currentGroup.tag.trim() || selectedImageIndex === null || !hasUploadedImages) {
    return false;
  }

  return Boolean(referenceImages && referenceImages.length > 0 && selectedImageIndex < referenceImages.length);
};

// 检查是否可以生成AI描述（Edit版本）
export const canGenerateEditDescription = (
  hasUploadedImages: boolean,
  selectedImageIndex: number | null,
  tag: string,
): boolean => {
  return Boolean(hasUploadedImages && selectedImageIndex !== null && tag.trim());
};

// 构建分组格式的标签列表
export const buildGroupedTagList = (groups: CurrentGroup[]): string[] => {
  return groups.map((group) => group.tag);
};

// 处理general_ng_review的标签列表
export const processEditGeneralNgReviewTagList = (
  formData: RPDVersionFormData,
  descriptionFormat: DescriptionFormat,
  confirmedGroups: CurrentGroup[],
): string[] => {
  if (descriptionFormat === 'grouped' && confirmedGroups.length > 0) {
    return buildGroupedTagList(confirmedGroups);
  }

  if (descriptionFormat === 'traditional' && formData.title.trim()) {
    return [formData.title.trim()];
  }

  return formData.tag_list || [];
};

// 验证标签输入
export const isValidTagInput = (tagInput: string, existingTags: string[] = []): boolean => {
  const trimmedTag = tagInput.trim();
  return Boolean(trimmedTag && trimmedTag.length <= EDIT_LIMITS.MAX_TAG_LENGTH && !existingTags.includes(trimmedTag));
};

// 处理编辑成功
export const createEditSuccessMessage = (rpdKey: string, version: number): { title: string; description: string } => ({
  title: 'RPDバージョンが作成されました',
  description: `RPD: ${rpdKey} のバージョン ${version} が正常に作成されました`,
});

// 处理编辑错误
export const createEditErrorMessage = (error: Error): { title: string; description: string } => ({
  title: 'RPDバージョン作成エラー',
  description: error.message || '予期せぬエラーが発生しました',
});
