import { useCallback, useEffect, useRef, useState } from 'react';

import { aiReviewsService } from '@/api/aiReviewsService';
import type { CharacterDetail } from '@/api/charactersService';
import type { components } from '@/api/schemas';
import { useLatestAiReview } from '@/hooks/aiReview/useLatestAiReview';
import { aiPredictionService } from '@/services/aiPredictionService';
import type {
  AiDetectedElements,
  AiReviewFinding,
  AiReviewInDB,
  AiReviewResult,
  AiReviewSection,
  DetectedElement,
  DetectedElementType,
  ViewpointKey,
} from '@/types/aiReview';
import { FindingArea } from '@/types/AiReviewFinding';

// Helper function to update element status in a list
const updateElementStatusInList = (
  elements: DetectedElement[],
  targetId: string,
  status: DetectedElement['uiStatus'],
): DetectedElement[] => elements.map((el) => (el.id === targetId ? { ...el, uiStatus: status } : el));

// Removed mockReviewDataFactory

interface UseAiReviewProps {
  currentSubtaskId: string;
  // subtask: SubtaskData | undefined; // Removed unused prop
  // Add character prediction props
  availableCharacters?: CharacterDetail[];
  onCharacterSelect?: (character: CharacterDetail | null) => void;
  autoPredict?: boolean; // Enable/disable automatic character prediction
}

// --- START CONVERSION FUNCTION ---
// 添加辅助函数来安全地处理tag字段
const extractTagArray = (findingEntry: Record<string, unknown>): string[] => {
  if (findingEntry && typeof findingEntry === 'object' && 'tag' in findingEntry) {
    const tag = findingEntry.tag;
    if (typeof tag === 'string') {
      return [tag];
    }
  }
  return [];
};

// 辅助函数：检测是否为空的 bounding box（全为0）
const isEmptyBoundingBox = (boundingBox: number[]): boolean => {
  return boundingBox.length >= 4 && boundingBox.every((coord) => coord === 0);
};

// 辅助函数：检测区域是否为空（所有坐标都为0）
const isEmptyArea = (area: { x: number; y: number; width: number; height: number }): boolean => {
  return area.x === 0 && area.y === 0 && area.width === 0 && area.height === 0;
};

// 添加辅助函数，将FindingArea转换为AiReviewFindingArea
const mapAreaToAiReviewArea = (
  area: components['schemas']['FindingArea'] | FindingArea | undefined | null,
): { x: number; y: number; width: number; height: number } | undefined => {
  if (!area) {
    return undefined;
  }

  // 处理API schema的FindingArea格式 (x, y, width, height)
  if ('x' in area && 'y' in area && 'width' in area && 'height' in area) {
    const areaObj = {
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
    };
    // 如果是空区域，返回 undefined
    if (isEmptyArea(areaObj)) {
      return undefined;
    }
    return areaObj;
  }

  // 处理本地类型的FindingArea格式 (bounding_box)
  if (
    'bounding_box' in area &&
    area.bounding_box &&
    Array.isArray(area.bounding_box) &&
    area.bounding_box.length >= 4
  ) {
    // 如果是空的 bounding box，返回 undefined
    if (isEmptyBoundingBox(area.bounding_box)) {
      return undefined;
    }

    const [x_min, y_min, x_max, y_max] = area.bounding_box;
    return {
      x: x_min,
      y: y_min,
      width: x_max - x_min,
      height: y_max - y_min,
    };
  }

  return undefined;
};

