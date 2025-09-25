import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import {
  type GeneratedReferenceResponse,
  mapSettingsToRequest,
  referenceGenerationService,
} from '@/api/referenceGenerationService';
import { useAuth } from '@/hooks/useAuth';
import { type DetailedSettings } from '@/pages/ReferenceGeneration/components/modals/DetailedSettingsModal';
import { type StructuredSelections } from '@/pages/ReferenceGeneration/components/modals/StructuredInstructionModal';

export interface ReferenceGenerationState {
  prompt: string;
  detailedSettings: DetailedSettings;
  structuredSelections: StructuredSelections;
  negativePrompt: string;
}

export function useReferenceGeneration() {
  const { currentProjectId } = useAuth();
  const queryClient = useQueryClient();

  // Local state
  const [state, setState] = useState<ReferenceGenerationState>({
    prompt: '',
    detailedSettings: {
      number_of_images: 1,
      aspect_ratio: '1:1',
    },
    structuredSelections: {},
    negativePrompt: '',
  });

  // Query for listing existing references
  const {
    data: references = [],
    isLoading: isLoadingReferences,
    refetch: refetchReferences,
  } = useQuery({
    queryKey: ['references', currentProjectId],
    queryFn: () => (currentProjectId ? referenceGenerationService.listReferences(currentProjectId) : []),
    enabled: !!currentProjectId,
  });

  // Mutation for generating new references
  const generateMutation = useMutation({
    mutationFn: async (request: Parameters<typeof referenceGenerationService.generateReferences>[1]) => {
      if (!currentProjectId) {
        throw new Error('No project selected');
      }
      return referenceGenerationService.generateReferences(currentProjectId, request);
    },
    onSuccess: (newReferences) => {
      // Update the query cache
      queryClient.setQueryData(['references', currentProjectId], (old: GeneratedReferenceResponse[] = []) => [
        ...newReferences,
        ...old,
      ]);
    },
  });

  // Main generation function
  const handleGenerate = useCallback(async () => {
    if (!state.prompt.trim() || !currentProjectId) {
      return;
    }

    const request = mapSettingsToRequest(
      state.prompt,
      state.detailedSettings,
      state.structuredSelections,
      state.negativePrompt || undefined,
    );

    try {
      await generateMutation.mutateAsync(request);
      // Clear prompt after successful generation
      setState((prev) => ({ ...prev, prompt: '' }));
    } catch (error) {
      console.error('Generation failed:', error);
      throw error;
    }
  }, [state, currentProjectId, generateMutation]);

  // Update functions
  const updatePrompt = useCallback((prompt: string) => {
    setState((prev) => ({ ...prev, prompt }));
  }, []);

  const updateDetailedSettings = useCallback((detailedSettings: DetailedSettings) => {
    setState((prev) => ({ ...prev, detailedSettings }));
  }, []);

  const updateStructuredSelections = useCallback((structuredSelections: StructuredSelections) => {
    setState((prev) => ({ ...prev, structuredSelections }));
  }, []);

  const updateNegativePrompt = useCallback((negativePrompt: string) => {
    setState((prev) => ({ ...prev, negativePrompt }));
  }, []);

  const removeSelection = useCallback((selectionKey: string) => {
    setState((prev) => {
      const newSelections = { ...prev.structuredSelections };
      delete newSelections[selectionKey];
      return { ...prev, structuredSelections: newSelections };
    });
  }, []);

  const clearAll = useCallback(() => {
    setState({
      prompt: '',
      detailedSettings: {
        number_of_images: 1,
        aspect_ratio: '1:1',
      },
      structuredSelections: {},
      negativePrompt: '',
    });
  }, []);

  // Convert references to the existing Message format for compatibility
  const conversationMessages = references.map((ref) => ({
    id: parseInt(ref.id, 10) || Date.now(),
    type: 'response' as const,
    text: `Enhanced prompt: ${ref.enhanced_prompt}`,
    images: [ref.image_url],
    aspect_ratio: state.detailedSettings.aspect_ratio,
    metadata: {
      timestamp: new Date(ref.created_at).getTime(),
      settings: state.detailedSettings,
      enhanced_prompt: ref.enhanced_prompt,
      base_prompt: ref.base_prompt,
      tags: ref.tags,
    },
  }));

  return {
    // State
    ...state,

    // Data
    references,
    conversationMessages,
    isGenerating: generateMutation.isPending,
    isLoadingReferences,

    // Actions
    handleGenerate,
    updatePrompt,
    updateDetailedSettings,
    updateStructuredSelections,
    updateNegativePrompt,
    removeSelection,
    clearAll,
    refetchReferences,

    // Status
    error: generateMutation.error,
    isError: generateMutation.isError,
  };
}
