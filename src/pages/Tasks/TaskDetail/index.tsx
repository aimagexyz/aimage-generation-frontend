import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { aiReviewsService } from '@/api/aiReviewsService';
import type { CharacterDetail } from '@/api/charactersService';
import { fetchApi } from '@/api/client';
import type { ItemSearchByImageResponse } from '@/api/itemsService';
import { reviewSetsService } from '@/api/reviewSetsService';
import type { components } from '@/api/schemas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { UnifiedReviewModal } from '@/components/ui/UnifiedReviewModal';
import { toast } from '@/components/ui/use-toast';
import { useAiReviewProcessingStatus } from '@/hooks/aiReview/useInitiateAiReview';
import { useAsset } from '@/hooks/useAsset';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateSubtask, useUploadImage } from '@/hooks/useUploadImage';
import type { SubtaskData, SubtaskUpdateStatusValue } from '@/types/tasks';

import { useTaskMetadata, useTaskNavigation } from '../hooks/useTasks';
import { AiReviewPanel } from './components/AiReviewPanel';
import { CharacterDisplayPanel } from './components/CharacterDisplayPanel';
import { CreateSubtaskDialog } from './components/CreateSubtaskDialog';
import { ImagePreviewModal, type ImageViewModalState } from './components/ImagePreviewModal';
import { ImageUpdateModal } from './components/ImageUpdateModal';
import { ItemSearchPanel } from './components/ItemSearchPanel';
import { MainContent } from './components/MainContent';
import { TaskNavigationBar } from './components/TaskNavigationBar';
import { TaskDetailContext, type TaskDetailContextType } from './context/TaskDetailContext';
import { useAiReview } from './hooks/useAiReview';
import { useCharacters } from './hooks/useCharacters';
import { useFindingInteraction } from './hooks/useFindingInteraction';
import { useFrameAnnotation } from './Subtask/FrameAnnotation/useFrameAnnotation';

// Define SubtaskOut and TaskOut based on typical schema structure
type SubtaskOut = components['schemas']['SubtaskOut'];
type TaskOut = components['schemas']['TaskOut'];

// Dify Chatbot Configuration Interface
interface DifyChatbotConfig {
  token: string;
  baseUrl: string;
}

// Extend Window interface to include chatbot config
declare global {
  interface Window {
    difyChatbotConfig?: DifyChatbotConfig;
  }
}

type Params = {
  projectId: string;
  taskId: string;
};

/**
 * `TaskDetailPage` is the main component for displaying the details of a specific task,
 * including its subtasks, AI review information, and user comments.
 * It orchestrates data fetching for task and subtask details, manages UI state related to
 * subtask navigation, AI review display, and provides context for subtask status updates.
 */
// Simple Loading Component
function SimpleLoadingSpinner() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[400px] bg-background">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    </div>
  );
}

