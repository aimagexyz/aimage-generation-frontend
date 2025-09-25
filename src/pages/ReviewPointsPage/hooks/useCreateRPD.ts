import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui/use-toast';

import { ApiError } from '../../../api/apiClient';
import { uploadRPDReferenceImage, uploadRPDReferenceImagesBatch } from '../../../api/client';
import { reviewPointDefinitionsService } from '../../../api/reviewPointDefinitionsService';
import type { ReviewPointDefinitionCreate, ReviewPointDefinitionSchema } from '../../../types/ReviewPointDefinition';

// No separate variables type needed if ReviewPointDefinitionCreate is directly used.

export function useCreateRPD() {
  const queryClient = useQueryClient();

  return useMutation<
    ReviewPointDefinitionSchema, // Type of data returned by the mutationFn
    ApiError, // Type of error
    ReviewPointDefinitionCreate // Type of variables passed to the mutationFn
  >({
    mutationFn: async (data: ReviewPointDefinitionCreate) => {
      return reviewPointDefinitionsService.createReviewPointDefinition(data);
    },
    onSuccess: (newRPD: ReviewPointDefinitionSchema) => {
      void queryClient.invalidateQueries({ queryKey: ['reviewPointDefinitions'] });
      toast({
        title: 'RPD Created',
        description: `Successfully created RPD "${newRPD.key}".`,
        variant: 'default',
      });
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Error Creating RPD',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}

export function useUploadRPDReferenceImage() {
  return useMutation({
    mutationFn: async ({ projectId, file }: { projectId: string; file: File }) => {
      return await uploadRPDReferenceImage(projectId, file);
    },
    onSuccess: () => {
      // No need to invalidate queries since this just uploads files, doesn't change RPD list
    },
    onError: (error: unknown) => {
      console.error('Failed to upload RPD reference image:', error);
    },
  });
}

export function useUploadRPDReferenceImagesBatch() {
  return useMutation({
    mutationFn: async ({
      projectId,
      files,
      onProgress,
    }: {
      projectId: string;
      files: File[];
      onProgress?: (progress: number, status: string) => void;
    }) => {
      return await uploadRPDReferenceImagesBatch(projectId, files, onProgress);
    },
    onSuccess: () => {
      // No need to invalidate queries since this just uploads files, doesn't change RPD list
    },
    onError: (error: unknown) => {
      console.error('Failed to batch upload RPD reference images:', error);
    },
  });
}
