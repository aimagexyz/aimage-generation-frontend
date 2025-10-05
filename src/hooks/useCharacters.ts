import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type CharacterCreate,
  charactersService,
  type CharacterUpdate,
  type UploadProgressCallback,
} from '@/api/charactersService';

const CHARACTERS_QUERY_KEY = 'characters';

// Hook for listing characters
export function useListCharacters(projectId: string, ipId?: string) {
  return useQuery({
    queryKey: [CHARACTERS_QUERY_KEY, 'list', projectId, ipId],
    queryFn: () => charactersService.listCharacters(projectId, ipId),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for getting a single character
export function useCharacter(characterId: string | null | undefined, projectId: string) {
  return useQuery({
    queryKey: [CHARACTERS_QUERY_KEY, 'detail', characterId, projectId],
    queryFn: () => {
      if (!characterId) {
        throw new Error('Character ID is required');
      }
      return charactersService.getCharacter(characterId, projectId);
    },
    enabled: !!characterId && !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for creating a character
export function useCreateCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CharacterCreate }) =>
      charactersService.createCharacter(projectId, data),
    onSuccess: (_, { projectId }) => {
      // Invalidate the character list query to refetch
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, 'list', projectId] });
    },
  });
}

// Hook for updating a character
export function useUpdateCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ characterId, projectId, data }: { characterId: string; projectId: string; data: CharacterUpdate }) =>
      charactersService.updateCharacter(characterId, projectId, data),
    onSuccess: (updatedCharacter, { projectId }) => {
      // Invalidate both the specific character and the list
      void queryClient.invalidateQueries({
        queryKey: [CHARACTERS_QUERY_KEY, 'detail', updatedCharacter.id, projectId],
      });
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, 'list', projectId] });
    },
  });
}

// Hook for deleting a character
export function useDeleteCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ characterId, projectId }: { characterId: string; projectId: string }) => {
      console.log('projectId', projectId);
      await charactersService.deleteCharacter(characterId);
    },
    onSuccess: (_, { projectId }) => {
      console.log('onSuccess', projectId);
      // Invalidate the character list query
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, 'list', projectId] });
    },
  });
}

// Hook for uploading a character image
export function useUploadCharacterImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ characterId, projectId, file }: { characterId: string; projectId: string; file: File }) =>
      charactersService.uploadCharacterImage(characterId, projectId, file),
    onSuccess: (updatedCharacter, { projectId }) => {
      // Invalidate both the specific character and the list
      void queryClient.invalidateQueries({
        queryKey: [CHARACTERS_QUERY_KEY, 'detail', updatedCharacter.id, projectId],
      });
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, 'list', projectId] });
    },
  });
}

// Hook for getting character image as a Blob
export function useCharacterImage(characterId: string | null | undefined, projectId: string) {
  return useQuery({
    queryKey: [CHARACTERS_QUERY_KEY, 'image', characterId, projectId],
    queryFn: () => {
      if (!characterId) {
        throw new Error('Character ID is required');
      }
      return charactersService.getCharacterImage(characterId, projectId);
    },
    enabled: !!characterId && !!projectId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Hook for getting direct character image URL
export function useCharacterImageUrl(characterId: string | null | undefined, projectId: string) {
  if (!characterId || !projectId) {
    return '';
  }
  return charactersService.getCharacterImageUrl(characterId, projectId);
}

// Gallery hooks
export function useCharacterGallery(characterId: string | null | undefined, projectId: string) {
  return useQuery({
    queryKey: [CHARACTERS_QUERY_KEY, 'gallery', characterId, projectId],
    queryFn: () => {
      if (!characterId) {
        throw new Error('Character ID is required');
      }
      return charactersService.getCharacterGallery(characterId, projectId);
    },
    enabled: !!characterId && !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUploadGalleryImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ characterId, projectId, file }: { characterId: string; projectId: string; file: File }) =>
      charactersService.uploadGalleryImage(characterId, projectId, file),
    onSuccess: (_, { characterId, projectId }) => {
      // Invalidate related queries
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, 'gallery', characterId, projectId] });
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, 'list', projectId] });
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, characterId] });
    },
  });
}

// Hook for batch uploading multiple gallery images
export function useUploadGalleryImagesBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      projectId,
      files,
      onProgress,
    }: {
      characterId: string;
      projectId: string;
      files: File[];
      onProgress?: UploadProgressCallback;
    }) => charactersService.uploadGalleryImagesBatch(characterId, projectId, files, onProgress),
    onSuccess: (_, { characterId, projectId }) => {
      // Invalidate related queries
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, 'gallery', characterId, projectId] });
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, 'list', projectId] });
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, characterId] });
    },
  });
}

export function useDeleteGalleryImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      projectId,
      imageIndex,
    }: {
      characterId: string;
      projectId: string;
      imageIndex: number;
    }) => charactersService.deleteGalleryImage(characterId, projectId, imageIndex),
    onSuccess: (_, { characterId, projectId }) => {
      // Invalidate related queries
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, 'gallery', characterId, projectId] });
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, 'list', projectId] });
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, characterId] });
    },
  });
}

// Concept Art hooks
export function useCharacterConceptArt(characterId: string | null | undefined, projectId: string) {
  return useQuery({
    queryKey: [CHARACTERS_QUERY_KEY, 'concept-art', characterId, projectId],
    queryFn: () => {
      if (!characterId) {
        throw new Error('Character ID is required');
      }
      return charactersService.getCharacterConceptArt(characterId, projectId);
    },
    enabled: !!characterId && !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUploadConceptArtImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ characterId, projectId, file }: { characterId: string; projectId: string; file: File }) =>
      charactersService.uploadConceptArtImage(characterId, projectId, file),
    onSuccess: (_, { characterId, projectId }) => {
      // Invalidate related queries
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, 'concept-art', characterId, projectId] });
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, 'list', projectId] });
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, characterId] });
    },
  });
}

// Hook for batch uploading multiple concept art images
export function useUploadConceptArtImagesBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      projectId,
      files,
      onProgress,
    }: {
      characterId: string;
      projectId: string;
      files: File[];
      onProgress?: UploadProgressCallback;
    }) => charactersService.uploadConceptArtImagesBatch(characterId, projectId, files, onProgress),
    onSuccess: (_, { characterId, projectId }) => {
      // Invalidate related queries
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, 'concept-art', characterId, projectId] });
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, 'list', projectId] });
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, characterId] });
    },
  });
}

export function useDeleteConceptArtImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      projectId,
      imageIndex,
    }: {
      characterId: string;
      projectId: string;
      imageIndex: number;
    }) => charactersService.deleteConceptArtImage(characterId, projectId, imageIndex),
    onSuccess: (_, { characterId, projectId }) => {
      // Invalidate related queries
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, 'concept-art', characterId, projectId] });
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, 'list', projectId] });
      void queryClient.invalidateQueries({ queryKey: [CHARACTERS_QUERY_KEY, characterId] });
    },
  });
}
