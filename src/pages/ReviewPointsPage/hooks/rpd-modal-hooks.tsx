// 文件位置: rpd-create-hooks.ts
// 移除所有any类型的版本

import React from 'react';

import { canGenerateWithImage, EMPTY_GROUP, FORM_DEFAULTS, isValidGroup } from '../constants';
import type {
  AIGenerateResponse,
  CreateRPDMutation,
  DescriptionFormat,
  EngGroupInfo,
  FormType,
  GroupInfo,
  GroupOperationState,
  ModalSetters,
  ReviewPointDefinitionCreate,
  RPDCreateFormData,
  VisualPromptState,
} from '../types/rpd-create-types';
import { buildJapaneseDescription, processGeneralNgReviewData, updateEngDescriptionGroups } from '../utils';

// Hook: 处理模态框重置逻辑
export const useModalReset = (form: FormType, setters: ModalSetters, defaultKey: string) => {
  const resetAllState = React.useCallback(() => {
    console.log('resetAllState called - this will reset all state including descriptionFormat');
    console.trace('resetAllState call stack'); // 显示调用堆栈

    form.reset({
      ...FORM_DEFAULTS,
      key: defaultKey,
    });
    setters.setSelectedKey(defaultKey);
    setters.setHasUploadedImages(false);
    setters.setUploadedImages([]);
    setters.setCurrentGroup(EMPTY_GROUP);
    setters.setConfirmedGroups([]);
    setters.setEngDescriptionGroups([]);
    setters.setSelectedImageIndex(null);
    setters.setIsGenerating(false);
    setters.setDescriptionFormat('traditional');
  }, [defaultKey]); // setters和form都是稳定的函数引用

  return { resetAllState };
};

// Hook: 处理组操作
export const useGroupOperations = (form: FormType, state: GroupOperationState) => {
  const updateFormWithGroups = React.useCallback(
    (newGroups: GroupInfo[]) => {
      state.setConfirmedGroups(newGroups);
      form.setValue('ai_description_groups', newGroups, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });

      if (newGroups.length > 0) {
        const jpnDescriptionString = buildJapaneseDescription(newGroups);
        form.setValue('user_instruction', jpnDescriptionString, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
      } else {
        form.setValue('user_instruction', '', {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    },
    [form, state.setConfirmedGroups],
  );

  const confirmCurrentGroup = React.useCallback(() => {
    if (!isValidGroup(state.currentGroup)) {
      return;
    }

    const newConfirmedGroups: GroupInfo[] = [...state.confirmedGroups, state.currentGroup];
    updateFormWithGroups(newConfirmedGroups);
    state.setCurrentGroup(EMPTY_GROUP);
    state.setSelectedImageIndex(null);
  }, [
    state.confirmedGroups,
    state.currentGroup,
    state.setCurrentGroup,
    state.setSelectedImageIndex,
    updateFormWithGroups,
  ]);

  const removeGroup = React.useCallback(
    (index: number) => {
      const newConfirmedGroups = state.confirmedGroups.filter((_, i) => i !== index);
      updateFormWithGroups(newConfirmedGroups);
    },
    [state.confirmedGroups, updateFormWithGroups],
  );

  return {
    confirmCurrentGroup,
    removeGroup,
    updateFormWithGroups,
  };
};

// AI生成返回参数类型
interface AIGenerationParams {
  tag: string;
  imageUrl: string;
  onSuccess: (response: AIGenerateResponse) => void;
  onError: (error: unknown) => void;
  onFinally: () => void;
}

// Hook: 处理AI生成 - 返回参数而不是直接调用API
export const useAIGeneration = (
  currentGroup: GroupInfo,
  setCurrentGroup: React.Dispatch<React.SetStateAction<GroupInfo>>,
  setEngDescriptionGroups: React.Dispatch<React.SetStateAction<EngGroupInfo[]>>,
  setIsGenerating: (generating: boolean) => void,
  form: FormType,
  selectedImageIndex: number | null,
  hasUploadedImages: boolean,
) => {
  const generateDescription = React.useCallback((): AIGenerationParams | null => {
    // 验证条件
    if (!canGenerateWithImage(hasUploadedImages, selectedImageIndex, currentGroup.tag)) {
      return null;
    }

    const referenceImages = form.getValues('reference_images');
    if (!referenceImages?.length || selectedImageIndex === null || selectedImageIndex >= referenceImages.length) {
      return null;
    }

    const selectedImageUrl = referenceImages[selectedImageIndex];
    setIsGenerating(true);

    return {
      tag: currentGroup.tag.trim(),
      imageUrl: selectedImageUrl,
      onSuccess: (response: AIGenerateResponse) => {
        // 更新当前组
        setCurrentGroup((prev) => ({
          ...prev,
          visual_characteristics: response.jpn_visual_characteristics,
          key_considerations: response.jpn_key_considerations,
        }));

        // 更新英语版本
        const newEngGroup: EngGroupInfo = {
          tag: currentGroup.tag.trim(),
          visual_characteristics: response.eng_visual_characteristics,
          key_considerations: response.eng_key_considerations,
        };

        setEngDescriptionGroups((prev) => updateEngDescriptionGroups(prev, newEngGroup));
      },
      onError: (error: unknown) => {
        console.error('生成描述时发生错误:', error);
      },
      onFinally: () => {
        setIsGenerating(false);
      },
    };
  }, [
    hasUploadedImages,
    selectedImageIndex,
    currentGroup,
    form,
    setIsGenerating,
    setCurrentGroup,
    setEngDescriptionGroups,
  ]);

  return { generateDescription };
};

// Hook: 处理表单提交
export const useFormSubmission = (projectId: string, createRPDMutation: CreateRPDMutation, onSuccess: () => void) => {
  const submitForm = React.useCallback(
    (
      formData: RPDCreateFormData,
      descriptionFormat: DescriptionFormat,
      confirmedGroups: GroupInfo[],
      engDescriptionGroups: EngGroupInfo[],
      visualPromptState?: VisualPromptState, // 添加visual prompt state参数
    ) => {
      const createData: ReviewPointDefinitionCreate = {
        ...formData,
        project_id: projectId,
      };

      if (formData.key === 'general_ng_review') {
        processGeneralNgReviewData(formData, createData, descriptionFormat, confirmedGroups, engDescriptionGroups);
      } else if (formData.key === 'visual_review' && visualPromptState?.rewrittenPromptEng) {
        // 为visual_review设置英语版本的prompt
        // eng_description_for_ai: Deprecated, using description_for_ai instead
      }

      createRPDMutation.mutate(createData, {
        onSuccess,
      });
    },
    [projectId, createRPDMutation, onSuccess],
  );

  return { submitForm };
};