export function TaskDetailPage() {
  const { projectId, taskId } = useParams<Params>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userInfo } = useAuth();
  const navigate = useNavigate();

  // Retrieves the subtaskId from URL search parameters, if present.
  const searchParamsSubtaskId = searchParams.get('subtaskId');

  // Placeholder for determining if the subtask content is empty.
  const [isSubtaskEmpty, setIsSubtaskEmpty] = useState(false);

  // State for managing the loading state of a specific section re-review
  const [rerunningSectionTitle, setRerunningSectionTitle] = useState<string | null>(null);

  // State for tracking AI review processing status across tab switches
  const [isProcessingAiReview, setIsProcessingAiReview] = useState(false);

  // State for the currently selected version of a subtask (if versioning is applicable).
  const [, setSelectedVersion] = useState<number | undefined>(undefined); // Keep setSelectedVersion for now
  // State for managing the image preview modal (e.g., for AI review citations).
  const [imageViewModalState, setImageViewModalState] = useState<ImageViewModalState | null>(null);
  const [isUpdatingAsset, setIsUpdatingAsset] = useState(false);

  // Re-add states for comparison modal
  const [originalAssetUrlForComparison, setOriginalAssetUrlForComparison] = useState<string | null>(null);
  const [isInComparisonMode, setIsInComparisonMode] = useState(false); // This controls ImageUpdateModal visibility
  const [pendingAssetFile, setPendingAssetFile] = useState<File | null>(null);

  // 创建子任务相关状态
  const [isCreateSubtaskDialogOpen, setIsCreateSubtaskDialogOpen] = useState(false);
  const [pendingCommentText, setPendingCommentText] = useState<string>('');
  const [shouldOpenCommentModal, setShouldOpenCommentModal] = useState(false);

  // Unified review modal state
  const [isUnifiedReviewModalOpen, setIsUnifiedReviewModalOpen] = useState(false);
  const [reviewModalMode, setReviewModalMode] = useState<'initial' | 'rerun'>('rerun');

  // Character selection state
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterDetail | null>(null);

  // Tab management state
  const [activeTab, setActiveTab] = useState<'ai-review' | 'character-display' | 'item-search'>('ai-review');

  // 物品边界框状态
  const [selectedItemBbox, setSelectedItemBbox] = useState<[number, number, number, number] | null>(null);
  const [selectedItemLabel, setSelectedItemLabel] = useState<string | null>(null);

  // 搜索结果状态
  const [externalSearchResults, setExternalSearchResults] = useState<ItemSearchByImageResponse | null>(null);
  const [externalCropInfo, setExternalCropInfo] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // 获取当前选择的工具
  const { currentTool, resetToInitialState, setSearchRect, searchContext } = useFrameAnnotation();

  // 当选择搜索工具时，自动切换到item-search标签页
  useEffect(() => {
    if (currentTool === 'search') {
      setActiveTab('item-search');
    }
  }, [currentTool]);

  // Use useTaskNavigation to get lightweight navigation data for the project
  const { navigationTasks, totalTasks, refetchNavigation } = useTaskNavigation({ projectId });

  // Get task metadata for status operations
  const { taskStatuses, updateTaskStatus } = useTaskMetadata();

  const {
    data: currentTask,
    isLoading: isTaskLoading,
    refetch: refetchCurrentTask,
  } = useQuery<TaskOut>({
    queryKey: ['task', taskId],
    queryFn: () =>
      fetchApi({
        url: `/api/v1/tasks/${taskId}` as '/api/v1/tasks/{task_id}',
        method: 'get',
      }).then((res) => res.data),
    enabled: !!taskId,
  });

  // Fetches the list of subtasks for the current task.
  const {
    data: rawSubtasks,
    refetch: refetchSubtasks,
    isLoading: isSubtasksLoading,
    isError: isSubtasksError,
  } = useQuery<SubtaskOut[]>({
    queryKey: ['task-subtasks', taskId], // 使用统一的查询键与列表页面共享缓存
    queryFn: () =>
      fetchApi({
        url: `/api/v1/tasks/${taskId}/subtasks` as '/api/v1/tasks/{task_id}/subtasks',
        method: 'get',
      }).then((res) => res.data.items),
    enabled: !!taskId,
    staleTime: 1000 * 60 * 5, // 5分钟缓存时间
    gcTime: 1000 * 60 * 30, // 30分钟垃圾回收
    refetchOnWindowFocus: false, // 窗口焦点变化时不重新获取
    refetchOnMount: false, // 组件挂载时不重新获取（如果有缓存）
  });

  // Sort subtasks by oid to ensure proper ordering (1, 2, 3... instead of 10, 11, 1, 2...)
  const subtasks = rawSubtasks?.slice().sort((a, b) => a.oid - b.oid);

  // Determines the current subtask ID based on URL params or the first subtask in the list.
  const currentSubtaskId = searchParamsSubtaskId || subtasks?.[0]?.id || '';

  // 页面进入时重置标注状态到初始值（包括页面刷新、路由变化等所有情况）
  useEffect(() => {
    resetToInitialState();
  }, [resetToInitialState]); // 每次进入页面都重置状态

  // 当切换subtask时，重置边界框选择
  useEffect(() => {
    setSelectedItemBbox(null);
    setSelectedItemLabel(null);
  }, [currentSubtaskId]);

  // Effect to set the subtaskId in the URL search parameters if not already present,
  // defaulting to the first subtask.
  useEffect(() => {
    if (!searchParamsSubtaskId && subtasks && subtasks.length > 0) {
      setSearchParams({ subtaskId: subtasks[0].id }, { replace: true });
    }
  }, [searchParamsSubtaskId, subtasks, setSearchParams]);

  const subtaskIds = subtasks?.map((subtask) => subtask.id) || [];
  const hasSubtasks = subtaskIds.length > 0;

  // Fetches the detailed data for the currently selected subtask.
  const { data: subtask, refetch: refetchSubtask } = useQuery<SubtaskData>({
    queryKey: ['subtask', currentSubtaskId],
    queryFn: () =>
      fetchApi({ url: `/api/v1/subtasks/${currentSubtaskId}` as '/api/v1/subtasks/{subtask_id}', method: 'get' }).then(
        (res) => res.data as SubtaskData,
      ),
    enabled: !!currentSubtaskId,
    retry: false,
  });

  // Use useAsset to get a displayable URL for the original image
  const { assetUrl: displayableOriginalAssetUrl } = useAsset(subtask?.content?.s3_path || '');

  // Mutations for image upload and subtask update (moved from SubtaskContent)
  const { mutateAsync: uploadImage } = useUploadImage();
  const { mutateAsync: updateSubtaskContent } = useUpdateSubtask(); // Renamed to avoid conflict

  // Custom hook for managing AI finding interactions (e.g., hover, click).
  const { activeFindingId, handleFindingInteraction, clearActiveFindingId } = useFindingInteraction();

  // Fetch available characters for AI prediction
  const { characters = [] } = useCharacters({ projectId: projectId || '', enabled: !!projectId });

  // 用户手动选择的角色状态 - 每个subtask有独立的用户选择
  const [userCharacterSelections, setUserCharacterSelections] = useState<Record<string, CharacterDetail | null>>({});

  // 处理用户手动选择角色
  const handleUserCharacterSelect = useCallback(
    (character: CharacterDetail | null) => {
      if (!currentSubtaskId) {
        return;
      }

      console.log(`User manually selected character for subtask ${currentSubtaskId}:`, character?.name || 'None');

      // 保存用户选择到状态中
      setUserCharacterSelections((prev) => ({
        ...prev,
        [currentSubtaskId]: character,
      }));

      // 立即更新显示
      setSelectedCharacter(character);
    },
    [currentSubtaskId],
  );

  // Custom hook for managing AI review state and process.
  const {
    aiReviewResult,
    isAiReviewing,
    processSubtaskForAiReview,
    fetchLatestAiReview,
    addingElementId,
    ignoringElementId,
    handleAddElementToReview,
    handleIgnoreElement,
    isLoadingLatestReview,
    hasExistingReview,
  } = useAiReview({
    currentSubtaskId,
    availableCharacters: characters,
    onCharacterSelect: (character) => {
      // 当AI预测选择角色时，如果用户没有手动选择过，则更新显示
      if (currentSubtaskId && !userCharacterSelections[currentSubtaskId]) {
        setSelectedCharacter(character);
      }
    },
  });

  // Effect to restore selected character from user selection or subtask.character_ids when data loads
  useEffect(() => {
    if (!currentSubtaskId) {
      return;
    }

    // 优先恢复用户手动选择的角色
    const userSelectedCharacter = userCharacterSelections[currentSubtaskId];
    if (userSelectedCharacter != undefined) {
      // 用户有手动选择（可能是null表示用户清除了选择）
      console.log(
        `Restoring user selected character for subtask: ${currentSubtaskId}`,
        userSelectedCharacter?.name || 'None',
      );
      setSelectedCharacter(userSelectedCharacter);
      return;
    }

    // 没有用户选择时，从数据库恢复
    if (subtask?.character_ids && characters.length > 0) {
      const savedCharacterId = subtask.character_ids[0]; // Get first character ID
      if (savedCharacterId) {
        const savedCharacter = characters.find((char) => char.id === savedCharacterId);
        if (savedCharacter && (!selectedCharacter || selectedCharacter.id !== savedCharacterId)) {
          console.log(
            `Restoring saved character from database: ${savedCharacter.name} for subtask: ${currentSubtaskId}`,
          );
          setSelectedCharacter(savedCharacter);
        }
      }
    } else if (subtask && (!subtask.character_ids || subtask.character_ids.length === 0)) {
      // If no character_ids saved, clear selection when switching subtasks
      if (selectedCharacter) {
        console.log(`Clearing character selection for subtask: ${currentSubtaskId} (no saved characters)`);
        setSelectedCharacter(null);
      }
    }
  }, [currentSubtaskId, userCharacterSelections, subtask?.character_ids, characters, selectedCharacter]);

  // State to temporarily disable polling after initiating AI review
  const [justStartedReview, setJustStartedReview] = useState(false);
  // Track when we started the AI review to avoid detecting old completed statuses
  const [reviewStartTime, setReviewStartTime] = useState<Date | null>(null);

  // Reset AI processing state when switching subtasks
  useEffect(() => {
    console.log('Subtask changed, resetting AI processing state:', currentSubtaskId);
    setIsProcessingAiReview(false);
    setJustStartedReview(false);
    setReviewStartTime(null);
  }, [currentSubtaskId]);

  // Hook to check AI review processing status and sync with parent state
  const { data: processingStatus } = useAiReviewProcessingStatus(currentSubtaskId, {
    enabled: !!currentSubtaskId && !justStartedReview, // Disable polling temporarily after starting review
    pollingInterval: 10000, // 10 seconds
    onComplete: (status) => {
      console.log('AI review processing completed via polling:', status);

      // 检查是否是新的完成状态，避免处理旧的状态
      if (reviewStartTime && status.processing_started_at) {
        const processingStartedAt = new Date(status.processing_started_at);
        const timeDiff = processingStartedAt.getTime() - reviewStartTime.getTime();

        console.log('Polling onComplete time comparison:', {
          reviewStartTime: reviewStartTime.toISOString(),
          processingStartedAt: processingStartedAt.toISOString(),
          timeDiff,
          isNewCompletion: timeDiff >= -5000,
        });

        // 如果处理开始时间早于review启动时间超过5秒，则认为是旧的状态，忽略
        if (timeDiff < -5000) {
          console.log('Polling onComplete: Ignoring old completion status');
          return;
        }
      }

      console.log('Polling onComplete: Processing new completion status');
      setIsProcessingAiReview(false);
      setJustStartedReview(false); // Reset the flag
      setReviewStartTime(null); // Reset review start time
      // Trigger refetch of latest AI review data
      void fetchLatestAiReview(currentSubtaskId, true);
    },
  });

  // Sync processing status from hook to local state
  useEffect(() => {
    if (processingStatus) {
      console.log('Syncing processing status from hook:', {
        subtaskId: currentSubtaskId,
        isProcessing: processingStatus.is_processing,
        isCompleted: processingStatus.is_completed,
      });

      // Update local state to match server status
      setIsProcessingAiReview(processingStatus.is_processing);

      // Reset the "just started" flag if the review is no longer processing
      if (!processingStatus.is_processing) {
        setJustStartedReview(false);
        setReviewStartTime(null);
      }
    }
  }, [processingStatus, currentSubtaskId]);

  // Effect to update isSubtaskEmpty based on subtask content
  useEffect(() => {
    if (subtask && subtask.content) {
      let isEmpty = false;
      if (subtask.content.task_type === 'text') {
        isEmpty = !subtask.content.description; // For text tasks, check description
      } else {
        isEmpty = !subtask.content.s3_path; // For other media types, check s3_path
      }
      setIsSubtaskEmpty(isEmpty);
    } else {
      // If subtask data or content is not yet loaded, or there is no subtask,
      // assume it might be empty or not ready for review.
      setIsSubtaskEmpty(true);
    }
  }, [subtask]);

  // Handle finding status update callback
  const handleFindingStatusUpdate = useCallback(
    (findingId: string, isFixed: boolean) => {
      console.log('Finding status updated:', { findingId, isFixed });
      // Refetch the latest AI review to get updated data
      if (currentSubtaskId) {
        void fetchLatestAiReview(currentSubtaskId, true);
      }
    },
    [currentSubtaskId, fetchLatestAiReview],
  );

  // Helper functions for processing status sync (refactored to reduce complexity)
  const handleProcessingStarted = useCallback(() => {
    console.log('Detected ongoing AI review processing via polling, updating state to true');
    setIsProcessingAiReview(true);
  }, []);

  const isNewTaskCompletion = useCallback(
    (startedAt: string): boolean => {
      if (!reviewStartTime || !startedAt) {
        return false;
      }
      return new Date(startedAt) >= reviewStartTime;
    },
    [reviewStartTime],
  );

  const handleProcessingCompleted = useCallback(() => {
    console.log('Detected completed NEW AI review via polling, updating state to false');
    console.log('Before reset - isProcessingAiReview:', isProcessingAiReview);
    setIsProcessingAiReview(false);
    setReviewStartTime(null);
    console.log('After reset - called setIsProcessingAiReview(false)');
  }, [isProcessingAiReview]);

  const handleCompletedStatus = useCallback(
    (status: { processing_started_at?: string }) => {
      const startedAt = status.processing_started_at || '';
      const isNewTask = isNewTaskCompletion(startedAt);

      console.log('Completed AI review detected:', {
        reviewStartTime: reviewStartTime?.toISOString(),
        processingStartedAt: status.processing_started_at,
        isNewTaskCompletion: isNewTask,
      });

      if (isNewTask) {
        handleProcessingCompleted();
      } else {
        console.log('Ignoring old completed AI review status');
      }
    },
    [isNewTaskCompletion, handleProcessingCompleted, reviewStartTime],
  );

  // Helper functions for processing status validation and handling
  const shouldIgnoreStatusUpdate = useCallback(
    (
      status: { processing_started_at?: string; is_completed?: boolean },
      justStarted: boolean,
      startTime: Date | null,
    ): boolean => {
      // 如果刚启动了review，暂时忽略状态更新，避免旧状态干扰
      if (justStarted) {
        console.log('🛡️ PROTECTED: Ignoring status update because justStartedReview is true');
        return true;
      }

      // 额外的时间检查：如果有reviewStartTime，验证status是否是新的
      if (startTime && status.processing_started_at) {
        const processingStartedAt = new Date(status.processing_started_at);
        const timeDiff = processingStartedAt.getTime() - startTime.getTime();

        console.log('Status sync effect additional time check:', {
          reviewStartTime: startTime.toISOString(),
          processingStartedAt: processingStartedAt.toISOString(),
          timeDiff,
          isOldStatus: timeDiff < -5000,
        });

        // 如果是明显的旧状态，忽略
        if (timeDiff < -5000) {
          console.log('🛡️ TIME PROTECTED: Status sync effect: Ignoring obviously old status');
          return true;
        }
      }

      // 额外的完成状态保护：如果收到完成状态但我们刚开始处理，忽略
      if (status.is_completed && startTime) {
        const currentTime = new Date();
        const timeSinceStart = currentTime.getTime() - startTime.getTime();

        // 如果启动时间不到10秒，很可能是旧的完成状态
        if (timeSinceStart < 10000) {
          console.log('🛡️ EARLY COMPLETION PROTECTED: Ignoring completion status too soon after start', {
            timeSinceStart,
            threshold: 10000,
          });
          return true;
        }
      }

      return false;
    },
    [],
  );

  const shouldStartProcessing = useCallback(
    (status: { is_processing?: boolean }, isCurrentlyProcessing: boolean): boolean => {
      return !!status.is_processing && !isCurrentlyProcessing;
    },
    [],
  );

  const shouldCompleteProcessing = useCallback(
    (status: { is_completed?: boolean }, isCurrentlyProcessing: boolean): boolean => {
      return !!status.is_completed && isCurrentlyProcessing;
    },
    [],
  );

  const shouldKeepCurrentState = useCallback(
    (status: { is_processing?: boolean; is_completed?: boolean }, isCurrentlyProcessing: boolean): boolean => {
      return !status.is_processing && !status.is_completed && isCurrentlyProcessing;
    },
    [],
  );

  const handleProcessingStartedStatus = useCallback(() => {
    console.log('Status sync: Starting processing state');
    handleProcessingStarted();
  }, [handleProcessingStarted]);

  const handleProcessingCompletedStatus = useCallback(
    (status: { processing_started_at?: string }) => {
      console.log('Status sync: Handling completed status');
      handleCompletedStatus(status);
    },
    [handleCompletedStatus],
  );

  const handleUnclearStatus = useCallback(() => {
    console.log('AI review status unclear, keeping current processing state');
  }, []);
  // Effect to sync processing status on component mount/subtask change
  useEffect(() => {
    if (!processingStatus || !currentSubtaskId) {
      return;
    }

    // Type guard for processing status
    if (typeof processingStatus === 'object' && 'is_processing' in processingStatus) {
      console.log('Processing status update:', processingStatus);

      console.log('Current protection state:', { justStartedReview, reviewStartTime: reviewStartTime?.toISOString() });

      // 检查是否应该忽略此次状态更新
      if (shouldIgnoreStatusUpdate(processingStatus, justStartedReview, reviewStartTime)) {
        return;
      }

      // 处理不同的状态更新情况
      if (shouldStartProcessing(processingStatus, isProcessingAiReview)) {
        handleProcessingStartedStatus();
      } else if (shouldCompleteProcessing(processingStatus, isProcessingAiReview)) {
        handleProcessingCompletedStatus(processingStatus);
      } else if (shouldKeepCurrentState(processingStatus, isProcessingAiReview)) {
        handleUnclearStatus();
      }
    }
  }, [
    processingStatus,
    currentSubtaskId,
    isProcessingAiReview,
    shouldIgnoreStatusUpdate,
    shouldStartProcessing,
    shouldCompleteProcessing,
    shouldKeepCurrentState,
    handleProcessingStartedStatus,
    handleProcessingCompletedStatus,
    handleUnclearStatus,
    justStartedReview,
    reviewStartTime,
  ]);

  // Effect to clear any active finding highlight when the subtask changes.
  useEffect(() => {
    clearActiveFindingId();
  }, [currentSubtaskId, clearActiveFindingId]);

  // Dify Chatbot Integration
  useEffect(() => {
    // Set up the chatbot configuration
    window.difyChatbotConfig = {
      token: 'dXKOI1kJc2oiWo0Q',

      baseUrl: 'https://3.114.199.92',
    };

    // Create and inject the chatbot script
    const script = document.createElement('script');

    script.src = 'https://3.114.199.92/embed.min.js';
    script.id = 'dXKOI1kJc2oiWo0Q';
    script.defer = true;

    // Add custom styles for the chatbot
    const style = document.createElement('style');
    style.textContent = `
      #dify-chatbot-bubble-button {
        background-color: #1C64F2 !important;
      }
      #dify-chatbot-bubble-window {
        width: 24rem !important;
        height: 40rem !important;
      }
    `;

    // Check if script and styles are already loaded to avoid duplicates
    const existingScript = document.getElementById('dXKOI1kJc2oiWo0Q');
    const existingStyle = document.querySelector('style[data-dify-chatbot]');

    if (!existingScript) {
      document.body.appendChild(script);
    }

    if (!existingStyle) {
      style.setAttribute('data-dify-chatbot', 'true');
      document.head.appendChild(style);
    }

    // Cleanup function to remove the script and styles when component unmounts
    return () => {
      const scriptToRemove = document.getElementById('dXKOI1kJc2oiWo0Q');
      const styleToRemove = document.querySelector('style[data-dify-chatbot]');

      if (scriptToRemove) {
        scriptToRemove.remove();
      }
      if (styleToRemove) {
        styleToRemove.remove();
      }

      // Clean up the global config
      if (window.difyChatbotConfig) {
        delete window.difyChatbotConfig;
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // New callback for "Rerun All" from AiReviewPanel
  const handleRerunAllReviewForPanel = useCallback(
    async (
      sectionIdentifier: string,
      selection?: { rpdIds?: string[]; reviewSetIds?: string[]; mode?: 'quality' | 'speed' },
    ) => {
      if (!currentSubtaskId) {
        console.error('Subtask ID is required to re-run AI review.');
        return;
      }
      // AiReviewPanel's main rerun button sends "__ALL_SECTIONS__"
      if (sectionIdentifier === '__ALL_SECTIONS__') {
        console.log(`Rerunning all AI reviews for subtask: ${currentSubtaskId}`, {
          selectedRpdIds: selection?.rpdIds?.join(', ') || 'all',
          selectedReviewSetIds: selection?.reviewSetIds?.join(', ') || 'none',
        });
        console.log(`Rerunning all AI reviews for subtask: ${currentSubtaskId}`, {
          selectedRpdIds: selection?.rpdIds?.join(', ') || 'all',
          selectedReviewSetIds: selection?.reviewSetIds?.join(', ') || 'none',
        });
        console.log('Before setting state - isProcessingAiReview:', isProcessingAiReview);

        // **CRITICAL: Set protection flags FIRST before any state changes**
        setJustStartedReview(true); // Disable polling temporarily - SET THIS FIRST!
        console.log('Set justStartedReview to true FIRST');
        // 记录任务启动时间
        const startTime = new Date();
        setReviewStartTime(startTime);
        console.log('Set review start time:', startTime.toISOString());

        // 立即设置处理状态，让按钮变为disabled
        setIsProcessingAiReview(true);
        console.log('Set isProcessingAiReview to true and disabled polling');
        console.log('After setting state - isProcessingAiReview should be true on next render');

        try {
          // Ensure processSubtaskForAiReview is available from useAiReview
          if (processSubtaskForAiReview) {
            await processSubtaskForAiReview(currentSubtaskId, true, selection?.rpdIds, selection?.mode || 'quality'); // forceRefresh = true, with RPD IDs and mode
            console.log('AI review INITIATION completed (not the review itself)');

            // 重要：processSubtaskForAiReview只是启动AI review，不是等待完成
            // 我们需要依赖轮询机制来检测完成状态
            // 5秒后重新启用轮询，让轮询机制检测完成
            setTimeout(() => {
              console.log('Re-enabling polling after 5 seconds to detect completion');
              setJustStartedReview(false);
            }, 5000); // 减少到5秒，提供更快的响应
          } else {
            console.error('processSubtaskForAiReview function is not available from useAiReview.');
            setIsProcessingAiReview(false); // Reset if function not available
            setJustStartedReview(false);
          }
        } catch (error) {
          console.error(`Error rerunning all AI reviews for subtask ${currentSubtaskId}:`, error);
          setIsProcessingAiReview(false); // Clear processing state on error
          setJustStartedReview(false); // Re-enable polling on error
          setReviewStartTime(null); // Reset start time on error
          // Optionally show an error notification to the user
        }
        // 注意：不在finally中清除状态，让轮询机制来管理状态
      } else {
        // This case should ideally not be hit if AiReviewPanel only sends "__ALL_SECTIONS__"
        // If specific section reruns are needed from other UI elements, they should use handleRerunSectionForPanel directly.
        console.warn(
          `handleRerunAllReviewForPanel received an unexpected sectionIdentifier: ${sectionIdentifier}. Expected "__ALL_SECTIONS__".`,
        );
      }
    },
    [currentSubtaskId, processSubtaskForAiReview],
  );

  // Frontend ReviewSet Expansion Helper
  const expandReviewSetsToRpdIds = useCallback(
    async (selection: { rpdIds: string[]; reviewSetIds: string[] }): Promise<string[]> => {
      const allRpdIds = [...(selection.rpdIds || [])];

      if (selection.reviewSetIds?.length) {
        try {
          console.log(`Expanding ${selection.reviewSetIds.length} ReviewSets...`);

          // Fetch all selected ReviewSets in parallel for efficiency
          const reviewSetPromises = selection.reviewSetIds.map((id) => reviewSetsService.getReviewSet(id));
          const reviewSets = await Promise.all(reviewSetPromises);

          // Extract RPD IDs from all ReviewSets
          for (const reviewSet of reviewSets) {
            const reviewSetRpdIds = reviewSet.rpds?.map((rpd) => rpd.id) || [];
            allRpdIds.push(...reviewSetRpdIds);
            console.log(`ReviewSet "${reviewSet.name}" contributed ${reviewSetRpdIds.length} RPDs`);
          }
        } catch (error) {
          console.error('Failed to expand ReviewSets:', error);
          throw new Error(`ReviewSet expansion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Remove duplicates and return
      const uniqueRpdIds = [...new Set(allRpdIds)];
      console.log(
        `Expanded to ${uniqueRpdIds.length} unique RPD IDs from ${selection.rpdIds?.length || 0} individual + ${selection.reviewSetIds?.length || 0} sets`,
      );
      return uniqueRpdIds;
    },
    [],
  );

  // Helper function for initial review
  const executeInitialReview = useCallback(
    async (expandedRpdIds: string[], mode: 'quality' | 'speed') => {
      if (!subtask?.id) {
        toast({
          title: 'エラー',
          description: 'サブタスクが見つかりません。',
          variant: 'destructive',
          duration: 5000,
        });
        return;
      }

      console.log(`Starting initial review using ${expandedRpdIds.length} RPDs:`, expandedRpdIds);
      console.log(`Initial review mode: ${mode}`);

      setIsProcessingAiReview(true);
      setReviewStartTime(new Date());

      const result = await aiReviewsService.initiateAiReview(
        subtask.id,
        mode,
        expandedRpdIds.length > 0 ? expandedRpdIds : undefined,
      );

      console.log('Initial AI review initiated:', result);
    },
    [subtask?.id, setIsProcessingAiReview, setReviewStartTime],
  );

  // Helper function for re-review
  const executeReReview = useCallback(
    async (expandedRpdIds: string[], mode: 'quality' | 'speed') => {
      if (expandedRpdIds.length === 0) {
        toast({
          title: 'エラー',
          description:
            '選択したレビューセットにはレビューポイントが含まれていません。少なくとも1つのレビューポイントまたはレビューセットを選択してください。',
          variant: 'destructive',
          duration: 5000,
        });
        return;
      }

      console.log(`Proceeding with re-review using ${expandedRpdIds.length} RPDs:`, expandedRpdIds);
      console.log(`Re-review mode: ${mode}`);

      await handleRerunAllReviewForPanel('__ALL_SECTIONS__', {
        rpdIds: expandedRpdIds,
        reviewSetIds: [],
        mode,
      });
    },
    [handleRerunAllReviewForPanel],
  );

  // Handle unified review modal confirmation with ReviewSet expansion
  const handleUnifiedReviewConfirm = useCallback(
    async (selection: { rpdIds: string[]; reviewSetIds: string[]; mode: 'quality' | 'speed' }) => {
      setIsUnifiedReviewModalOpen(false);

      try {
        const expandedRpdIds = await expandReviewSetsToRpdIds(selection);

        if (reviewModalMode === 'initial') {
          await executeInitialReview(expandedRpdIds, selection.mode);
        } else {
          await executeReReview(expandedRpdIds, selection.mode);
        }
      } catch (error) {
        const reviewType = reviewModalMode === 'initial' ? 'Initial review' : 'Re-review';
        const reviewTypeJa = reviewModalMode === 'initial' ? '監修' : '再監修';

        console.error(`${reviewType} with ReviewSets failed:`, error);
        toast({
          title: 'エラー',
          description: `${reviewTypeJa}の実行に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
          variant: 'destructive',
          duration: 5000,
        });

        if (reviewModalMode === 'initial') {
          setIsProcessingAiReview(false);
        }

        throw error;
      }
    },
    [expandReviewSetsToRpdIds, reviewModalMode, executeInitialReview, executeReReview, setIsProcessingAiReview],
  );

  // Modified handleAssetFileUpdate to open comparison modal
  // eslint-disable-next-line @typescript-eslint/require-await
  const handleAssetFileUpdate = async (file: File): Promise<void> => {
    if (!subtask || !subtask.content?.s3_path || !displayableOriginalAssetUrl) {
      console.error('Subtask, s3_path, or displayable original URL missing for asset update.');
      return;
    }
    setOriginalAssetUrlForComparison(displayableOriginalAssetUrl); // Use the displayable URL
    setPendingAssetFile(file);
    setIsInComparisonMode(true);
  };

  // Re-implement handleConfirmComparedAssetUpdate
  const handleConfirmComparedAssetUpdate = useCallback(
    async (fileToUpdate: File) => {
      if (!fileToUpdate || !subtask) {
        console.error('No pending asset file or subtask to confirm.');
        setIsInComparisonMode(false);
        setOriginalAssetUrlForComparison(null);
        setPendingAssetFile(null);
        return;
      }

      setIsUpdatingAsset(true);
      try {
        const { url } = await uploadImage(fileToUpdate);
        await updateSubtaskContent({ subtaskId: subtask.id, s3Path: url });
        await refetchSubtask();
        await refetchCurrentTask(); // Refetch main task if subtask content update might affect it
        console.log('Asset update confirmed and processed.');
      } catch (error) {
        console.error('Failed to update image asset after confirmation:', error);
      } finally {
        setIsInComparisonMode(false);
        setOriginalAssetUrlForComparison(null);
        setPendingAssetFile(null);
        setIsUpdatingAsset(false);
      }
    },
    [subtask, uploadImage, updateSubtaskContent, refetchSubtask, refetchCurrentTask],
  );

  // Re-implement handleCancelComparison
  const handleCancelComparison = useCallback(() => {
    setIsInComparisonMode(false);
    setOriginalAssetUrlForComparison(null);
    setPendingAssetFile(null);
    console.log('Asset update comparison cancelled.');
  }, []);

  // For now, only 'picture' type allows asset update through this mechanism.
  const canUpdateAsset = subtask?.task_type === 'picture';

  /**
   * Handles updating the status of a subtask and, if necessary,
   * the overall task status (e.g., to 'In Review' or 'Completed').
   */

  // --- Logic moved from SubtaskActionsBar ---
  const { mutateAsync: callUpdateSubtaskStatusApi, isPending: isUpdatingSubtaskStatus } = useMutation<
    void, // Assuming the API call returns void on success for status update
    Error,
    { subtaskId: string; newStatus: SubtaskUpdateStatusValue }
  >({
    mutationFn: async ({ subtaskId: subId, newStatus }) => {
      await fetchApi({
        url: `/api/v1/subtasks/${subId}/status` as '/api/v1/subtasks/{subtask_id}/status',
        method: 'patch',
        headers: { 'Content-Type': 'application/json' },

        params: { status_name: newStatus }, // API expects status_name in query params
      });
    },
    onSuccess: async (_, variables) => {
      // Refetch current subtask and the list of subtasks after status update
      await Promise.all([refetchSubtask(), refetchSubtasks()]);
      // Call the original logic for updating parent task status if needed
      // This is a simplified version of the original handleSubtaskStatusUpdate's logic
      if (!taskId || !taskStatuses || !updateTaskStatus) {
        return;
      }
      let needsTaskRefetch = false;
      if (variables.newStatus === 'accepted' || variables.newStatus === 'denied') {
        updateTaskStatus({ taskId, statusId: taskStatuses[taskStatuses.length - 2].id });
        needsTaskRefetch = true;
      }
      if (variables.newStatus === 'accepted') {
        const { data: latestSubtasks } = await refetchSubtasks();
        if (latestSubtasks && latestSubtasks.length > 0) {
          const allAccepted = latestSubtasks.every((st) => st.status === 'accepted');
          if (allAccepted) {
            updateTaskStatus({ taskId, statusId: taskStatuses[taskStatuses.length - 1].id });
            needsTaskRefetch = true;
          }
        }
      }
      if (needsTaskRefetch) {
        await refetchNavigation();
        await refetchCurrentTask(); // Also refetch current task details
      }
    },
    onError: (error) => {
      console.error('Failed to update subtask status:', error);
      // Potentially show a toast notification to the user
    },
  });

  // This function matches the TaskDetailContextType
  const handleSubtaskStatusUpdateForContext = useCallback(
    async (subtaskIdForUpdate: string, newStatus: SubtaskUpdateStatusValue) => {
      await callUpdateSubtaskStatusApi({ subtaskId: subtaskIdForUpdate, newStatus });
    },
    [callUpdateSubtaskStatusApi],
  );

  // Function to open comment modal with prefilled text
  const openCommentModalWithText = useCallback((text: string) => {
    setPendingCommentText(text);
    setShouldOpenCommentModal(true);
  }, []);

  // --- End of logic moved from SubtaskActionsBar ---

  // Redirect to account page if user information is not available (e.g., not logged in).
  if (!userInfo) {
    return <Navigate to="/account" />;
  }

  // Display an error message if essential parameters (projectId, taskId) are missing.
  if (!projectId || !taskId) {
    return (
      <div className="container px-4 py-8 mx-auto">
        <div className="py-8 text-center text-red-500">タスクの読み込みに失敗しました</div>
      </div>
    );
  }

  if (isSubtasksError) {
    // TODO: Implement a more user-friendly error display
    return <div>Error loading subtasks. Please try again.</div>;
  }

  // Moved from lower in the component to avoid redeclaration errors after automated edit
  const currentSubtaskIndex = subtaskIds.indexOf(currentSubtaskId);
  const hasPreviousSubtaskState = currentSubtaskIndex > 0;
  const hasNextSubtaskState = currentSubtaskIndex < subtaskIds.length - 1;

  const navigateToSubtaskHandler = (direction: 'next' | 'prev') => {
    const newIndex = direction === 'next' ? currentSubtaskIndex + 1 : currentSubtaskIndex - 1;
    if (newIndex >= 0 && newIndex < subtaskIds.length) {
      setSearchParams({ subtaskId: subtaskIds[newIndex] }, { replace: true });
    }
  };

  const handleNavigateTask = async (direction: 'prev' | 'next') => {
    if (!navigationTasks || !currentTask) {
      return;
    }
    const currentIndex = navigationTasks.findIndex((t) => t.id === currentTask.id);
    if (currentIndex === -1) {
      return;
    }

    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex >= 0 && newIndex < navigationTasks.length) {
      const newTaskId = navigationTasks[newIndex].id;
      await navigate(`/projects/${projectId}/tasks/${newTaskId}`);
    }
  };

  // The context value should match TaskDetailContextType
  const taskDetailContextValue: TaskDetailContextType = {
    handleSubtaskStatusUpdate: handleSubtaskStatusUpdateForContext,
    openCommentModalWithText,
  };

  // Helper function to render annotation review content (for review panel tab)

  // Helper function to render AI Review Panel content
  const renderAiReviewContent = () => {
    // Show skeleton if subtasks are loading, or if there are no subtasks and still loading subtasks
    if (isSubtasksLoading || (!hasSubtasks && isSubtasksLoading)) {
      return <SimpleLoadingSpinner />;
    }

    // If there are no subtasks after loading, or if there's an error loading subtasks
    if (!hasSubtasks || isSubtasksError) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 h-full p-4 text-center bg-background">
          <div className="w-full max-w-md p-6 py-10 border rounded-lg shadow-md bg-card">
            <p className="text-lg font-medium text-card-foreground">
              {isSubtasksError ? 'サブタスクの読み込みに失敗しました。' : 'レビューするサブタスクがありません。'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {isSubtasksError
                ? 'ネットワーク接続を確認して再試行してください。'
                : '新しいサブタスクを作成してください。'}
            </p>
            {/* Optionally, add a button to create a subtask or retry loading */}
          </div>
        </div>
      );
    }

    // If subtask data is not yet loaded for the currentSubtaskId
    if (!subtask && currentSubtaskId) {
      return <SimpleLoadingSpinner />;
    }

    // If we're loading the latest AI review data, show skeleton
    if (isLoadingLatestReview) {
      return <SimpleLoadingSpinner />;
    }

    // 优先检查是否正在处理AI review - 避免UI跳动
    if (isProcessingAiReview) {
      console.log('AI review is processing, showing processing state only');
      return (
        <AiReviewPanel
          aiReviewResult={null} // 处理中时不显示历史结果，避免跳动
          activeFindingId={activeFindingId}
          onFindingInteraction={handleFindingInteraction}
          onViewImageCitation={(imageUrl, sourceText) => setImageViewModalState({ imageUrl, sourceText })}
          onRerunSectionReview={handleRerunAllReviewForPanel}
          rerunningSectionTitle={rerunningSectionTitle}
          currentSubtaskId={currentSubtaskId}
          projectId={projectId}
          isFetchingDetectedElements={false}
          onAddElementToReview={handleAddElementToReview}
          onIgnoreElement={handleIgnoreElement}
          addingElementId={addingElementId}
          ignoringElementId={ignoringElementId}
          isInitialReviewLoading={false}
          isSubtaskEmpty={isSubtaskEmpty}
          onStartInitialReview={async (subId) => {
            setRerunningSectionTitle('__INITIAL_REVIEW__');
            try {
              await processSubtaskForAiReview(subId, true);
            } catch (error) {
              console.error(`Error starting initial AI review for subtask ${subId}:`, error);
            } finally {
              setRerunningSectionTitle(null);
            }
          }}
          onAiReviewCompleted={(subtaskId) => {
            void (async () => {
              console.log('AI review completed, fetching latest results for subtask:', subtaskId);
              await fetchLatestAiReview(subtaskId, true);
            })();
          }}
          isProcessingReview={isProcessingAiReview}
          onProcessingStateChange={setIsProcessingAiReview}
          reviewStartTime={reviewStartTime}
          onFindingStatusUpdate={handleFindingStatusUpdate}
          onShowReReviewModal={() => {
            setReviewModalMode('rerun');
            setIsUnifiedReviewModalOpen(true);
          }}
          onShowInitialReviewModal={() => {
            setReviewModalMode('initial');
            setIsUnifiedReviewModalOpen(true);
          }}
        />
      );
    }

    // If we have existing AI review data OR we have a converted result, show it
    if (hasExistingReview || aiReviewResult) {
      return (
        <AiReviewPanel
          aiReviewResult={aiReviewResult}
          activeFindingId={activeFindingId}
          onFindingInteraction={handleFindingInteraction}
          onViewImageCitation={(imageUrl, sourceText) => setImageViewModalState({ imageUrl, sourceText })}
          onRerunSectionReview={handleRerunAllReviewForPanel}
          rerunningSectionTitle={rerunningSectionTitle}
          currentSubtaskId={currentSubtaskId}
          projectId={projectId}
          isFetchingDetectedElements={false} // Placeholder, connect to actual state if available
          onAddElementToReview={handleAddElementToReview} // Pass from useAiReview
          onIgnoreElement={handleIgnoreElement} // Pass from useAiReview
          addingElementId={addingElementId} // Pass from useAiReview
          ignoringElementId={ignoringElementId} // Pass from useAiReview
          isInitialReviewLoading={isAiReviewing && !aiReviewResult} // True if reviewing and no result yet
          isSubtaskEmpty={isSubtaskEmpty} // Pass the determined empty state
          onStartInitialReview={async (subId) => {
            // This should not be called if we have existing review, but keep it for safety
            setRerunningSectionTitle('__INITIAL_REVIEW__'); // Indicate loading
            try {
              await processSubtaskForAiReview(subId, true); // forceRefresh = true
            } catch (error) {
              console.error(`Error starting initial AI review for subtask ${subId}:`, error);
            } finally {
              setRerunningSectionTitle(null); // Clear loading state
            }
          }}
          onAiReviewCompleted={(subtaskId) => {
            void (async () => {
              console.log('AI review completed, fetching latest results for subtask:', subtaskId);
              await fetchLatestAiReview(subtaskId, true);
            })();
          }}
          isProcessingReview={isProcessingAiReview}
          onProcessingStateChange={setIsProcessingAiReview}
          reviewStartTime={reviewStartTime}
          onFindingStatusUpdate={handleFindingStatusUpdate}
          onShowReReviewModal={() => {
            setReviewModalMode('rerun');
            setIsUnifiedReviewModalOpen(true);
          }}
          onShowInitialReviewModal={() => {
            setReviewModalMode('initial');
            setIsUnifiedReviewModalOpen(true);
          }}
        />
      );
    }

    // If AI review is actively processing for the first time (no previous result to show)
    if (isAiReviewing && !aiReviewResult) {
      return <SimpleLoadingSpinner />;
    }

    // Default case: No existing review, show the "Start AI Review" interface
    return (
      <AiReviewPanel
        aiReviewResult={null} // No existing result
        activeFindingId={activeFindingId}
        onFindingInteraction={handleFindingInteraction}
        onViewImageCitation={(imageUrl, sourceText) => setImageViewModalState({ imageUrl, sourceText })}
        onRerunSectionReview={handleRerunAllReviewForPanel}
        rerunningSectionTitle={rerunningSectionTitle}
        currentSubtaskId={currentSubtaskId}
        projectId={projectId}
        isFetchingDetectedElements={false} // Placeholder, connect to actual state if available
        onAddElementToReview={handleAddElementToReview} // Pass from useAiReview
        onIgnoreElement={handleIgnoreElement} // Pass from useAiReview
        addingElementId={addingElementId} // Pass from useAiReview
        ignoringElementId={ignoringElementId} // Pass from useAiReview
        isInitialReviewLoading={isAiReviewing && !aiReviewResult} // True if reviewing and no result yet
        isSubtaskEmpty={isSubtaskEmpty} // Pass the determined empty state
        onStartInitialReview={async (subId) => {
          // This is for the "Start AI Review" button when no review exists
          // It should trigger a full review for the subtask.
          setRerunningSectionTitle('__INITIAL_REVIEW__'); // Indicate loading
          try {
            await processSubtaskForAiReview(subId, true); // forceRefresh = true
          } catch (error) {
            console.error(`Error starting initial AI review for subtask ${subId}:`, error);
          } finally {
            setRerunningSectionTitle(null); // Clear loading state
          }
        }}
        onAiReviewCompleted={(subtaskId) => {
          void (async () => {
            console.log('AI review completed, fetching latest results for subtask:', subtaskId);
            await fetchLatestAiReview(subtaskId, true);
          })();
        }}
        isProcessingReview={isProcessingAiReview}
        onProcessingStateChange={setIsProcessingAiReview}
        reviewStartTime={reviewStartTime}
        onFindingStatusUpdate={handleFindingStatusUpdate}
        onShowReReviewModal={() => {
          setReviewModalMode('rerun');
          setIsUnifiedReviewModalOpen(true);
        }}
        onShowInitialReviewModal={() => {
          setReviewModalMode('initial');
          setIsUnifiedReviewModalOpen(true);
        }}
      />
    );
  };

  return (
    <TaskDetailContext.Provider value={taskDetailContextValue}>
      <div className="flex flex-col h-screen bg-background">
        <div className={clsx('flex flex-1 overflow-hidden transition-all duration-300 ease-in-out')}>
          <div className="flex flex-col w-2/3 min-w-0">
            {projectId && taskId && (
              <TaskNavigationBar
                projectId={projectId}
                taskId={taskId}
                task={currentTask}
                allTasks={navigationTasks}
                totalTasks={totalTasks}
                isTaskLoading={isTaskLoading}
                onNavigateTask={handleNavigateTask}
              />
            )}
            <MainContent
              isSubtasksLoading={isSubtasksLoading}
              hasSubtasks={hasSubtasks}
              subtask={subtask}
              subtasks={subtasks || []}
              currentSubtaskId={currentSubtaskId}
              onSubtaskSelect={(subId: string) => {
                setSearchParams({ subtaskId: subId }, { replace: true });
              }}
              onVersionChange={setSelectedVersion}
              aiReviewResult={aiReviewResult}
              activeFindingId={activeFindingId}
              onFindingInteraction={handleFindingInteraction}
              canUpdateAsset={canUpdateAsset}
              isAiReviewing={isAiReviewing}
              onAssetFileUpdate={handleAssetFileUpdate}
              isUpdatingAsset={isUpdatingAsset}
              onUpdateSubtaskStatus={(newStatus) => {
                if (currentSubtaskId) {
                  void handleSubtaskStatusUpdateForContext(currentSubtaskId, newStatus);
                }
              }}
              isUpdatingStatus={isUpdatingSubtaskStatus}
              onNavigateToSubtask={navigateToSubtaskHandler}
              hasPreviousSubtask={hasPreviousSubtaskState}
              hasNextSubtask={hasNextSubtaskState}
              projectId={projectId}
              onOpenCreateSubtaskDialog={() => setIsCreateSubtaskDialogOpen(true)}
              selectedCharacter={selectedCharacter}
              onCharacterSelect={handleUserCharacterSelect}
              onSearchResults={(results, cropInfo) => {
                console.log('TaskDetail 接收到搜索结果:', results);
                console.log('TaskDetail 接收到裁剪信息:', cropInfo);
                setExternalSearchResults(results);
                setExternalCropInfo(cropInfo);
                // 自动切换到类似搜索标签页
                setActiveTab('item-search');
              }}
              onSwitchToSearchPanel={() => {
                setActiveTab('item-search');
              }}
              onSubtaskUpdate={(updatedSubtask) => {
                console.log('Subtask updated in parent, refetching...', updatedSubtask);
                void refetchSubtask();
                void refetchSubtasks();
              }}
              selectedItemBbox={selectedItemBbox}
              selectedItemLabel={selectedItemLabel}
              initialComment={shouldOpenCommentModal ? pendingCommentText : undefined}
              onInitialCommentUsed={() => {
                setPendingCommentText('');
                setShouldOpenCommentModal(false);
              }}
            />
          </div>

          {/* Container for Right Panel (Tabbed Interface) */}
          <div className="flex flex-col w-1/3 overflow-x-hidden border-l bg-background">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'ai-review' | 'character-display' | 'item-search')}
              className="flex flex-col h-full"
            >
              {/* Tab Navigation */}
              <div className="relative bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200/80">
                <TabsList className="grid w-full grid-cols-3 bg-transparent p-0 h-14 rounded-none border-0 gap-0">
                  <TabsTrigger
                    value="ai-review"
                    className="relative text-sm font-semibold h-full rounded-none border-0 bg-transparent transition-all duration-300 ease-out
                      data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100/50 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:z-10
                      data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:text-blue-600 data-[state=inactive]:hover:bg-white/70 data-[state=inactive]:hover:shadow-md data-[state=inactive]:hover:shadow-slate-200/50
                      before:absolute before:inset-0 before:bg-gradient-to-b before:from-transparent before:to-blue-50/30 before:opacity-0 before:transition-opacity before:duration-300 data-[state=active]:before:opacity-100"
                  >
                    <div className="relative z-10 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                      AI監修
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="character-display"
                    className="relative text-sm font-semibold h-full rounded-none border-0 bg-transparent transition-all duration-300 ease-out
                      data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-100/50 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:z-10
                      data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:text-emerald-600 data-[state=inactive]:hover:bg-white/70 data-[state=inactive]:hover:shadow-md data-[state=inactive]:hover:shadow-slate-200/50
                      before:absolute before:inset-0 before:bg-gradient-to-b before:from-transparent before:to-emerald-50/30 before:opacity-0 before:transition-opacity before:duration-300 data-[state=active]:before:opacity-100"
                  >
                    <div className="relative z-10 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      キャラクター
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="item-search"
                    className="relative text-sm font-semibold h-full rounded-none border-0 bg-transparent transition-all duration-300 ease-out
                      data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-100/50 data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:z-10
                      data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:text-purple-600 data-[state=inactive]:hover:bg-white/70 data-[state=inactive]:hover:shadow-md data-[state=inactive]:hover:shadow-slate-200/50
                      before:absolute before:inset-0 before:bg-gradient-to-b before:from-transparent before:to-purple-50/30 before:opacity-0 before:transition-opacity before:duration-300 data-[state=active]:before:opacity-100"
                  >
                    <div className="relative z-10 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      類似検索
                    </div>
                  </TabsTrigger>
                </TabsList>
                {/* Decorative bottom border */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>

              {/* Tab Content */}
              <TabsContent value="ai-review" className="flex-1 overflow-y-auto mt-0 data-[state=inactive]:hidden">
                <div className="p-2">{renderAiReviewContent()}</div>
              </TabsContent>

              <TabsContent value="character-display" className="flex-1 overflow-y-auto">
                <CharacterDisplayPanel
                  projectId={projectId}
                  subtaskId={currentSubtaskId || ''}
                  subtaskImageUrl={subtask?.content?.s3_path ? displayableOriginalAssetUrl : null}
                  subtasks={subtasks}
                />
              </TabsContent>

              <TabsContent value="item-search" className="flex-1 overflow-y-auto">
                <ItemSearchPanel
                  projectId={projectId}
                  subtaskId={currentSubtaskId || ''}
                  subtaskImageUrl={subtask?.content?.s3_path ? displayableOriginalAssetUrl : null}
                  subtasks={subtasks}
                  isLoading={isTaskLoading || isSubtasksLoading}
                  externalSearchResults={externalSearchResults ? externalSearchResults.results : []}
                  externalCropInfo={externalCropInfo}
                  onExternalCropReset={() => {
                    setExternalSearchResults(null);
                    setExternalCropInfo(null);
                    setSearchRect(undefined); // 清除左边图片上的搜索选择框
                  }}
                  searchContext={searchContext}
                  onBoundingBoxSelect={(bbox, label) => {
                    setSelectedItemBbox(bbox);
                    setSelectedItemLabel(label || null);
                    console.log('Selected bounding box:', bbox, 'Label:', label);
                  }}
                  taskId={taskId}
                />
              </TabsContent>
            </Tabs>
          </div>

          <ImagePreviewModal modalState={imageViewModalState} onClose={() => setImageViewModalState(null)} />

          {/* Render ImageUpdateModal conditionally */}
          {isInComparisonMode && originalAssetUrlForComparison && (
            <ImageUpdateModal
              isOpen={isInComparisonMode}
              onClose={handleCancelComparison}
              originalImageUrl={originalAssetUrlForComparison}
              newlyUploadedFile={pendingAssetFile}
              onConfirmUpdate={handleConfirmComparedAssetUpdate}
              subtaskName={subtask?.name}
            />
          )}

          {/* 创建子任务对话框 */}
          {taskId && projectId && (
            <CreateSubtaskDialog
              isOpen={isCreateSubtaskDialogOpen}
              onOpenChange={setIsCreateSubtaskDialogOpen}
              taskId={taskId}
              projectId={projectId}
              onSuccess={() => {
                void refetchSubtasks(); // Refetch subtasks on successful creation
                void refetchCurrentTask(); // Potentially refetch task if subtask creation affects task summary
              }}
            />
          )}

          {/* Unified review modal */}
          {projectId && taskId && (
            <UnifiedReviewModal
              isOpen={isUnifiedReviewModalOpen}
              onClose={() => setIsUnifiedReviewModalOpen(false)}
              onConfirm={handleUnifiedReviewConfirm}
              taskId={taskId}
              projectId={projectId}
              isProcessing={isProcessingAiReview}
              selectedCharacter={selectedCharacter}
              mode={reviewModalMode}
            />
          )}
        </div>
      </div>
    </TaskDetailContext.Provider>
  );
}

export default TaskDetailPage;
