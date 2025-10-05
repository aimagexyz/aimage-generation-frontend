// 文件位置: rpd-create-utils.ts
// 创建这个新文件，与 RPDCreateModal 组件在同一目录

import { determineDescriptionFormat, GROUP_SEPARATOR, isGroupedDescription } from './constants';
import type {
  DescriptionFormat,
  EngGroupInfo,
  GroupInfo,
  ReviewPointDefinitionCreate,
  RPDCreateFormData,
} from './types/rpd-create-types';
import type {
  CurrentGroup,
  CurrentRPDData,
  GenerateDescriptionResponse,
  RPDVersionFormData,
} from './types/rpd-edit-types';

// 创建分组格式数据
export const createGroupedFormatData = (confirmedGroups: GroupInfo[], engDescriptionGroups: EngGroupInfo[]) => {
  const tagList: string[] = [];
  const engDescriptions: string[] = [];

  for (const group of confirmedGroups) {
    tagList.push(group.tag);

    const matchingEngGroup = engDescriptionGroups.find((eg) => eg.tag === group.tag);

    if (matchingEngGroup) {
      const engGroupDesc = [
        `Tag: ${matchingEngGroup.tag}`,
        `Visual Characteristics: ${matchingEngGroup.visual_characteristics}`,
        `Key Considerations: ${matchingEngGroup.key_considerations}`,
      ].join('\n');

      engDescriptions.push(engGroupDesc);
    }
  }

  return { tagList, engDescriptions };
};

// 通用接口用于构建日语描述
interface JapaneseDescriptionGroup {
  tag: string;
  visual_characteristics: string;
  key_considerations: string;
}

// 构建日语描述 (通用函数)
export const buildJapaneseDescription = (groups: JapaneseDescriptionGroup[]): string => {
  const jpnDescriptions = groups.map((group) =>
    [
      `タグ: ${group.tag}`,
      `視覚的特徴: ${group.visual_characteristics}`,
      `重要な考慮事項: ${group.key_considerations}`,
    ].join('\n'),
  );

  return jpnDescriptions.join(GROUP_SEPARATOR);
};

// 处理general_ng_review数据
export const processGeneralNgReviewData = (
  formData: RPDCreateFormData,
  createData: ReviewPointDefinitionCreate,
  descriptionFormat: DescriptionFormat,
  confirmedGroups: GroupInfo[],
  engDescriptionGroups: EngGroupInfo[],
): void => {
  if (descriptionFormat === 'grouped' && confirmedGroups.length > 0) {
    const { tagList, engDescriptions } = createGroupedFormatData(confirmedGroups, engDescriptionGroups);

    createData.tag_list = tagList;

    if (engDescriptions.length > 0) {
      // eng_description_for_ai: Deprecated, using description_for_ai instead
    }
    return;
  }

  if (descriptionFormat === 'traditional' && formData.title.trim()) {
    createData.tag_list = [formData.title.trim()];
  }
};

// 更新英语描述组
export const updateEngDescriptionGroups = (prev: EngGroupInfo[], newGroup: EngGroupInfo): EngGroupInfo[] => {
  const existingIndex = prev.findIndex((g) => g.tag === newGroup.tag);

  if (existingIndex >= 0) {
    const updated = [...prev];
    updated[existingIndex] = newGroup;
    return updated;
  }

  return [...prev, newGroup];
};

// Edit特有的解析函数
// 解析单个组的内容
export const parseSingleGroup = (groupText: string): CurrentGroup | null => {
  const lines = groupText.split('\n');
  let tag = '';
  let visual_characteristics = '';
  let key_considerations = '';

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('タグ: ')) {
      tag = trimmedLine.substring(3).trim();
    } else if (trimmedLine.startsWith('視覚的特徴: ')) {
      visual_characteristics = trimmedLine.substring(6).trim();
    } else if (trimmedLine.startsWith('重要な考慮事項: ')) {
      key_considerations = trimmedLine.substring(7).trim();
    }
  }

  // 只有当所有字段都有值时才返回有效组
  if (tag && visual_characteristics && key_considerations) {
    return { tag, visual_characteristics, key_considerations };
  }

  return null;
};

// 解析现有的AI描述组（从分组格式描述中）
export const parseExistingDescription = (description: string): CurrentGroup[] => {
  if (!isGroupedDescription(description)) {
    return [];
  }

  // 检查是否包含分组分隔符
  if (description.includes(GROUP_SEPARATOR)) {
    // 多个组的情况：按分组分隔符分割
    const groups = description.split(GROUP_SEPARATOR);
    const parsedGroups: CurrentGroup[] = [];

    for (const groupText of groups) {
      const trimmedGroup = groupText.trim();
      if (trimmedGroup) {
        const parsedGroup = parseSingleGroup(trimmedGroup);
        if (parsedGroup) {
          parsedGroups.push(parsedGroup);
        }
      }
    }

    return parsedGroups;
  } else {
    // 单个组的情况：直接解析整个描述
    const parsedGroup = parseSingleGroup(description);
    return parsedGroup ? [parsedGroup] : [];
  }
};

