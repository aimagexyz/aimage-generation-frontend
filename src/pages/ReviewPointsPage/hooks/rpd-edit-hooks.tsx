// 文件位置: rpd-edit-hooks.ts
// RPDEditModal 专用的 hooks

import React from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { EDIT_EMPTY_GROUP, EDIT_FORM_DEFAULTS, EDIT_LIMITS, isValidTagInput } from '../constants';
import type { DescriptionFormat } from '../types/rpd-create-types';
import type { CurrentGroup, CurrentRPDData, RPDVersionFormData } from '../types/rpd-edit-types';
import { buildJapaneseDescription } from '../utils';

// Hook: 处理编辑模态框重置逻辑
export const useEditModalReset = (
  form: UseFormReturn<RPDVersionFormData>,
  setters: {
    setIsSubmitting: (submitting: boolean) => void;
    setTagInput: (input: string) => void;
    setHasUploadedImages: (has: boolean) => void;
    setCurrentGroup: React.Dispatch<React.SetStateAction<CurrentGroup>>;
    setConfirmedGroups: React.Dispatch<React.SetStateAction<CurrentGroup[]>>;
    setSelectedImageIndex: (index: number | null) => void;
    setIsGenerating: (generating: boolean) => void;
    setDescriptionFormat: (format: DescriptionFormat) => void;
    setIsFormatLocked: (locked: boolean) => void;
  },
) => {
  const resetEditState = React.useCallback(() => {
    form.reset(EDIT_FORM_DEFAULTS);
    setters.setIsSubmitting(false);
    setters.setTagInput('');
    setters.setHasUploadedImages(false);
    setters.setCurrentGroup(EDIT_EMPTY_GROUP);
    setters.setConfirmedGroups([]);
    setters.setSelectedImageIndex(null);
    setters.setIsGenerating(false);
    setters.setDescriptionFormat('traditional');
    setters.setIsFormatLocked(false);
  }, []); // 移除依赖，因为这些都是稳定的函数引用

  return { resetEditState };
};

// Hook: 处理编辑模式下的组操作
export const useEditGroupOperations = (
  form: UseFormReturn<RPDVersionFormData>,
  state: {
    currentGroup: CurrentGroup;
    confirmedGroups: CurrentGroup[];
    setCurrentGroup: React.Dispatch<React.SetStateAction<CurrentGroup>>;
    setConfirmedGroups: React.Dispatch<React.SetStateAction<CurrentGroup[]>>;
    setSelectedImageIndex: (index: number | null) => void;
  },
) => {
  const confirmGroup = React.useCallback(() => {
    if (
      !state.currentGroup.tag.trim() ||
      !state.currentGroup.visual_characteristics.trim() ||
      !state.currentGroup.key_considerations.trim()
    ) {
      return;
    }

    if (state.confirmedGroups.length >= EDIT_LIMITS.MAX_GROUPS) {
      return;
    }

    const newConfirmedGroups = [...state.confirmedGroups, state.currentGroup];
    state.setConfirmedGroups(newConfirmedGroups);

    // 更新表单
    form.setValue('ai_description_groups', newConfirmedGroups, { shouldDirty: true });
    if (newConfirmedGroups.length > 0) {
      const japaneseDescription = buildJapaneseDescription(newConfirmedGroups);
      form.setValue('user_instruction', japaneseDescription, { shouldDirty: true });
      const newTagList = newConfirmedGroups.map((group) => group.tag);
      form.setValue('tag_list', newTagList, { shouldDirty: true });
    } else {
      form.setValue('user_instruction', '', { shouldDirty: true });
      form.setValue('tag_list', [], { shouldDirty: true });
    }

    state.setCurrentGroup(EDIT_EMPTY_GROUP);
    state.setSelectedImageIndex(null);
  }, [
    state.currentGroup,
    state.confirmedGroups,
    state.setConfirmedGroups,
    state.setCurrentGroup,
    state.setSelectedImageIndex,
  ]); // 只依赖真正需要的值

  const removeGroup = React.useCallback(
    (index: number) => {
      const newConfirmedGroups = state.confirmedGroups.filter((_, i) => i !== index);
      state.setConfirmedGroups(newConfirmedGroups);

      // 更新表单
      form.setValue('ai_description_groups', newConfirmedGroups, { shouldDirty: true });
      if (newConfirmedGroups.length > 0) {
        const japaneseDescription = buildJapaneseDescription(newConfirmedGroups);
        form.setValue('user_instruction', japaneseDescription, { shouldDirty: true });
        const newTagList = newConfirmedGroups.map((group) => group.tag);
        form.setValue('tag_list', newTagList, { shouldDirty: true });
      } else {
        form.setValue('user_instruction', '', { shouldDirty: true });
        form.setValue('tag_list', [], { shouldDirty: true });
      }
    },
    [form, state.confirmedGroups, state.setConfirmedGroups],
  );

  return {
    confirmGroup,
    removeGroup,
  };
};

