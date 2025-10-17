import { useCallback, useRef, useState } from 'react';

import {
  type GeneratedReferenceResponse,
  type GenerateRequest,
  referenceGenerationService,
} from '@/api/referenceGenerationService';
import { useAuth } from '@/hooks/useAuth';

import { type DetailedSettings } from '../components/modals/DetailedSettingsModal';
import { type StructuredSelections } from '../components/modals/StructuredInstructionModal';
import { type Message } from '../types';
import { buildPrompt, validatePrompt } from '../utils/promptBuilder';

type GenerationState = 'idle' | 'generating' | 'completed' | 'failed';
type GenerationJob = {
  id: string;
  prompt: string;
  settings: DetailedSettings;
  state: GenerationState;
  progress?: number;
  startTime: number;
  estimatedTime?: number;
};

interface ApiError {
  name?: string;
  message: string;
}

// Map structured selections to the new API tags format
const mapStructuredSelectionsToTags = (selections: StructuredSelections) => {
  const tags: {
    style?: string;
    pose?: string;
    camera?: string;
    lighting?: string;
  } = {};

  // Extract style from clothing theme or basic ethnicity
  const styleMapping: Record<string, string> = {
    日本人: 'anime',
    東アジア系: 'anime',
    白人系: 'anime',
    黒人系: 'anime',
    ファンタジー種族: 'anime',
    現代風: 'anime',
    和風: 'anime',
    ファンタジー: 'anime',
    SF: 'anime',
  };

  // Map pose from pose selections
  const poseMapping: Record<string, string> = {
    立ちポーズ: 'standing',
    座りポーズ: 'sitting',
    ジャンプ: 'action',
    走る: 'action',
    歩く: 'action',
    踊る: 'action',
    戦闘ポーズ: 'action',
    リラックス: 'sitting',
    寝そべり: 'sitting',
  };

  // Map camera from composition
  const cameraMapping: Record<string, string> = {
    顔アップ: 'close-up',
    バストアップ: 'portrait',
    膝上: 'portrait',
    全身: 'full-body',
    後ろ姿: 'full-body',
    横顔: 'portrait',
    俯瞰: 'wide-shot',
    仰角: 'wide-shot',
  };

  // Extract values from selections and map them
  Object.entries(selections).forEach(([category, value]) => {
    if (category.includes('ethnicity') || category.includes('clothing-theme')) {
      if (styleMapping[value] && !tags.style) {
        tags.style = styleMapping[value];
      }
    }

    if (category.includes('pose-pose')) {
      if (poseMapping[value] && !tags.pose) {
        tags.pose = poseMapping[value];
      }
    }

    if (category.includes('pose-composition')) {
      if (cameraMapping[value] && !tags.camera) {
        tags.camera = cameraMapping[value];
      }
    }
  });

  // Set default values for better generation
  if (!tags.style) {
    tags.style = 'anime';
  }
  if (!tags.pose) {
    tags.pose = 'standing';
  }
  if (!tags.camera) {
    tags.camera = 'full-body';
  }
  if (!tags.lighting) {
    tags.lighting = 'natural';
  }

  return tags;
};

// Default structured selections that correspond to API defaults for better UX
const getDefaultStructuredSelections = (): StructuredSelections => {
  return {
    'basic-ethnicity': '日本人', // Maps to style: 'anime'
    'pose-pose': '立ちポーズ', // Maps to pose: 'standing'
    'pose-composition': '全身', // Maps to camera: 'full-body'
  };
};