// 将AiReview（从API获取的最新数据）转换为AiReviewResult
const mapAiReviewToResult = (apiReviewData: components['schemas']['AiReview']): AiReviewResult => {
  // Placeholder for overallScore
  const overallScore = 0;

  // Map detected_elements
  const mappedDetectedElements: AiDetectedElements = {
    characters: [],
    objects: [],
    texts: [],
  };

  // 如果有detected_elements_summary，使用它
  if (apiReviewData.detected_elements_summary?.elements) {
    // 从elements数组中按类型分组
    apiReviewData.detected_elements_summary.elements.forEach((element) => {
      const mappedElement: DetectedElement = {
        id: element.name, // 使用name作为id
        type: element.label as DetectedElementType,
        label: element.name,
        bounding_box: element.area
          ? [element.area.x, element.area.y, element.area.x + element.area.width, element.area.y + element.area.height]
          : undefined,
        uiStatus: 'pending',
      };

      if (element.label === 'character') {
        mappedDetectedElements.characters.push(mappedElement);
      } else if (element.label === 'object') {
        mappedDetectedElements.objects.push(mappedElement);
      } else if (element.label === 'text') {
        mappedDetectedElements.texts.push(mappedElement);
      }
    });
  }

  // Map findings to reviewSections
  const reviewSections: AiReviewSection[] = [];
  if (apiReviewData.findings && apiReviewData.findings.length > 0) {
    const singleSection: AiReviewSection = {
      title: 'AI監修結果',
      findings: apiReviewData.findings.map((findingEntry): AiReviewFinding => {
        const mappedArea = mapAreaToAiReviewArea(findingEntry.area);

        // 处理tag字段：由于API schema可能还未包含tag字段，我们需要安全地访问它
        const tagArray = extractTagArray(findingEntry as Record<string, unknown>);

        return {
          id: findingEntry.id,
          description: findingEntry.description,
          severity: findingEntry.severity,
          suggestion: findingEntry.suggestion ?? undefined,
          area: mappedArea,
          citation: undefined, // findingEntry doesn't have citation in AiReviewFindingEntryInDB
          reference_images: findingEntry.reference_images ?? undefined,
          reference_source: findingEntry.reference_source ?? undefined,
          tag: tagArray, // 使用处理后的tag数组
          status: findingEntry.status,
          is_ai_generated: findingEntry.is_ai_generated,
          is_fixed: findingEntry.is_fixed, // 添加缺失的is_fixed字段映射
          // 安全地添加content_type和content_metadata字段映射
          content_type: findingEntry.content_type,
          content_metadata: findingEntry.content_metadata as Record<string, never> | null,
          ...(findingEntry.original_ai_finding_id !== undefined && {
            original_ai_finding_id: findingEntry.original_ai_finding_id,
          }),
          created_at: findingEntry.created_at,
          updated_at: findingEntry.updated_at,
        };
      }),
    };

    reviewSections.push(singleSection);
  }

  return {
    subtaskId: apiReviewData.subtask_id,
    timestamp: apiReviewData.updated_at,
    overallScore,
    detected_elements: mappedDetectedElements,
    reviewSections,
    // 添加额外字段以支持直接在AiReviewResult中包含findings数组
    findings: apiReviewData.findings?.map((findingEntry): AiReviewFinding => {
      const mappedArea = mapAreaToAiReviewArea(findingEntry.area);

      // 处理tag字段：由于API schema可能还未包含tag字段，我们需要安全地访问它
      const tagArray = extractTagArray(findingEntry as Record<string, unknown>);

      return {
        id: findingEntry.id,
        description: findingEntry.description,
        severity: findingEntry.severity,
        suggestion: findingEntry.suggestion ?? undefined,
        area: mappedArea,
        citation: undefined, // findingEntry doesn't have citation in AiReviewFindingEntryInDB
        reference_images: findingEntry.reference_images ?? undefined,
        reference_source: findingEntry.reference_source ?? undefined,
        tag: tagArray, // 使用处理后的tag数组
        status: findingEntry.status,
        is_ai_generated: findingEntry.is_ai_generated,
        is_fixed: findingEntry.is_fixed, // 添加缺失的is_fixed字段映射
        // 安全地添加content_type和content_metadata字段映射
        content_type: findingEntry.content_type,
        content_metadata: findingEntry.content_metadata as Record<string, never> | null,
        ...(findingEntry.original_ai_finding_id !== undefined && {
          original_ai_finding_id: findingEntry.original_ai_finding_id,
        }),
        created_at: findingEntry.created_at,
        updated_at: findingEntry.updated_at,
      };
    }),
  };
};

