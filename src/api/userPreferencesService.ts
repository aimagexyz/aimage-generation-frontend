import type {
  LegacyLikedImageResponse,
  LikedImageRemoveRequest,
  LikedImageRequest,
  LikedImageResponse,
  UserPreferencesResponse,
} from '../types/userPreferences';
import { fetchApi } from './client';
import type { UrlPaths } from './helper';

const BASE_URL = '/api/v1/users/me/preferences';

/**
 * User Preferences API Service
 * SOLID: Single Responsibility - only handles user preferences API calls
 * DRY: Reuses existing fetchApi patterns and follows service structure
 * Updated for new backend API with source tracking
 *
 * NOTE: Temporarily using type assertions until OpenAPI schema is regenerated
 */
export const userPreferencesService = {
  /**
   * Get user's liked images with fresh S3 URLs
   * Returns array of LikedImageResponse objects with source tracking
   */
  getLikedImages: async (): Promise<LikedImageResponse[]> => {
    const response = await fetchApi({
      url: `${BASE_URL}/liked-images` as UrlPaths,
      method: 'get',
    });
    const data = response.data;
    // Ensure we always return an array
    if (!data) {
      return [];
    }
    if (Array.isArray(data)) {
      return data as LikedImageResponse[];
    }
    // If data is an object with a liked_images property, return that
    if (typeof data === 'object' && 'liked_images' in data && Array.isArray(data.liked_images)) {
      return data.liked_images as LikedImageResponse[];
    }
    console.warn('Unexpected response format from getLikedImages:', data);
    return [];
  },

  /**
   * Add image to user's liked list with source tracking
   * SOLID: Uses new request format with source information
   */
  addLikedImage: async (request: LikedImageRequest): Promise<void> => {
    await fetchApi({
      url: `${BASE_URL}/liked-images` as UrlPaths,
      method: 'post',
      data: request,
    });
  },

  /**
   * Remove image from user's liked list using source tracking
   * DRY: Follows same pattern as addLikedImage but with remove request
   */
  removeLikedImage: async (request: LikedImageRemoveRequest): Promise<void> => {
    await fetchApi({
      url: `${BASE_URL}/liked-images` as UrlPaths,
      method: 'delete',
      data: request,
    });
  },

  /**
   * Get all user preferences (liked images + settings)
   * Returns structured data with liked images and user settings
   */
  getPreferences: async (): Promise<UserPreferencesResponse> => {
    const response = await fetchApi({
      url: BASE_URL as UrlPaths,
      method: 'get',
    });
    return response.data as UserPreferencesResponse;
  },

  // Legacy methods for backward compatibility during migration
  // These will attempt to infer source information or fall back to basic operations

  /**
   * @deprecated Use addLikedImage with source tracking instead
   * Legacy method for adding images by URL only
   */
  addLikedImageLegacy: async (imageUrl: string): Promise<LegacyLikedImageResponse> => {
    console.warn('Using deprecated addLikedImageLegacy - should migrate to addLikedImage with source tracking');

    // For backward compatibility, try to infer source info or use fallback
    const request: LikedImageRequest = {
      image_path: extractS3PathFromUrl(imageUrl) || imageUrl,
      source_type: 'unknown', // Will need to be updated by calling code
      source_id: '00000000-0000-0000-0000-000000000000', // Fallback UUID
      display_name: `Image from ${new Date().toISOString()}`,
    };

    try {
      await userPreferencesService.addLikedImage(request);
      // Convert to legacy format
      return {
        message: 'Image added to liked images',
        liked_images: [], // Would need to fetch full list for legacy format
      };
    } catch (error) {
      console.error('Failed to add liked image:', error);
      throw error;
    }
  },

  /**
   * @deprecated Use removeLikedImage with source tracking instead
   * Legacy method for removing images by URL only
   */
  removeLikedImageLegacy: async (imageUrl: string): Promise<LegacyLikedImageResponse> => {
    console.warn('Using deprecated removeLikedImageLegacy - should migrate to removeLikedImage with source tracking');

    // For backward compatibility, try to find the liked image by URL
    const likedImages = await userPreferencesService.getLikedImages();
    const targetImage = likedImages.find((img) => img.image_url === imageUrl);

    if (!targetImage) {
      throw new Error('Image not found in liked images');
    }

    const request: LikedImageRemoveRequest = {
      image_path: targetImage.image_path,
      source_type: targetImage.source_type,
      source_id: targetImage.source_id,
    };

    try {
      await userPreferencesService.removeLikedImage(request);
      // Convert to legacy format
      return {
        message: 'Image removed from liked images',
        liked_images: [], // Would need to fetch full list for legacy format
      };
    } catch (error) {
      console.error('Failed to remove liked image:', error);
      throw error;
    }
  },
};

/**
 * Helper function to extract S3 path from presigned URL
 * KISS: Simple URL parsing for S3 paths
 */
function extractS3PathFromUrl(url: string): string | null {
  if (!url) {
    return null;
  }

  // Handle s3:// format
  if (url.startsWith('s3://')) {
    const parts = url.split('/', 3);
    if (parts.length > 3) {
      return parts[3];
    }
  }

  // Handle presigned URLs
  if (url.includes('amazonaws.com/')) {
    try {
      const domainEnd = url.indexOf('.amazonaws.com/') + '.amazonaws.com/'.length;
      const queryStart = url.indexOf('?', domainEnd);

      if (queryStart === -1) {
        return url.substring(domainEnd);
      } else {
        return url.substring(domainEnd, queryStart);
      }
    } catch (error) {
      console.warn('Failed to extract S3 path from URL:', url, error);
    }
  }

  return null;
}
