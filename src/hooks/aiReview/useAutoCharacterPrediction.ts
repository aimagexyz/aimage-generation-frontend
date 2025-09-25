import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { CharacterDetail } from '@/api/charactersService';
import type { components } from '@/api/schemas';
import { aiPredictionService } from '@/services/aiPredictionService';

type SubtaskOut = components['schemas']['SubtaskOut'];

interface UseAutoCharacterPredictionProps {
  subtaskId: string;
  subtask: SubtaskOut | null;
  availableCharacters: CharacterDetail[];
  enabled?: boolean;
}

export function useAutoCharacterPrediction({
  subtaskId,
  subtask,
  availableCharacters,
  enabled = true,
}: UseAutoCharacterPredictionProps) {
  const queryClient = useQueryClient();
  // 使用useRef跟踪已经开始预测的subtask，避免状态更新导致的重新渲染
  const hasStartedPredictionRef = useRef<Set<string>>(new Set());
  // 添加独立的预测状态，不依赖其他状态
  const [isPredictingState, setIsPredictingState] = useState(false);

  // 检查是否需要自动预测（纯函数，基于数据库状态判断）
  const shouldAutoPredictCharacter = useCallback(
    (currentSubtask: SubtaskOut): boolean => {
      // 如果已经为这个subtask开始过预测，不再重复预测
      if (hasStartedPredictionRef.current.has(subtaskId)) {
        return false;
      }
      // 只对图片类型的subtask进行预测
      if (currentSubtask.content?.task_type !== 'picture') {
        return false;
      }

      const PLACEHOLDER_CHARACTER_ID = '00000000-0000-0000-0000-000000000000';
      const validUserIds = currentSubtask.user_selected_character_ids || [];
      const validAiIds = currentSubtask.character_ids || [];

      // 检查是否正在处理中
      if (validAiIds.includes('PROCESSING')) {
        console.log('Character prediction is processing, skipping auto prediction');
        return false;
      }

      // 检查是否预测失败
      if (validAiIds.includes('FAILED')) {
        console.log('Character prediction failed, skipping auto prediction');
        return false;
      }

      // 检查是否包含placeholder（表示之前预测失败过）
      const hasPlaceholder =
        validAiIds.includes(PLACEHOLDER_CHARACTER_ID) || validUserIds.includes(PLACEHOLDER_CHARACTER_ID);
      if (hasPlaceholder) {
        console.log('Found placeholder character ID, skipping prediction');
        return false;
      }

      // 过滤掉特殊状态值，检查是否已有有效的角色ID
      const statusValues = ['PROCESSING', 'FAILED', PLACEHOLDER_CHARACTER_ID];
      const filteredAiIds = validAiIds.filter((id: string) => !statusValues.includes(id));
      const hasValidCharacterIds = validUserIds.length > 0 || filteredAiIds.length > 0;
      console.log('shouldAutoPredictCharacter:', {
        subtaskId: currentSubtask.id,
        hasValidCharacterIds,
        validUserIds: validUserIds.length,
        validAiIds: validAiIds.length,
      });

      return !hasValidCharacterIds;
    },
    [subtaskId],
  ); // 添加subtaskId依赖

  // 立即设置预测状态，避免UI闪烁
  useEffect(() => {
    if (!subtask || !enabled || !availableCharacters.length) {
      return;
    }

    // 如果需要预测，立即设置预测状态
    if (shouldAutoPredictCharacter(subtask)) {
      console.log(`🎯 Will start character prediction for subtask: ${subtaskId}`);
      setIsPredictingState(true);
    }
  }, [subtask, enabled, availableCharacters, shouldAutoPredictCharacter, subtaskId]);

  // 简化的自动预测逻辑
  useEffect(() => {
    const performAutoPrediction = async () => {
      // 基本检查
      if (!subtask || !enabled || !availableCharacters.length) {
        return;
      }

      // 检查是否需要预测
      if (!shouldAutoPredictCharacter(subtask)) {
        return;
      }

      console.log(`🚀 Starting character prediction for subtask: ${subtaskId}`);

      // 标记已经开始预测
      hasStartedPredictionRef.current.add(subtaskId);

      try {
        // 使用新的API来启动预测任务
        const success = await aiPredictionService.initiateCharacterPrediction(subtaskId);
        if (success) {
          console.log('✅ Character prediction task initiated for subtask:', subtaskId);
        } else {
          console.error('❌ Failed to initiate character prediction for subtask:', subtaskId);
        }

        // 立即失效缓存以获取处理状态
        if (subtask?.task_id) {
          await queryClient.invalidateQueries({
            queryKey: ['task-subtasks', subtask.task_id],
          });
        }
      } catch (error) {
        console.error('❌ Auto character prediction error:', error);
        // 错误时也要设置预测状态为false
        setIsPredictingState(false);
      }
    };

    void performAutoPrediction();
  }, [subtaskId, subtask, availableCharacters, enabled, queryClient, shouldAutoPredictCharacter]);

  // 当subtask切换时，重置预测状态
  useEffect(() => {
    setIsPredictingState(false);
  }, [subtaskId]);

  // 轮询逻辑 - 当状态为PROCESSING时定期检查更新
  useEffect(() => {
    const characterIds = subtask?.character_ids || [];
    const isProcessing = characterIds.includes('PROCESSING');

    if (isProcessing) {
      console.log(`🔄 Character prediction in progress for subtask ${subtaskId}, starting polling...`);

      const pollInterval = setInterval(async () => {
        try {
          if (subtask?.task_id) {
            await queryClient.invalidateQueries({
              queryKey: ['task-subtasks', subtask.task_id],
            });
          }
        } catch (error) {
          console.error('❌ Character prediction polling error:', error);
        }
      }, 2000); // 每2秒检查一次

      return () => {
        console.log(`⏹️ Stopping character prediction polling for subtask ${subtaskId}`);
        clearInterval(pollInterval);
        // 轮询结束时重置预测状态
        setIsPredictingState(false);
      };
    } else {
      // 如果不再处理中，确保重置预测状态
      setIsPredictingState(false);
    }
  }, [subtask?.character_ids, subtaskId, subtask?.task_id, queryClient]);

  // 检查是否有 placeholder（预测失败）
  const hasPlaceholder = subtask
    ? (() => {
        const PLACEHOLDER_CHARACTER_ID = '00000000-0000-0000-0000-000000000000';
        const validUserIds = subtask.user_selected_character_ids || [];
        const validAiIds = subtask.character_ids || [];
        return validAiIds.includes(PLACEHOLDER_CHARACTER_ID) || validUserIds.includes(PLACEHOLDER_CHARACTER_ID);
      })()
    : false;

  // 检查是否正在处理中
  const characterIds = subtask?.character_ids || [];
  const isProcessing = characterIds.includes('PROCESSING');
  const hasFailed = characterIds.includes('FAILED');

  // 计算实际的预测状态
  const isActuallyPredicting = isPredictingState || isProcessing;

  return {
    isPredicting: isActuallyPredicting, // 包含后台处理状态
    predictionFailed: hasPlaceholder || hasFailed,
  };
}