// 从现有RPD数据初始化表单
export const initializeFormFromRPD = (
  currentRPD: CurrentRPDData,
): {
  formData: Partial<RPDVersionFormData>;
  detectedFormat: DescriptionFormat;
  initialGroups: CurrentGroup[];
} => {
  const currentVersion = currentRPD.current_version;
  let detectedFormat: DescriptionFormat = 'traditional';
  let initialGroups: CurrentGroup[] = [];

  if (currentRPD.key === 'general_ng_review' && currentVersion?.description_for_ai) {
    detectedFormat = determineDescriptionFormat(currentVersion.description_for_ai, currentVersion.tag_list || []);

    if (detectedFormat === 'grouped') {
      initialGroups = parseExistingDescription(currentVersion.description_for_ai);
    }
  }

  const formData: Partial<RPDVersionFormData> = {
    title: currentVersion?.title || '',
    user_instruction: currentVersion?.user_instruction || currentVersion?.description_for_ai || '',
    reference_images: currentVersion?.reference_images || [],
    tag_list: currentVersion?.tag_list || [],
    ai_description_groups: initialGroups,
    is_active: currentRPD.is_active,
  };

  return {
    formData,
    detectedFormat,
    initialGroups,
  };
};

// 更新当前组从AI响应
export const updateCurrentGroupFromResponse = (
  prevGroup: CurrentGroup,
  response: GenerateDescriptionResponse,
): CurrentGroup => ({
  ...prevGroup,
  visual_characteristics: response.jpn_visual_characteristics || '',
  key_considerations: response.jpn_key_considerations || '',
});

// 从AI响应创建英语组
export const createEngGroupFromResponse = (
  tag: string,
  response: GenerateDescriptionResponse,
): { tag: string; visual_characteristics: string; key_considerations: string } => ({
  tag: tag.trim(),
  visual_characteristics: response.eng_visual_characteristics || '',
  key_considerations: response.eng_key_considerations || '',
});

// 表单对象接口
interface FormWithSetValue {
  setValue: (name: string, value: unknown, options?: { shouldDirty?: boolean; shouldValidate?: boolean }) => void;
}

// 更新表单的分组相关字段
export const updateFormWithGroups = (form: FormWithSetValue, groups: CurrentGroup[]): void => {
  // 更新ai_description_groups
  form.setValue('ai_description_groups', groups, { shouldDirty: true });

  if (groups.length > 0) {
    // 构建日语描述
    const jpnDescriptionString = buildJapaneseDescription(groups);
    form.setValue('description_for_ai', jpnDescriptionString, { shouldDirty: true });

    // 更新tag_list
    const newTagList = groups.map((group) => group.tag);
    form.setValue('tag_list', newTagList, { shouldDirty: true });
  } else {
    // 清空相关字段
    form.setValue('description_for_ai', '', { shouldDirty: true });
    form.setValue('tag_list', [], { shouldDirty: true });
  }
};

// 验证组数据完整性
export const validateGroupData = (
  group: CurrentGroup,
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!group.tag?.trim()) {
    errors.push('タグが必要です');
  }

  if (!group.visual_characteristics?.trim()) {
    errors.push('視覚的特徴が必要です');
  }

  if (!group.key_considerations?.trim()) {
    errors.push('重要な考慮事項が必要です');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// 清理和标准化组数据
export const sanitizeGroupData = (group: CurrentGroup): CurrentGroup => ({
  tag: group.tag?.trim() || '',
  visual_characteristics: group.visual_characteristics?.trim() || '',
  key_considerations: group.key_considerations?.trim() || '',
});

// 检查组是否重复
export const isDuplicateGroup = (newGroup: CurrentGroup, existingGroups: CurrentGroup[]): boolean => {
  return existingGroups.some((existing) => existing.tag.toLowerCase() === newGroup.tag.toLowerCase());
};

// 获取组的显示摘要
export const getGroupSummary = (group: CurrentGroup): string => {
  const maxLength = 50;
  const summary = `${group.tag}: ${group.visual_characteristics}`;
  return summary.length > maxLength ? `${summary.substring(0, maxLength)}...` : summary;
};

// 导出编辑状态重置数据
export const getEditResetState = () => ({
  isSubmitting: false,
  tagInput: '',
  hasUploadedImages: false,
  currentGroup: { tag: '', visual_characteristics: '', key_considerations: '' },
  confirmedGroups: [],
  selectedImageIndex: null,
  isGenerating: false,
  descriptionFormat: 'traditional' as DescriptionFormat,
  isFormatLocked: false,
});

// 处理标签输入的清理
export const sanitizeTagInput = (input: string): string => {
  return input.trim().replace(/\s+/g, ' '); // 清理多余空格
};

// 从描述中提取标签（如果是传统格式）
export const extractTagsFromTraditionalDescription = (description: string, title: string): string[] => {
  // 如果有标题，使用标题作为标签
  if (title.trim()) {
    return [title.trim()];
  }

  // 尝试从描述的开头提取标签
  const lines = description.split('\n');
  const firstLine = lines[0]?.trim();

  if (firstLine && firstLine.length < 50) {
    return [firstLine];
  }

  return [];
};