export function useImageGen() {
  const { currentProjectId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [detailedSettings, setDetailedSettings] = useState<DetailedSettings>({
    number_of_images: 4,
    aspect_ratio: '1:1',
  });
  const [structuredSelections, setStructuredSelections] = useState<StructuredSelections>(
    getDefaultStructuredSelections(),
  );
  const [generationQueue, setGenerationQueue] = useState<GenerationJob[]>([]);
  const [generationHistory, setGenerationHistory] = useState<Message[]>([]);
  const [promptImages, setPromptImages] = useState<string[]>([]);
  const [promptImageFiles, setPromptImageFiles] = useState<File[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Extract progress update logic to reduce nesting
  const updateJobProgress = useCallback((jobId: string, startTime: number, estimatedTime: number) => {
    setGenerationQueue((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, progress: Math.min(((Date.now() - startTime) / estimatedTime) * 100, 95) } : j,
      ),
    );
  }, []);

  // Extract job state update logic to reduce nesting
  const updateJobState = useCallback((jobId: string, state: GenerationState, progress?: number) => {
    setGenerationQueue((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, state, progress: progress ?? j.progress } : j)),
    );
  }, []);

  // Extract queue cleanup logic to reduce nesting
  const cleanupCompletedJob = useCallback((jobId: string) => {
    setGenerationQueue((prev) => prev.filter((j) => j.id !== jobId));
  }, []);

  // Extract error handling logic to reduce cognitive complexity
  const handleGenerationError = useCallback(
    (error: unknown, jobId: string) => {
      console.error('Failed to generate images:', error);

      const apiError = error as ApiError;

      // Handle cancellation
      if (apiError.name === 'AbortError') {
        const cancelMessage: Message = {
          id: Date.now() + 1,
          type: 'response',
          text: '生成がキャンセルされました。',
          metadata: { jobId, timestamp: Date.now() },
        };
        setConversation((prev) => [...prev, cancelMessage]);

        updateJobState(jobId, 'failed');
      } else {
        const errorMessage: Message = {
          id: Date.now() + 1,
          type: 'response',
          text: '画像の生成に失敗しました。後でもう一度お試しください。',
          metadata: {
            jobId,
            error: apiError.message,
            timestamp: Date.now(),
          },
        };
        setConversation((prev) => [...prev, errorMessage]);
      }
    },
    [updateJobState],
  );

  // Extract job creation logic
  const createGenerationJob = useCallback(
    (fullPrompt: string, jobId: string): GenerationJob => {
      return {
        id: jobId,
        prompt: fullPrompt,
        settings: detailedSettings,
        state: 'generating',
        progress: 0,
        startTime: Date.now(),
        estimatedTime: detailedSettings.number_of_images * 15000, // Estimate based on image count
      };
    },
    [detailedSettings],
  );

  // Extract message creation logic
  const createPromptMessage = useCallback(
    (promptToSubmit: string, fullPrompt: string, jobId: string, images?: string[]): Message => {
      return {
        id: Date.now(),
        type: 'prompt',
        text: promptToSubmit,
        images: images && images.length > 0 ? images : undefined,
        metadata: {
          fullPrompt,
          settings: detailedSettings,
          jobId,
          timestamp: Date.now(),
        },
      };
    },
    [detailedSettings],
  );

  const createResponseMessage = useCallback(
    (generatedReferences: GeneratedReferenceResponse[], jobId: string, startTime: number): Message => {
      const images = generatedReferences.map((ref) => ref.image_url);

      return {
        id: Date.now() + 1,
        type: 'response',
        images,
        aspect_ratio: detailedSettings.aspect_ratio,
        metadata: {
          jobId,
          generationTime: Date.now() - startTime,
          settings: detailedSettings,
          timestamp: Date.now(),
          generatedReferences: generatedReferences.map((ref) => ({
            id: ref.id,
            image_url: ref.image_url,
            image_path: ref.image_path,
            base_prompt: ref.base_prompt,
            enhanced_prompt: ref.enhanced_prompt,
          })),
        },
      };
    },
    [detailedSettings],
  );

  const handleGenerate = useCallback(
    async (promptToSubmit: string) => {
      if (!promptToSubmit.trim() || isLoading) {
        return;
      }

      if (!currentProjectId) {
        console.error('No current project ID available');
        return;
      }

      // Validate prompt
      const validation = validatePrompt(promptToSubmit);
      if (!validation.isValid) {
        console.warn('Invalid prompt:', validation.suggestion);
        return;
      }

      // Build the complete prompt
      const fullPrompt = buildPrompt(promptToSubmit, structuredSelections);

      // Create job tracking
      const jobId = `job-${Date.now()}`;
      const job = createGenerationJob(fullPrompt, jobId);
      setGenerationQueue((prev) => [...prev, job]);

      const newPromptMessage = createPromptMessage(promptToSubmit, fullPrompt, jobId, promptImages);
      setConversation((prev) => [...prev, newPromptMessage]);
      setIsLoading(true);
      setPrompt('');
      // Clear attached prompt images after submission (do not revoke to keep previews visible in conversation)
      setPromptImages([]);
      setPromptImageFiles([]);

      // Create abort controller for this generation
      abortControllerRef.current = new AbortController();

      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          updateJobProgress(jobId, job.startTime, job.estimatedTime || 10000);
        }, 1000);

        // Map structured selections to new API tags format
        const tags = mapStructuredSelectionsToTags(structuredSelections);

        // Prepare request for API
        const request: GenerateRequest = {
          base_prompt: fullPrompt,
          tags,
          count: detailedSettings.number_of_images,
          aspect_ratio: detailedSettings.aspect_ratio,
          negative_prompt: detailedSettings.negative_prompt,
        };

        // Choose text-to-image or image-to-image based on attachments
        const response: GeneratedReferenceResponse[] =
          promptImageFiles.length > 0
            ? await referenceGenerationService.generateReferencesFromImages(currentProjectId, request, promptImageFiles)
            : await referenceGenerationService.generateReferences(currentProjectId, request);

        clearInterval(progressInterval);

        // Create response message with full generated reference metadata
        const newResponseMessage = createResponseMessage(response, jobId, job.startTime);
        setConversation((prev) => [...prev, newResponseMessage]);
        setGenerationHistory((prev) => [...prev, newPromptMessage, newResponseMessage]);

        // Update job state
        updateJobState(jobId, 'completed', 100);
      } catch (_e) {
        const err = _e as { name?: string; message?: string };
        handleGenerationError(err, jobId);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;

        // Clean up completed jobs after a delay
        setTimeout(() => {
          cleanupCompletedJob(jobId);
        }, 5000);
      }
    },
    [
      isLoading,
      currentProjectId,
      structuredSelections,
      detailedSettings,
      createGenerationJob,
      createPromptMessage,
      updateJobProgress,
      updateJobState,
      handleGenerationError,
      createResponseMessage,
      cleanupCompletedJob,
      promptImages,
      promptImageFiles,
    ],
  );

  // Cancel current generation
  const handleCancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Enhanced clear with options
  const handleClear = useCallback(
    (clearHistory = false) => {
      setConversation([]);
      setPrompt('');

      if (clearHistory) {
        setGenerationHistory([]);
      }

      // Cancel any ongoing generation
      handleCancelGeneration();
    },
    [handleCancelGeneration],
  );

  // Regenerate with same settings
  const handleRegenerate = useCallback(
    async (messageId: number) => {
      const message = conversation.find((m) => m.id === messageId && m.type === 'prompt');
      if (message?.text) {
        await handleGenerate(message.text);
      }
    },
    [conversation, handleGenerate],
  );

  const handleRemoveSelection = useCallback((selectionTitle: string) => {
    setStructuredSelections((prev) => {
      const newSelections = { ...prev };
      delete newSelections[selectionTitle];
      return newSelections;
    });
  }, []);

  // Enhanced image collection with metadata
  const allImages = conversation.flatMap((msg) =>
    msg.images
      ? msg.images.map((img, index) => ({
          src: img,
          aspect_ratio: msg.aspect_ratio || '1:1',
          messageId: msg.id,
          timestamp: msg.metadata?.timestamp || Date.now(),
          settings: msg.metadata?.settings || detailedSettings,
          index,
        }))
      : [],
  );

  // Get generation statistics
  const getGenerationStats = useCallback(() => {
    const totalGenerations = conversation.filter((m) => m.type === 'response' && m.images).length;
    const totalImages = allImages.length;
    const avgGenerationTime =
      generationHistory
        .filter((m) => m.metadata?.generationTime)
        .reduce((acc, m) => acc + (m.metadata?.generationTime || 0), 0) /
      Math.max(1, generationHistory.filter((m) => m.metadata?.generationTime).length);

    return {
      totalGenerations,
      totalImages,
      avgGenerationTime: Math.round(avgGenerationTime / 1000), // in seconds
      currentQueue: generationQueue.filter((j) => j.state === 'generating').length,
    };
  }, [conversation, allImages, generationHistory, generationQueue]);

  return {
    // Core state
    isLoading,
    prompt,
    setPrompt,
    conversation,
    detailedSettings,
    setDetailedSettings,
    structuredSelections,
    setStructuredSelections,
    promptImages,

    // Enhanced actions
    handleGenerate,
    handleClear,
    handleRemoveSelection,
    handleCancelGeneration,
    handleRegenerate,
    addPromptImageUrls: useCallback((urls: string[]) => {
      if (!urls || urls.length === 0) {
        return;
      }
      setPromptImages((prev) => [...prev, ...urls]);
    }, []),
    addPromptImages: useCallback((files: File[] | FileList) => {
      const array = Array.from(files);
      if (array.length === 0) {
        return;
      }
      const urls = array.map((f) => URL.createObjectURL(f));
      setPromptImages((prev) => [...prev, ...urls]);
      setPromptImageFiles((prev) => [...prev, ...array]);
    }, []),
    removePromptImage: useCallback((index: number) => {
      setPromptImages((prev) => {
        if (index < 0 || index >= prev.length) {
          return prev;
        }
        const toRemove = prev[index];
        if (toRemove && toRemove.startsWith('blob:')) {
          URL.revokeObjectURL(toRemove);
        }
        return [...prev.slice(0, index), ...prev.slice(index + 1)];
      });
      setPromptImageFiles((prev) => {
        if (index < 0 || index >= prev.length) {
          return prev;
        }
        return [...prev.slice(0, index), ...prev.slice(index + 1)];
      });
    }, []),
    clearPromptImages: useCallback(() => {
      setPromptImages((prev) => {
        prev.forEach((url) => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
        return [];
      });
      setPromptImageFiles([]);
    }, []),

    // Enhanced data
    allImages,
    generationQueue,
    generationHistory,

    // Utilities
    validatePrompt,
    buildPrompt,
    getGenerationStats,
  };
}
