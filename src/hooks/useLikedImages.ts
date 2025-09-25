import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { userPreferencesService } from '../api/userPreferencesService';
import type {
  ImageSourceInfo,
  LikedImageRemoveRequest,
  LikedImageRequest,
  LikedImageResponse,
  UseLikedImagesResult,
} from '../types/userPreferences';

// Query Keys - Following existing patterns
const LIKED_IMAGES_QUERY_KEY = 'liked-images';

/**
 * Query key factory for liked images - following existing patterns
 * SOLID: Single responsibility for managing query keys
 */
export const likedImagesQueryKeys = {
  all: () => [LIKED_IMAGES_QUERY_KEY] as const,
  list: () => [...likedImagesQueryKeys.all(), 'list'] as const,
};

/**
 * Hook for managing user's liked images
 * KISS: Simple interface, complex logic hidden
 * DRY: Follows existing hook patterns (useReviewSets, useCharacters)
 * SOLID: Single responsibility for liked images management
 * Updated to work with new backend API using source tracking
 */
export function useLikedImages(): UseLikedImagesResult {
  const queryClient = useQueryClient();

  // Query for fetching liked images with new API format
  const {
    data: likedImages = [],
    isLoading,
    error,
  } = useQuery<LikedImageResponse[]>({
    queryKey: likedImagesQueryKeys.list(),
    queryFn: () => userPreferencesService.getLikedImages(),
    staleTime: 1000 * 60 * 5, // 5 minutes - Following existing patterns
    gcTime: 1000 * 60 * 30, // 30 minutes - Following existing patterns
  });

  // Create URL-only Set for backward compatibility - KISS optimization for O(1) lookup
  const likedImageUrls = new Set(likedImages.map((img) => img.image_url));

  // Mutation for adding liked images with source tracking
  const addLikedImageMutation = useMutation({
    mutationFn: async (request: LikedImageRequest) => {
      return userPreferencesService.addLikedImage(request);
    },

    // Optimistic updates following existing patterns
    onMutate: async (request: LikedImageRequest) => {
      await queryClient.cancelQueries({ queryKey: likedImagesQueryKeys.list() });

      const previousLikedImages = queryClient.getQueryData<LikedImageResponse[]>(likedImagesQueryKeys.list());

      // Create optimistic liked image entry
      const optimisticEntry: LikedImageResponse = {
        id: `temp-${Date.now()}`, // Temporary ID
        image_path: request.image_path,
        image_url: '', // Will be filled by server
        source_type: request.source_type,
        source_id: request.source_id,
        display_name: request.base_prompt || request.display_name || '', // Use base_prompt for better UX
        tags: request.tags || [],
        created_at: new Date().toISOString(),
      };

      const newLikedImages = [optimisticEntry, ...(previousLikedImages || [])];
      queryClient.setQueryData(likedImagesQueryKeys.list(), newLikedImages);

      return { previousLikedImages };
    },

    onError: (_err, _request, context) => {
      if (context?.previousLikedImages) {
        queryClient.setQueryData(likedImagesQueryKeys.list(), context.previousLikedImages);
      }

      toast.error('操作失败', {
        description: 'お気に入りの追加に失敗しました。もう一度お試しください。',
      });
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: likedImagesQueryKeys.list() });
    },

    onSuccess: () => {
      toast.success('お気に入りに追加しました', {
        description: '画像をお気に入りに追加しました',
      });
    },
  });

  // Mutation for removing liked images with source tracking
  const removeLikedImageMutation = useMutation({
    mutationFn: async (request: LikedImageRemoveRequest) => {
      return userPreferencesService.removeLikedImage(request);
    },

    onMutate: async (request: LikedImageRemoveRequest) => {
      await queryClient.cancelQueries({ queryKey: likedImagesQueryKeys.list() });

      const previousLikedImages = queryClient.getQueryData<LikedImageResponse[]>(likedImagesQueryKeys.list());

      // Remove matching image optimistically
      const newLikedImages = (previousLikedImages || []).filter(
        (img) =>
          !(
            img.image_path === request.image_path &&
            img.source_type === request.source_type &&
            img.source_id === request.source_id
          ),
      );

      queryClient.setQueryData(likedImagesQueryKeys.list(), newLikedImages);

      return { previousLikedImages };
    },

    onError: (_err, _request, context) => {
      if (context?.previousLikedImages) {
        queryClient.setQueryData(likedImagesQueryKeys.list(), context.previousLikedImages);
      }

      toast.error('操作失败', {
        description: 'お気に入りの削除に失敗しました。もう一度お試しください。',
      });
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: likedImagesQueryKeys.list() });
    },

    onSuccess: () => {
      toast.success('お気に入りから削除しました', {
        description: '画像をお気に入りから削除しました',
      });
    },
  });

  // Legacy toggle function with automatic source detection
  const toggleLike = (imageUrl: string, sourceInfo?: ImageSourceInfo): void => {
    const isCurrentlyLiked = likedImageUrls.has(imageUrl);

    if (isCurrentlyLiked) {
      // Find the liked image to remove
      const targetImage = likedImages.find((img) => img.image_url === imageUrl);
      if (targetImage) {
        const removeRequest: LikedImageRemoveRequest = {
          image_path: targetImage.image_path,
          source_type: targetImage.source_type,
          source_id: targetImage.source_id,
        };
        removeLikedImageMutation.mutate(removeRequest);
      } else {
        // Fallback to legacy method if source info not found
        console.warn('Could not find source info for image, using legacy removal method');
        userPreferencesService.removeLikedImageLegacy(imageUrl).catch(console.error);
      }
    } else {
      // Add image
      if (sourceInfo) {
        const addRequest: LikedImageRequest = {
          image_path: sourceInfo.image_path,
          source_type: sourceInfo.source_type,
          source_id: sourceInfo.source_id,
          display_name: sourceInfo.base_prompt || sourceInfo.display_name, // Use base_prompt for better UX
          base_prompt: sourceInfo.base_prompt, // Store base_prompt for future reference
        };
        addLikedImageMutation.mutate(addRequest);
      } else {
        // Fallback to legacy method
        console.warn('No source info provided, using legacy add method');
        userPreferencesService.addLikedImageLegacy(imageUrl).catch(console.error);
      }
    }
  };

  // Helper function to check if image is liked - KISS interface (backward compatible)
  const isLiked = (imageUrl: string): boolean => {
    return likedImageUrls.has(imageUrl);
  };

  // New source-aware methods
  const addLikedImage = (request: LikedImageRequest): void => {
    addLikedImageMutation.mutate(request);
  };

  const removeLikedImage = (request: LikedImageRemoveRequest): void => {
    removeLikedImageMutation.mutate(request);
  };

  return {
    likedImages, // New format: LikedImageResponse[]
    likedImageUrls, // Backward compatibility: Set<string>
    isLoading,
    error,
    toggleLike, // Enhanced with optional source info
    isLiked, // Backward compatible
    isToggling: addLikedImageMutation.isPending || removeLikedImageMutation.isPending,
    // New methods for source-aware operations
    addLikedImage,
    removeLikedImage,
  };
}