// Hook: 处理编辑模式下的标签管理
export const useEditTagManagement = (
  form: UseFormReturn<RPDVersionFormData>,
  state: {
    tagInput: string;
    setTagInput: (input: string) => void;
  },
) => {
  const addTag = React.useCallback(() => {
    const currentTagList = form.watch('tag_list') || [];

    if (!isValidTagInput(state.tagInput, currentTagList)) {
      return;
    }

    const newTags = [...currentTagList, state.tagInput.trim()];
    form.setValue('tag_list', newTags, { shouldDirty: true });
    state.setTagInput('');
  }, [state.tagInput, state.setTagInput]); // 只依赖真正需要的值

  const removeTag = React.useCallback(
    (tagToRemove: string) => {
      const currentTagList = form.watch('tag_list') || [];
      const newTags = currentTagList.filter((tag) => tag !== tagToRemove);
      form.setValue('tag_list', newTags, { shouldDirty: true });
    },
    [], // form.setValue 是稳定的函数引用
  );

  const handleTagKeyPress = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag();
      }
    },
    [addTag],
  );

  return {
    addTag,
    removeTag,
    handleTagKeyPress,
  };
};

// Hook: 处理编辑模式下的表单提交
export const useEditFormSubmission = (
  rpdId: string | null,
  mutation: {
    mutate: (
      variables: {
        rpdId: string;
        data: {
          title: string;
          user_instruction: string;
          reference_images: string[];
          tag_list: string[];
        };
      },
      options?: {
        onSuccess?: (data: { version: number }) => void;
        onError?: (error: Error) => void;
      },
    ) => void;
    isPending: boolean;
  },
  onClose: () => void,
) => {
  const submitEditForm = React.useCallback(
    (formData: RPDVersionFormData, processTagList: (formData: RPDVersionFormData) => string[]) => {
      if (!rpdId) {
        return;
      }

      const finalTagList = processTagList(formData);

      const variables = {
        rpdId,
        data: {
          title: formData.title,
          user_instruction: formData.user_instruction,
          reference_images: formData.reference_images || [],
          tag_list: finalTagList,
        },
      };

      mutation.mutate(variables, {
        onSuccess: () => {
          onClose();
        },
        onError: (error) => {
          console.error('RPD版本创建失败:', error);
        },
      });
    },
    [rpdId, mutation, onClose],
  );

  return { submitEditForm };
};