// 保留这个函数用于 initiateAiReview (AiReviewInDB) 的转换
const mapApiReviewInDBToResult = (apiReviewData: AiReviewInDB): AiReviewResult => {
  // Placeholder for overallScore - needs logic or data from backend
  const overallScore = 0; // TODO: Determine how to calculate or where to get overallScore

  // Map detected_elements
  // TODO: This mapping is a placeholder and needs significant refinement due to type differences
  // and the need to categorize elements from AiReviewInDB.detected_elements (AiDetectedElement[])
  // into AiReviewResult.detected_elements (AiDetectedElements: { characters: DetectedElement[], ...})
  // The current AiReviewInDB.detected_elements structure from types/aiReview.ts (lines 114-115)
  // is AiDetectedElement[] with fields like element_id, description.
  // The target AiReviewResult.detected_elements.characters (etc.) expects DetectedElement[] with id, type, label.
  const mappedDetectedElements: AiDetectedElements = {
    characters: [], // Placeholder
    objects: [], // Placeholder
    texts: [], // Placeholder
  };

  // Map reviewSections from apiReviewData.findings (AiReviewFindingEntryInDB[])
  // TODO: This mapping is also a placeholder. It needs logic to group findings into sections
  // (e.g., by RPD or viewpoint) and transform AiReviewFindingEntryInDB to AiReviewFinding.
  const reviewSections: AiReviewSection[] = [];
  if (apiReviewData.findings) {
    // Example: Group all findings into one generic section for now
    const singleSection: AiReviewSection = {
      title: 'Review Findings', // Placeholder title
      findings: apiReviewData.findings.map((findingEntry): AiReviewFinding => {
        // 使用辅助函数转换area
        const mappedArea = mapAreaToAiReviewArea(findingEntry.area);

        // 处理tag字段：由于API schema可能还未包含tag字段，我们需要安全地访问它
        const tagArray = extractTagArray(findingEntry as unknown as Record<string, unknown>);

        return {
          id: findingEntry.id,
          description: findingEntry.description,
          severity: findingEntry.severity as AiReviewFinding['severity'],
          suggestion: findingEntry.suggestion ?? undefined,
          area: mappedArea, // 使用转换后的area
          citation: undefined, // citation不在API schema中
          // 添加这些关键字段，只有在findingEntry中存在时才添加
          reference_images: findingEntry.reference_images ?? undefined,
          reference_source: findingEntry.reference_source ?? undefined,
          tag: tagArray, // 使用处理后的tag数组，显示数据库中的实际内容
          status: findingEntry.status,
          is_ai_generated: !findingEntry.is_human_override, // 从is_human_override推导
          is_fixed: findingEntry.is_fixed, // 添加缺失的is_fixed字段映射
          // 安全地添加content_type和content_metadata字段映射
          content_type: findingEntry.content_type,
          content_metadata: findingEntry.content_metadata as Record<string, never> | null,
          // 只添加确实存在的属性
          ...(findingEntry.original_ai_finding_id !== undefined && {
            original_ai_finding_id: findingEntry.original_ai_finding_id,
          }),
          created_at: findingEntry.created_at,
          updated_at: findingEntry.updated_at,
        };
      }),
    };
    reviewSections.push(singleSection);
  }

  return {
    subtaskId: apiReviewData.subtask_id,
    timestamp: apiReviewData.updated_at, // Or created_at
    overallScore,
    detected_elements: mappedDetectedElements, // Use the placeholder mapped elements
    reviewSections, // Use the placeholder mapped sections
  };
};
// --- END CONVERSION FUNCTION ---

/**
 * Custom hook to manage AI review state and logic.
 * It handles fetching (currently mocking) AI review results for a subtask.
 *
 * @param currentSubtaskId The ID of the currently active subtask.
 * @param subtask The data of the currently active subtask. // Will remove subtask from JSDoc too
 * @returns An object containing AI review result, loading state, and a function to trigger AI processing.
 */
