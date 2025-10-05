import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { CharacterDetail } from '@/api/charactersService';
import type { components } from '@/api/schemas';
import { updateSubtaskCharacters } from '@/api/tasks';
import { useToast } from '@/components/ui/use-toast';
import { useAutoCharacterPrediction } from '@/hooks/aiReview/useAutoCharacterPrediction';

type SubtaskOut = components['schemas']['SubtaskOut'];

interface UseSubtaskCharactersProps {
  subtaskId: string;
  subtasks?: SubtaskOut[];
  availableCharacters: CharacterDetail[];
  taskId?: string; // 添加taskId以便更准确地更新缓存
}

export function useSubtaskCharacters({
  subtaskId,
  subtasks,
  availableCharacters,
}: Omit<UseSubtaskCharactersProps, 'taskId'>) {
  const [displayCharacters, setDisplayCharacters] = useState<CharacterDetail[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterDetail | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 获取当前subtask
  const currentSubtask = subtasks?.find((s) => s.id === subtaskId) || null;

  // 从subtask数据中加载已保存的角色选择
  useEffect(() => {
    console.log('useSubtaskCharacters useEffect triggered', {
      subtaskId,
      subtasksLength: subtasks?.length,
      availableCharactersLength: availableCharacters.length,
    });

    if (!subtasks || !subtaskId || availableCharacters.length === 0) {
      return;
    }

    const currentSubtask = subtasks.find((s) => s.id === subtaskId);
    if (!currentSubtask) {
      console.warn('Current subtask not found:', subtaskId);
      return;
    }

    // Placeholder ID 常量
    const PLACEHOLDER_CHARACTER_ID = '00000000-0000-0000-0000-000000000000';

    // 优先使用用户手动选择的角色，其次使用AI预测的角色
    const savedCharacterIds =
      currentSubtask.user_selected_character_ids && currentSubtask.user_selected_character_ids.length > 0
        ? currentSubtask.user_selected_character_ids
        : currentSubtask.character_ids || [];
    // console.log('Found saved character IDs:', savedCharacterIds, {
    //   userSelected: currentSubtask.user_selected_character_ids,
    //   aiPredicted: currentSubtask.character_ids,
    // });

    // 过滤掉placeholder ID
    const validCharacterIds = savedCharacterIds.filter((id) => id !== PLACEHOLDER_CHARACTER_ID);
    // console.log('Valid character IDs (filtered placeholders):', validCharacterIds);

    if (validCharacterIds.length > 0) {
      const savedCharacters = validCharacterIds
        .map((id) => availableCharacters.find((char) => char.id === id))
        .filter((char): char is CharacterDetail => char !== undefined);
      // 可以在这里添加额外的过滤条件，比如：
      // .filter((char) => char.image_path) // 只显示有图片的角色
      console.log('Setting display characters:', savedCharacters);
      setDisplayCharacters(savedCharacters);

      // 如果只有一个角色，自动选中它
      if (savedCharacters.length === 1) {
        setSelectedCharacter(savedCharacters[0]);
      }
    } else {
      // 如果没有有效的角色，清空状态
      console.log('No valid characters, clearing state');
      setDisplayCharacters([]);
      setSelectedCharacter(null);
    }
  }, [subtaskId, subtasks, availableCharacters]);

  // 保存角色选择到后端
  const { mutate: saveCharacterSelection, isPending: isSaving } = useMutation({
    mutationFn: async (characterIds: string[]) => {
      return updateSubtaskCharacters(subtaskId, characterIds);
    },
    onSuccess: (updatedSubtask) => {
      // 更新本地缓存
      queryClient.setQueryData(['task-subtasks', updatedSubtask.task.id], (oldData: SubtaskOut[]) => {
        if (!oldData) {
          return oldData;
        }
        return oldData.map((subtask) =>
          subtask.id === subtaskId
            ? { ...subtask, user_selected_character_ids: updatedSubtask.user_selected_character_ids }
            : subtask,
        );
      });

      toast({
        title: '保存成功',
        description: '角色选择已保存',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Save character selection error:', error);
      toast({
        title: '保存失败',
        description: '角色选择保存失败，请重试',
        variant: 'destructive',
      });
    },
  });

  // 处理角色选择变化
  const handleCharacterSelect = (character: CharacterDetail | null) => {
    setSelectedCharacter(character);
  };

  // 处理添加角色
  const handleCharacterAdd = (character: CharacterDetail) => {
    const newDisplayCharacters = [...displayCharacters, character];
    setDisplayCharacters(newDisplayCharacters);

    // 保存到后端
    const characterIds = newDisplayCharacters.map((c) => c.id);
    saveCharacterSelection(characterIds);
  };

  // 处理删除角色
  const handleCharacterRemove = (character: CharacterDetail) => {
    const newDisplayCharacters = displayCharacters.filter((c) => c.id !== character.id);
    setDisplayCharacters(newDisplayCharacters);

    // 如果删除的是当前选中的角色，清空选择
    if (selectedCharacter?.id === character.id) {
      setSelectedCharacter(null);
    }

    // 保存到后端
    const characterIds = newDisplayCharacters.map((c) => c.id);
    saveCharacterSelection(characterIds);
  };

  // 移除handleMultiplePredictions，因为现在预测完成后不需要回调处理
  // AI预测的结果会直接保存到数据库，通过正常的数据刷新机制更新UI

  // 自动预测hook（简化版本，无需回调）
  const { isPredicting } = useAutoCharacterPrediction({
    subtaskId,
    subtask: currentSubtask,
    availableCharacters,
    enabled: availableCharacters.length > 0,
  });

  return {
    displayCharacters,
    selectedCharacter,
    isSaving,
    isPredicting,
    handleCharacterSelect,
    handleCharacterAdd,
    handleCharacterRemove,
  };
}
