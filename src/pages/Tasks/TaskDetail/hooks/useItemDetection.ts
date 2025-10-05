import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type AiDetectionData, detectObjectsInImage } from '@/api/itemsService';
import type { components } from '@/api/schemas';

type SubtaskOut = components['schemas']['SubtaskOut'];

interface UseItemDetectionProps {
  projectId: string;
  subtaskId: string;
  subtaskImageUrl?: string | null;
  subtasks?: SubtaskOut[]; // 用于获取ai_detection数据
  taskId?: string; // 添加taskId用于正确的缓存失效
}

export interface DetectedItem {
  label: string;
  box_2d: [number, number, number, number];
  confidence?: number;
}

export function useItemDetection({
  projectId,
  subtaskId,
  subtaskImageUrl,
  subtasks = [],
  taskId,
}: UseItemDetectionProps) {
  const queryClient = useQueryClient();
  const [selectedItemBbox, setSelectedItemBbox] = useState<[number, number, number, number] | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  // 使用useRef跟踪已经开始检测的subtask，避免状态更新导致的重新渲染
  const hasStartedDetectionRef = useRef<Set<string>>(new Set());
  // 添加独立的检测状态，不依赖mutation的isPending
  const [isDetectingState, setIsDetectingState] = useState(false);

  // 从subtasks中获取当前subtask的ai_detection数据
  const currentSubtask = subtasks.find((s) => s.id === subtaskId);
  const aiDetection = currentSubtask?.ai_detection as AiDetectionData | null | undefined;

  // 监控数据变化
  React.useEffect(() => {
    console.log('📊 Data change:', {
      subtaskId,
      boundingBoxesCount: aiDetection?.bounding_boxes?.length || 0,
    });
  }, [subtaskId, currentSubtask, aiDetection]);

  // 检查是否需要自动检测的函数
  const checkShouldAutoDetect = useCallback(() => {
    // 如果已经为这个subtask开始过检测，不再重复检测
    if (hasStartedDetectionRef.current.has(subtaskId)) {
      return false;
    }

    // 如果没有ai_detection数据，需要检测
    if (!aiDetection) {
      return true;
    }

    // 如果ai_detection是空对象{}，需要检测
    if (typeof aiDetection === 'object' && Object.keys(aiDetection).length === 0) {
      return true;
    }

    // 如果正在处理中，不需要重复检测
    if (aiDetection.status === 'processing') {
      return false;
    }

    // 如果有错误信息，表示已经尝试过检测但失败了，不再重复检测
    if (aiDetection.error || aiDetection.status === 'failed') {
      return false;
    }

    // 如果已经完成，不需要重复检测
    if (aiDetection.status === 'completed') {
      return false;
    }

    // 如果有bounding_boxes字段存在（即使为undefined），表示已经尝试过检测了
    if ('bounding_boxes' in aiDetection) {
      return false;
    }

    // 如果有其他检测相关字段（如detected_at, detection_version等），表示已经处理过了
    return !(aiDetection.detected_at || aiDetection.detection_version || aiDetection.total !== undefined);
  }, [subtaskId, aiDetection]); // 移除hasStartedDetection依赖，使用ref避免重新创建

  // 物品检测mutation
  const detectMutation = useMutation({
    mutationFn: async () => {
      if (!subtaskImageUrl) {
        throw new Error('No image URL provided');
      }
      return detectObjectsInImage(projectId, {
        image_url: subtaskImageUrl,
        subtask_id: subtaskId,
        limit: 20,
      });
    },
    onSuccess: async () => {
      console.log('✅ Detection completed');

      // 立即设置检测状态为false
      setIsDetectingState(false);

      try {
        const actualTaskId = currentSubtask?.task_id || taskId;

        if (actualTaskId) {
          await queryClient.invalidateQueries({
            queryKey: ['task-subtasks', actualTaskId],
          });
        } else {
          await queryClient.invalidateQueries({
            queryKey: ['task-subtasks'],
          });
        }

        console.log('🎯 Data should update automatically');
      } catch (error) {
        console.error('❌ Cache error:', error);
      }
    },
    onError: async (error) => {
      console.error('❌ Detection failed:', error);

      // 错误时也要设置检测状态为false
      setIsDetectingState(false);

      try {
        const actualTaskId = currentSubtask?.task_id || taskId;
        if (actualTaskId) {
          await queryClient.invalidateQueries({
            queryKey: ['task-subtasks', actualTaskId],
          });
        }
      } catch (cacheError) {
        console.error('Cache error:', cacheError);
      }
    },
  });

  // 稳定的检测函数引用
  const triggerDetection = useCallback(() => {
    if (subtaskImageUrl && !detectMutation.isPending && !isDetectingState) {
      console.log(`🚀 Starting detection for subtask: ${subtaskId}`);

      // 立即设置检测状态为true
      setIsDetectingState(true);

      hasStartedDetectionRef.current.add(subtaskId);
      detectMutation.mutate();
    }
  }, [subtaskImageUrl, detectMutation, subtaskId, isDetectingState]); // 移除hasStartedDetection依赖

  // 当subtask切换时，重置选择状态和检测状态
  useEffect(() => {
    setSelectedItemBbox(null);
    setSelectedLabel(null);
    setIsDetectingState(false); // 重置检测状态
  }, [subtaskId]);

  // 自动检测逻辑
  useEffect(() => {
    const shouldAutoDetect = checkShouldAutoDetect();
    if (shouldAutoDetect) {
      triggerDetection();
    }
  }, [checkShouldAutoDetect, triggerDetection, subtaskId]); // 包含subtaskId依赖

  // 轮询逻辑 - 当状态为processing时定期检查更新
  useEffect(() => {
    if (aiDetection?.status === 'processing') {
      console.log(`🔄 Detection in progress for subtask ${subtaskId}, starting polling...`);

      const pollInterval = setInterval(async () => {
        try {
          const actualTaskId = currentSubtask?.task_id || taskId;
          if (actualTaskId) {
            await queryClient.invalidateQueries({
              queryKey: ['task-subtasks', actualTaskId],
            });
          }
        } catch (error) {
          console.error('❌ Polling error:', error);
        }
      }, 2000); // 每2秒检查一次

      return () => {
        console.log(`⏹️ Stopping polling for subtask ${subtaskId}`);
        clearInterval(pollInterval);
      };
    }
  }, [aiDetection?.status, subtaskId, currentSubtask?.task_id, taskId, queryClient]);

  // 获取检测到的物品（需要在推断状态之前定义）
  const detectedItems: DetectedItem[] = aiDetection?.bounding_boxes || [];

  // 获取唯一的标签
  const detectedLabels = Array.from(new Set(detectedItems.map((item) => item.label)));

  // 调试日志
  console.log('Detection Results Debug:', {
    detectedItems,
    detectedLabels,
    aiDetectionKeys: aiDetection ? Object.keys(aiDetection) : [],
  });

  // 处理标签点击
  const handleLabelClick = (label: string) => {
    const item = detectedItems.find((item) => item.label === label);
    if (item) {
      // 如果点击的是已选中的标签，则取消选择
      if (selectedLabel === label) {
        setSelectedItemBbox(null);
        setSelectedLabel(null);
      } else {
        // 选择新的标签
        setSelectedItemBbox(item.box_2d);
        setSelectedLabel(label);
      }
    }
  };

  // 清除选择
  const clearSelection = () => {
    setSelectedItemBbox(null);
    setSelectedLabel(null);
  };

  // 推断检测状态（需要在isActuallyDetecting之前）
  let inferredStatus = aiDetection?.status;
  if (!inferredStatus) {
    if (aiDetection?.error) {
      inferredStatus = 'failed';
    } else if (detectedItems.length > 0 || aiDetection?.total !== undefined) {
      inferredStatus = 'completed';
    } else {
      inferredStatus = 'processing';
    }
  }

  // 计算实际的检测状态
  const isActuallyDetecting = isDetectingState || inferredStatus === 'processing';

  // 关键状态调试
  console.log('🎯 UI State:', {
    isDetecting: isActuallyDetecting,
    hasData: !!aiDetection && !aiDetection.error && inferredStatus !== 'failed',
    itemCount: detectedItems.length,
    detectionStatus: inferredStatus,
  });

  return {
    detectedItems,
    detectedLabels,
    selectedItemBbox,
    selectedLabel,
    isDetecting: isActuallyDetecting, // 包含后台处理状态
    detectionError: (aiDetection?.error || detectMutation.error) ?? null,
    hasDetectionData: !!aiDetection && !aiDetection.error && inferredStatus === 'completed',
    handleLabelClick,
    clearSelection,
    retryDetection: () => detectMutation.mutate(),
  };
}