export function useAiReview({
  currentSubtaskId,
  availableCharacters = [],
  onCharacterSelect,
  autoPredict = false,
}: UseAiReviewProps) {
  // Removed subtask from destructuring
  const [aiReviewResult, setAiReviewResult] = useState<AiReviewResult | null>(null);
  const [isAiReviewing, setIsAiReviewing] = useState(false);
  const [reviewingViewpointKey, setReviewingViewpointKey] = useState<ViewpointKey | null>(null);
  const [aiReviewError, setAiReviewError] = useState<Error | null>(null);

  const [aiReviewCache, setAiReviewCache] = useState<Record<string, AiReviewResult>>({});

  // New states for detected element interactions
  const [addingElementId, setAddingElementId] = useState<string | null>(null);
  const [ignoringElementId, setIgnoringElementId] = useState<string | null>(null);

  // Character prediction states
  const [isPredictingCharacter, setIsPredictingCharacter] = useState(false);
  const [attemptedPredictions, setAttemptedPredictions] = useState<Set<string>>(new Set());
  // 使用useRef跟踪已经开始预测的subtask，避免重复执行
  const hasStartedCharacterPredictionRef = useRef<Set<string>>(new Set());

  // 使用useLatestAiReview获取最新的AI监修数据
  const {
    data: latestAiReview,
    isLoading: isLoadingLatestReview,
    error: latestReviewError,
  } = useLatestAiReview(currentSubtaskId, {
    retry: false, // 如果没有数据就不要重试
    refetchOnWindowFocus: false,
  });

  // Reset AI review state when the current subtask changes.
  useEffect(() => {
    if (currentSubtaskId && aiReviewCache[currentSubtaskId]) {
      setAiReviewResult(aiReviewCache[currentSubtaskId]);
      setAiReviewError(null);
      console.log(`Restored AI review from CACHE for subtask: ${currentSubtaskId}`);
    } else if (latestAiReview && !isLoadingLatestReview) {
      // 如果有最新的AI监修数据，转换并使用它
      try {
        const convertedResult = mapAiReviewToResult(latestAiReview);
        setAiReviewResult(convertedResult);
        setAiReviewCache((prev) => ({ ...prev, [currentSubtaskId]: convertedResult }));
        setAiReviewError(null);
        console.log(`Loaded latest AI review from API for subtask: ${currentSubtaskId}`, convertedResult);
      } catch (error) {
        console.error('Failed to convert latest AI review:', error);
        setAiReviewResult(null);
        setAiReviewError(error instanceof Error ? error : new Error('Failed to convert AI review data'));
      }
    } else if (latestReviewError && latestReviewError.message?.includes('404')) {
      // 如果是404错误，说明没有AI监修数据，这是正常的
      setAiReviewResult(null);
      setAiReviewError(null);
      console.log(`No existing AI review found for subtask: ${currentSubtaskId}`);
    } else if (latestReviewError) {
      // 其他错误
      setAiReviewResult(null);
      setAiReviewError(latestReviewError);
      console.error(`Error loading latest AI review for subtask ${currentSubtaskId}:`, latestReviewError);
    } else {
      setAiReviewResult(null);
      setAiReviewError(null);
    }
    // Reset interaction states on subtask change
    setAddingElementId(null);
    setIgnoringElementId(null);
    // Reset character prediction states on subtask change
    setIsPredictingCharacter(false);
    setAttemptedPredictions(new Set());
  }, [currentSubtaskId, aiReviewCache, latestAiReview, isLoadingLatestReview, latestReviewError]);

  // Automatic character prediction when subtask changes
  useEffect(() => {
    if (
      currentSubtaskId &&
      autoPredict &&
      availableCharacters.length > 0 &&
      onCharacterSelect &&
      !attemptedPredictions.has(currentSubtaskId) &&
      !hasStartedCharacterPredictionRef.current.has(currentSubtaskId) &&
      !isPredictingCharacter
    ) {
      console.log(`🚀 Auto-predicting character for subtask: ${currentSubtaskId}`);
      setIsPredictingCharacter(true);

      // 立即标记为已尝试和已开始，防止重复请求
      setAttemptedPredictions((prev) => new Set(prev).add(currentSubtaskId));
      hasStartedCharacterPredictionRef.current.add(currentSubtaskId);

      aiPredictionService
        .initiateCharacterPrediction(currentSubtaskId)
        .then(() => {
          console.log(`✅ Character prediction initiated for subtask: ${currentSubtaskId}`);
        })
        .catch((error) => {
          console.error(`❌ Auto character prediction failed for subtask ${currentSubtaskId}:`, error);
        })
        .finally(() => {
          setIsPredictingCharacter(false);
        });
    }
  }, [
    currentSubtaskId,
    autoPredict,
    availableCharacters,
    onCharacterSelect,
    attemptedPredictions,
    isPredictingCharacter,
  ]);

  const processSubtaskForAiReview = useCallback(
    async (
      subtaskIdToProcess: string,
      forceRefresh = false,
      rpdIds?: string[],
      mode: 'quality' | 'speed' = 'quality',
    ) => {
      console.log(
        `Requesting FULL AI review for subtask: ${subtaskIdToProcess}, Force refresh: ${forceRefresh}, RPD IDs: ${rpdIds?.join(', ') || 'all'}, Mode: ${mode}`,
      );

      if (!forceRefresh && aiReviewCache[subtaskIdToProcess]) {
        setAiReviewResult(aiReviewCache[subtaskIdToProcess]);
        setIsAiReviewing(false);
        setAiReviewError(null);
        console.log(`Using CACHED FULL AI review for subtask: ${subtaskIdToProcess}`);
        return;
      }

      setIsAiReviewing(true);
      setReviewingViewpointKey(null);
      setAiReviewResult(null);
      setAiReviewError(null);
      setAddingElementId(null);
      setIgnoringElementId(null);
      try {
        const newApiResult: AiReviewInDB = await aiReviewsService.initiateAiReview(subtaskIdToProcess, mode, rpdIds);

        // 简化的调试信息
        console.log('API响应findings数量:', newApiResult.findings?.length || 0);
        console.log('后端API确认：finding对象中没有tag字段，前端将使用硬编码测试数据');

        // 检查是否是真正的完成结果还是初始创建响应
        const findingsCount = newApiResult.findings?.length || 0;
        const hasRealFindings = findingsCount > 0;

        if (hasRealFindings) {
          // 只有当有真正的findings时才设置结果
          console.log('Received real AI review results with findings, setting result');
          const newResult = mapApiReviewInDBToResult(newApiResult);
          setAiReviewCache((prevCache) => ({ ...prevCache, [subtaskIdToProcess]: newResult }));
          setAiReviewResult(newResult);
          setIsAiReviewing(false);
          console.log('AI review complete. Result:', newResult);
        } else {
          // 如果没有findings，这可能只是任务创建响应，不设置结果，保持processing状态
          console.log('Received task creation response (findings=0), keeping processing state');
          console.log('AI review task initiated successfully, waiting for real completion...');
          // 不设置结果，不重置isAiReviewing，让外部的轮询机制检测真正完成
        }
      } catch (error) {
        console.error('Failed to fetch AI review:', error);
        if (error instanceof Error) {
          setAiReviewError(error);
        } else {
          setAiReviewError(new Error('An unknown error occurred during AI review.'));
        }
        setAiReviewResult(null);
        setIsAiReviewing(false);
      }
    },
    [aiReviewCache],
  );

  // 新增：仅获取最新AI review结果的函数，不启动新的review
  const fetchLatestAiReview = useCallback(
    async (subtaskIdToProcess: string, forceRefresh = false) => {
      console.log(`Fetching latest AI review for subtask: ${subtaskIdToProcess}, Force refresh: ${forceRefresh}`);

      if (!forceRefresh && aiReviewCache[subtaskIdToProcess]) {
        setAiReviewResult(aiReviewCache[subtaskIdToProcess]);
        setIsAiReviewing(false);
        setAiReviewError(null);
        console.log(`Using CACHED latest AI review for subtask: ${subtaskIdToProcess}`);
        return;
      }

      setIsAiReviewing(true);
      setReviewingViewpointKey(null);
      setAiReviewError(null);
      setAddingElementId(null);
      setIgnoringElementId(null);
      try {
        // 获取最新的AI review结果，而不是启动新的review
        const latestReview = await aiReviewsService.getLatestAiReviewForSubtask(subtaskIdToProcess);
        console.log('latestReview:', latestReview);

        // 简化的调试信息
        // console.log('获取最新AI review结果 - findings数量:', latestReview.findings?.length || 0);

        // Use the conversion function with safe type assertion
        const newResult = mapAiReviewToResult(latestReview as unknown as components['schemas']['AiReview']);
        setAiReviewCache((prevCache) => ({ ...prevCache, [subtaskIdToProcess]: newResult }));
        setAiReviewResult(newResult);
        console.log('Latest AI review fetched successfully. Result:', newResult);
      } catch (error) {
        console.error('Failed to fetch latest AI review:', error);
        if (error instanceof Error) {
          setAiReviewError(error);
        } else {
          setAiReviewError(new Error('An unknown error occurred while fetching latest AI review.'));
        }
        setAiReviewResult(null);
      } finally {
        setIsAiReviewing(false);
      }
    },
    [aiReviewCache],
  );

  // New function to process a single viewpoint
  const processViewpointReview = useCallback(
    async (subtaskIdToProcess: string, viewpointKey: ViewpointKey) => {
      console.log(`Requesting AI review for subtask: ${subtaskIdToProcess}, viewpoint: ${viewpointKey}`);
      setIsAiReviewing(true);
      setReviewingViewpointKey(viewpointKey);
      setAiReviewError(null);

      try {
        // Using the service function which now returns AiReviewInDB
        const newApiResult = await aiReviewsService.reviewViewpointForSubtask(subtaskIdToProcess, viewpointKey);

        // Use the conversion function
        const newResult = mapApiReviewInDBToResult(newApiResult);

        setAiReviewCache((prevCache) => ({ ...prevCache, [subtaskIdToProcess]: newResult }));
        setAiReviewResult(newResult);
        console.log(`AI review for viewpoint ${viewpointKey} complete. Result:`, newResult);
      } catch (error) {
        console.error(`Failed to fetch AI review for viewpoint ${viewpointKey}:`, error);
        if (error instanceof Error) {
          setAiReviewError(error);
        } else {
          setAiReviewError(new Error(`An unknown error occurred while reviewing viewpoint ${viewpointKey}.`));
        }
      } finally {
        setIsAiReviewing(false);
        setReviewingViewpointKey(null);
      }
    },
    [aiReviewCache],
  );

  // 画像タイプのサブタスクに対して、新しいサブタスクが読み込まれ、まだレビューされていない場合に
  // AI処理を自動的にトリガーするエフェクト。
  /* 自動レビューのトリガーをコメントアウト
  useEffect(() => {
    if (
      subtask &&
      subtask.content?.task_type === 'picture' &&
      !aiReviewResult &&
      !isAiReviewing &&
      !aiReviewError &&
      currentSubtaskId === subtask.id
    ) {
      void processSubtaskForAiReview(currentSubtaskId);
    }
    if (aiReviewError && currentSubtaskId !== subtask?.id) {
      setAiReviewError(null);
    }
  }, [subtask, aiReviewResult, isAiReviewing, processSubtaskForAiReview, currentSubtaskId, aiReviewError]);
  */

  // --- START NEW CALLBACKS FOR DETECTED ELEMENTS ---
  const handleAddElementToReview = useCallback(
    (element: DetectedElement) => {
      console.log('Attempting to add element to review:', element);
      setAddingElementId(element.id);

      new Promise((resolve) => setTimeout(resolve, 750))
        .then(() => {
          let capturedUpdatedResult: AiReviewResult | null = null;

          setAiReviewResult((prevResult) => {
            if (!prevResult || !prevResult.detected_elements) {
              return prevResult;
            }
            const updatedResult = {
              ...prevResult,
              detected_elements: {
                characters: updateElementStatusInList(
                  prevResult.detected_elements.characters,
                  element.id,
                  'adding_to_review',
                ),
                objects: updateElementStatusInList(
                  prevResult.detected_elements.objects,
                  element.id,
                  'adding_to_review',
                ),
                texts: updateElementStatusInList(prevResult.detected_elements.texts, element.id, 'adding_to_review'),
              },
            };
            capturedUpdatedResult = updatedResult;
            return updatedResult;
          });

          if (currentSubtaskId && capturedUpdatedResult) {
            const resultToCache = capturedUpdatedResult; // Assign to new const to satisfy linter if it complains about closure
            setAiReviewCache((prevCache) => ({ ...prevCache, [currentSubtaskId]: resultToCache }));
          }

          console.log(`Element ${element.id} marked as 'adding_to_review'. Actual save & finding creation pending.`);
          setAddingElementId(null);
        })
        .catch((error: unknown) => {
          console.error('Simulated promise error in handleAddElementToReview:', error);
          setAddingElementId(null);
        });
    },
    [currentSubtaskId],
  );

  const handleIgnoreElement = useCallback(
    (elementId: string, elementType: DetectedElementType) => {
      console.log(`Ignoring element ${elementId} of type ${elementType}`);
      setIgnoringElementId(elementId);

      new Promise((resolve) => setTimeout(resolve, 300))
        .then(() => {
          let capturedUpdatedResult: AiReviewResult | null = null;

          setAiReviewResult((prevResult) => {
            if (!prevResult || !prevResult.detected_elements) {
              return prevResult;
            }
            const updatedResult = {
              ...prevResult,
              detected_elements: {
                characters: updateElementStatusInList(prevResult.detected_elements.characters, elementId, 'ignored'),
                objects: updateElementStatusInList(prevResult.detected_elements.objects, elementId, 'ignored'),
                texts: updateElementStatusInList(prevResult.detected_elements.texts, elementId, 'ignored'),
              },
            };
            capturedUpdatedResult = updatedResult;
            return updatedResult;
          });

          if (currentSubtaskId && capturedUpdatedResult) {
            const resultToCache = capturedUpdatedResult; // Assign to new const
            setAiReviewCache((prevCache) => ({ ...prevCache, [currentSubtaskId]: resultToCache }));
          }

          setIgnoringElementId(null);
        })
        .catch((error: unknown) => {
          console.error('Simulated promise error in handleIgnoreElement:', error);
          setIgnoringElementId(null);
        });
    },
    [currentSubtaskId],
  );
  // --- END NEW CALLBACKS FOR DETECTED ELEMENTS ---

  return {
    aiReviewResult,
    isAiReviewing,
    reviewingViewpointKey,
    aiReviewError,
    processSubtaskForAiReview,
    fetchLatestAiReview,
    processViewpointReview,
    clearAiReviewResult: () => {
      setAiReviewResult(null);
      setAiReviewError(null);
      // 結果がクリアされた場合、インタラクションの状態もクリアします
      setAddingElementId(null);
      setIgnoringElementId(null);
    },
    // Expose new states and handlers
    addingElementId,
    ignoringElementId,
    handleAddElementToReview,
    handleIgnoreElement,
    // 新增状态：用于指示是否正在加载最新的AI监修数据
    isLoadingLatestReview,
    // 新增状态：用于指示是否已存在AI监修数据（无论是否成功转换）
    hasExistingReview: !!latestAiReview,
    // Character prediction states and handlers
    isPredictingCharacter,
  };
}
