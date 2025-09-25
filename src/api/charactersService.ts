import type { components } from '@/api/schemas';

import { fetchApi } from './client';
import type { UrlPaths } from './helper';

// Define types based on the schema
export type CharacterDetail = components['schemas']['CharacterDetail'];
export type CharacterCreate = components['schemas']['CharacterCreate'];
export type CharacterUpdate = components['schemas']['CharacterUpdate'];

// Batch upload response type
export interface BatchUploadResponse {
  character_id: string;
  uploaded_count: number;
  failed_count: number;
  uploaded_files: Array<{
    filename: string;
    s3_key: string;
    size: number;
  }>;
  failed_files: Array<{
    filename: string;
    error: string;
  }>;
  total_gallery_images: number;
}

// Upload progress callback type
export interface UploadProgressCallback {
  (progress: number, fileName: string): void;
}

const BASE_URL = '/api/v1/characters';

export const charactersService = {
  // List characters for a project
  listCharacters: async (projectId: string, ipId?: string): Promise<CharacterDetail[]> => {
    const response = await fetchApi({
      url: `${BASE_URL}/` as UrlPaths,
      method: 'get',
      params: {
        project_id: projectId,

        ip_id: ipId || '',
      },
    });
    return response.data as CharacterDetail[];
  },

  // Get a character detail
  getCharacter: async (characterId: string, projectId: string): Promise<CharacterDetail> => {
    const response = await fetchApi({
      url: `${BASE_URL}/${characterId}` as '/api/v1/characters/{character_id}',
      method: 'get',
      params: {
        project_id: projectId,
      },
    });
    return response.data;
  },

  // Create a new character
  createCharacter: async (projectId: string, data: CharacterCreate): Promise<CharacterDetail> => {
    const response = await fetchApi({
      url: `${BASE_URL}/` as UrlPaths,
      method: 'post',
      params: {
        project_id: projectId,
      },
      data,
    });
    return response.data as CharacterDetail;
  },

  // Update a character
  updateCharacter: async (characterId: string, projectId: string, data: CharacterUpdate): Promise<CharacterDetail> => {
    const response = await fetchApi({
      url: `${BASE_URL}/${characterId}` as '/api/v1/characters/{character_id}',
      method: 'put',
      params: {
        project_id: projectId,
      },
      data,
    });
    return response.data;
  },

  // Delete a character
  deleteCharacter: async (characterId: string): Promise<void> => {
    await fetchApi({
      url: `${BASE_URL}/${characterId}` as '/api/v1/characters/{character_id}',
      method: 'delete',
    });
  },

  // Upload a character image
  uploadCharacterImage: async (characterId: string, projectId: string, file: File): Promise<CharacterDetail> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetchApi({
      url: `${BASE_URL}/${characterId}/upload-image` as '/api/v1/characters/{character_id}/upload-image',
      method: 'post',
      params: {
        project_id: projectId,
      },
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get character image directly (returns blob data)
  getCharacterImage: async (characterId: string, projectId: string): Promise<Blob> => {
    const response = await fetchApi({
      url: `${BASE_URL}/${characterId}/image` as UrlPaths,
      method: 'get',
      params: {
        project_id: projectId,
      },
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  // Get character image URL (for direct image display)
  getCharacterImageUrl: (characterId: string, projectId: string): string => {
    const baseApiUrl = import.meta.env.VITE_FASTAPI_BASE_URL || '';

    return `${baseApiUrl}${BASE_URL}/${characterId}/image?project_id=${projectId}`;
  },

  // Gallery-related methods
  // Get character gallery images
  getCharacterGallery: async (
    characterId: string,
    projectId: string,
  ): Promise<{ character_id: string; gallery_images: string[] }> => {
    const response = await fetchApi({
      url: `${BASE_URL}/${characterId}/gallery` as UrlPaths,
      method: 'get',
      params: {
        project_id: projectId,
      },
    });
    return response.data as { character_id: string; gallery_images: string[] };
  },

  // Upload image to character gallery
  uploadGalleryImage: async (characterId: string, projectId: string, file: File): Promise<CharacterDetail> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetchApi({
      url: `${BASE_URL}/${characterId}/gallery` as UrlPaths,
      method: 'post',
      params: {
        project_id: projectId,
      },
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data as CharacterDetail;
  },

  // Batch upload multiple images to character gallery
  uploadGalleryImagesBatch: async (
    characterId: string,
    projectId: string,
    files: File[],
    onProgress?: UploadProgressCallback,
  ): Promise<BatchUploadResponse> => {
    const formData = new FormData();

    // Add all files to FormData
    files.forEach((file) => {
      formData.append('files', file);
    });

    // Simulate progress if callback provided
    if (onProgress) {
      onProgress(10, 'Preparing upload...');
    }

    const response = await fetchApi({
      url: `${BASE_URL}/${characterId}/gallery/batch` as UrlPaths,
      method: 'post',
      params: {
        project_id: projectId,
      },
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress, 'Uploading files...');
        }
      },
    });

    if (onProgress) {
      onProgress(100, 'Upload completed');
    }

    return response.data as BatchUploadResponse;
  },

  // Delete image from character gallery
  deleteGalleryImage: async (characterId: string, projectId: string, imageIndex: number): Promise<void> => {
    await fetchApi({
      url: `${BASE_URL}/${characterId}/gallery/${imageIndex}` as UrlPaths,
      method: 'delete',
      params: {
        project_id: projectId,
      },
    });
  },

  // Concept Art-related methods
  // Get character concept art images
  getCharacterConceptArt: async (
    characterId: string,
    projectId: string,
  ): Promise<{ character_id: string; concept_art_images: string[] }> => {
    const response = await fetchApi({
      url: `${BASE_URL}/${characterId}/concept-art` as UrlPaths,
      method: 'get',
      params: {
        project_id: projectId,
      },
    });
    return response.data as { character_id: string; concept_art_images: string[] };
  },

  // Upload image to character concept art
  uploadConceptArtImage: async (characterId: string, projectId: string, file: File): Promise<CharacterDetail> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetchApi({
      url: `${BASE_URL}/${characterId}/concept-art` as UrlPaths,
      method: 'post',
      params: {
        project_id: projectId,
      },
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data as CharacterDetail;
  },

  // Batch upload multiple images to character concept art
  uploadConceptArtImagesBatch: async (
    characterId: string,
    projectId: string,
    files: File[],
    onProgress?: UploadProgressCallback,
  ): Promise<BatchUploadResponse> => {
    const formData = new FormData();

    // Add all files to FormData
    files.forEach((file) => {
      formData.append('files', file);
    });

    // Simulate progress if callback provided
    if (onProgress) {
      onProgress(10, 'Preparing upload...');
    }

    const response = await fetchApi({
      url: `${BASE_URL}/${characterId}/concept-art/batch` as UrlPaths,
      method: 'post',
      params: {
        project_id: projectId,
      },
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress, 'Uploading files...');
        }
      },
    });

    if (onProgress) {
      onProgress(100, 'Upload completed');
    }

    return response.data as BatchUploadResponse;
  },

  // Delete image from character concept art
  deleteConceptArtImage: async (characterId: string, projectId: string, imageIndex: number): Promise<void> => {
    await fetchApi({
      url: `${BASE_URL}/${characterId}/concept-art/${imageIndex}` as UrlPaths,
      method: 'delete',
      params: {
        project_id: projectId,
      },
    });
  },
};
