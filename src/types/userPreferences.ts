/**
 * User Preferences Types
 * Updated to match new backend API with source tracking
 * Following existing type patterns from the codebase
 */

export interface LikedImageRequest {
  image_path: string;
  source_type: string;
  source_id: string;
  display_name?: string;
  base_prompt?: string; // Added to improve UX with meaningful prompt text
  tags?: string[];
}

export interface LikedImageRemoveRequest {
  image_path: string;
  source_type: string;
  source_id: string;
}

export interface LikedImageResponse {
  id: string;
  image_path: string;
  image_url: string; // Fresh presigned URL
  source_type: string;
  source_id: string;
  display_name?: string;
  tags: string[];
  created_at: string;
}

export interface UserPreferencesResponse {
  liked_images: LikedImageResponse[];
  settings: Record<string, unknown>;
}

// Legacy types for backward compatibility during migration
export interface LegacyLikedImageRequest {
  image_url: string;
}

export interface LegacyLikedImageResponse {
  message: string;
  liked_images: string[];
}

/**
 * Source information for tracking where an image comes from
 */
export interface ImageSourceInfo {
  source_type: string;
  source_id: string;
  image_path: string;
  display_name?: string;
  base_prompt?: string; // Added to improve UX with meaningful prompt text
}

/**
 * Hook return types following existing patterns
 * Updated to work with new data structure
 */
export interface UseLikedImagesResult {
  likedImages: LikedImageResponse[];
  likedImageUrls: Set<string>; // For backward compatibility - URLs only
  isLoading: boolean;
  error: Error | null;
  toggleLike: (imageUrl: string, sourceInfo?: ImageSourceInfo) => void;
  isLiked: (imageUrl: string) => boolean;
  isToggling: boolean;
  // New methods for source-aware operations
  addLikedImage: (request: LikedImageRequest) => void;
  removeLikedImage: (request: LikedImageRemoveRequest) => void;
}