// Hook: 处理编辑模式下的AI生成状态
export const useEditAIGeneration = (
  state: {
    currentGroup: CurrentGroup;
    setCurrentGroup: React.Dispatch<React.SetStateAction<CurrentGroup>>;
    selectedImageIndex: number | null;
    hasUploadedImages: boolean;
    isGenerating: boolean;
    setIsGenerating: (generating: boolean) => void;
  },
  form: UseFormReturn<RPDVersionFormData>,
) => {
  const canGenerate = React.useMemo(() => {
    if (!state.hasUploadedImages || state.selectedImageIndex === null || !state.currentGroup.tag.trim()) {
      return false;
    }

    const referenceImages = form.getValues('reference_images');
    return Boolean(referenceImages && referenceImages.length > 0 && state.selectedImageIndex < referenceImages.length);
  }, [state.hasUploadedImages, state.selectedImageIndex, state.currentGroup.tag, form]);

  const prepareGenerationParams = React.useCallback(() => {
    if (!canGenerate) {
      return null;
    }

    const referenceImages = form.getValues('reference_images');
    const selectedImageUrl = referenceImages[state.selectedImageIndex!];

    return {
      tag: state.currentGroup.tag.trim(),
      image_url: selectedImageUrl,
    };
  }, [canGenerate, form, state.currentGroup.tag, state.selectedImageIndex]);

  const updateFromResponse = React.useCallback(
    (response: { jpn_visual_characteristics?: string; jpn_key_considerations?: string }) => {
      state.setCurrentGroup((prev) => ({
        ...prev,
        visual_characteristics: response.jpn_visual_characteristics || '',
        key_considerations: response.jpn_key_considerations || '',
      }));
    },
    [state.setCurrentGroup],
  );

  return {
    canGenerate,
    prepareGenerationParams,
    updateFromResponse,
    isGenerating: state.isGenerating,
    setIsGenerating: state.setIsGenerating,
  };
};

// Hook: 处理编辑模式下的图片管理
export const useEditImageManagement = (
  form: UseFormReturn<RPDVersionFormData>,
  state: {
    hasUploadedImages: boolean;
    setHasUploadedImages: (has: boolean) => void;
    selectedImageIndex: number | null;
    setSelectedImageIndex: (index: number | null) => void;
  },
) => {
  const handleImagesChange = React.useCallback(
    (s3Paths: string[]) => {
      form.setValue('reference_images', s3Paths, { shouldDirty: true });
      const hasImages = s3Paths.length > 0;
      state.setHasUploadedImages(hasImages);

      // 如果没有图片了或选择的索引超出范围，清除选择的索引
      if (!hasImages || (state.selectedImageIndex !== null && state.selectedImageIndex >= s3Paths.length)) {
        state.setSelectedImageIndex(null);
      }
    },
    [state.setHasUploadedImages, state.selectedImageIndex, state.setSelectedImageIndex],
  );

  const selectImage = React.useCallback(
    (index: number) => {
      const referenceImages = form.getValues('reference_images') || [];
      if (index >= 0 && index < referenceImages.length) {
        state.setSelectedImageIndex(index);
      }
    },
    [form, state.setSelectedImageIndex],
  );

  return {
    handleImagesChange,
    selectImage,
    selectedImageIndex: state.selectedImageIndex,
    hasUploadedImages: state.hasUploadedImages,
  };
};

// Hook: 处理编辑模式下的验证逻辑
export const useEditValidation = (
  currentRPD: CurrentRPDData | null | undefined,
  form: UseFormReturn<RPDVersionFormData>,
  state: {
    confirmedGroups: CurrentGroup[];
    descriptionFormat: DescriptionFormat;
  },
) => {
  const canSubmit = React.useMemo(() => {
    if (!currentRPD || !form.formState.isDirty) {
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
  }, [currentRPD, form.formState.isDirty, form, state.confirmedGroups.length, state.descriptionFormat]);

  const hasChanges = form.formState.isDirty;

  const isValid = form.formState.isValid;

  return {
    canSubmit,
    hasChanges,
    isValid,
  };
};

// Hook: 处理编辑模式下的格式管理
export const useEditFormatManagement = (
  currentRPD: CurrentRPDData | null | undefined,
  state: {
    descriptionFormat: DescriptionFormat;
    setDescriptionFormat: (format: DescriptionFormat) => void;
    isFormatLocked: boolean;
    setIsFormatLocked: (locked: boolean) => void;
  },
) => {
  const isGeneralNgReview = React.useMemo(() => {
    return currentRPD?.key === 'general_ng_review';
  }, [currentRPD]);

  const lockFormat = React.useCallback(
    (format: DescriptionFormat) => {
      state.setDescriptionFormat(format);
      state.setIsFormatLocked(true);
    },
    [state.setDescriptionFormat, state.setIsFormatLocked],
  );

  const unlockFormat = React.useCallback(() => {
    state.setIsFormatLocked(false);
  }, [state.setIsFormatLocked]);

  return {
    isGeneralNgReview,
    isFormatLocked: state.isFormatLocked,
    descriptionFormat: state.descriptionFormat,
    lockFormat,
    unlockFormat,
  };
};

// Hook: 处理编辑模式下的错误处理
export const useEditErrorHandling = () => {
  const handleGenerationError = React.useCallback((error: unknown) => {
    console.error('生成描述时发生错误:', error);

    const errorMessage = error instanceof Error ? error.message : '生成描述时发生未知错误';

    // 这里可以添加toast通知或其他错误处理逻辑
    return {
      title: 'AI生成失败',
      description: errorMessage,
      variant: 'destructive' as const,
    };
  }, []);

  const handleSubmissionError = React.useCallback((error: Error) => {
    console.error('提交表单时发生错误:', error);

    return {
      title: 'RPDバージョン作成エラー',
      description: error.message || '予期せぬエラーが発生しました',
      variant: 'destructive' as const,
    };
  }, []);

  const handleValidationError = React.useCallback((field: string, message: string) => {
    console.warn(`验证错误 - ${field}: ${message}`);

    return {
      field,
      message,
    };
  }, []);

  return {
    handleGenerationError,
    handleSubmissionError,
    handleValidationError,
  };
};

// Hook: 组合所有编辑相关的状态和操作
export const useEditModalState = (
  form: UseFormReturn<RPDVersionFormData>,
  currentRPD: CurrentRPDData | null | undefined,
) => {
  // 基础状态
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [tagInput, setTagInput] = React.useState('');
  const [hasUploadedImages, setHasUploadedImages] = React.useState(false);
  const [currentGroup, setCurrentGroup] = React.useState<CurrentGroup>(EDIT_EMPTY_GROUP);
  const [confirmedGroups, setConfirmedGroups] = React.useState<CurrentGroup[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState<number | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [descriptionFormat, setDescriptionFormat] = React.useState<DescriptionFormat>('traditional');
  const [isFormatLocked, setIsFormatLocked] = React.useState(false);

  const state = {
    isSubmitting,
    setIsSubmitting,
    tagInput,
    setTagInput,
    hasUploadedImages,
    setHasUploadedImages,
    currentGroup,
    setCurrentGroup,
    confirmedGroups,
    setConfirmedGroups,
    selectedImageIndex,
    setSelectedImageIndex,
    isGenerating,
    setIsGenerating,
    descriptionFormat,
    setDescriptionFormat,
    isFormatLocked,
    setIsFormatLocked,
  };

  // 组合hooks
  const reset = useEditModalReset(form, state);
  const groupOps = useEditGroupOperations(form, state);
  const tagMgmt = useEditTagManagement(form, state);
  const validation = useEditValidation(currentRPD, form, state);
  const formatMgmt = useEditFormatManagement(currentRPD, state);
  const imageMgmt = useEditImageManagement(form, state);
  const aiGen = useEditAIGeneration(state, form);
  const errorHandling = useEditErrorHandling();

  return {
    state,
    ...reset,
    ...groupOps,
    ...tagMgmt,
    ...validation,
    ...formatMgmt,
    ...imageMgmt,
    ...aiGen,
    ...errorHandling,
  };
};
