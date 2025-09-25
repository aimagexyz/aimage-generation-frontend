import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { reviewSetCharacterAssociationsService } from '@/api/reviewSetCharacterAssociationsService';
import { toast } from '@/components/ui/use-toast';
import type {
  ReviewSetCharacterAssociationCreate,
  ReviewSetCharacterAssociationWithDetails,
} from '@/types/ReviewSetCharacterAssociation';

// Query keys
export const reviewSetCharacterAssociationKeys = {
  all: ['reviewSetCharacterAssociations'] as const,
  byCharacter: (characterId: string) => [...reviewSetCharacterAssociationKeys.all, 'byCharacter', characterId] as const,
  byReviewSet: (reviewSetId: string) => [...reviewSetCharacterAssociationKeys.all, 'byReviewSet', reviewSetId] as const,
  specific: (reviewSetId: string, characterId: string) =>
    [...reviewSetCharacterAssociationKeys.all, 'specific', reviewSetId, characterId] as const,
};

/**
 * Hook to get ReviewSet associations for a specific character
 */
export function useCharacterReviewSetAssociations(characterId: string) {
  return useQuery<ReviewSetCharacterAssociationWithDetails[]>({
    queryKey: reviewSetCharacterAssociationKeys.byCharacter(characterId),
    queryFn: () => reviewSetCharacterAssociationsService.getAssociationsByCharacter(characterId),
    enabled: !!characterId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get Character associations for a specific ReviewSet
 */
export function useReviewSetCharacterAssociations(reviewSetId: string) {
  return useQuery<ReviewSetCharacterAssociationWithDetails[]>({
    queryKey: reviewSetCharacterAssociationKeys.byReviewSet(reviewSetId),
    queryFn: () => reviewSetCharacterAssociationsService.getAssociationsByReviewSet(reviewSetId),
    enabled: !!reviewSetId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get a specific ReviewSet-Character association
 */
export function useSpecificReviewSetCharacterAssociation(reviewSetId: string, characterId: string) {
  return useQuery<ReviewSetCharacterAssociationWithDetails>({
    queryKey: reviewSetCharacterAssociationKeys.specific(reviewSetId, characterId),
    queryFn: () => reviewSetCharacterAssociationsService.getAssociation(reviewSetId, characterId),
    enabled: !!reviewSetId && !!characterId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a ReviewSet-Character association
 */
export function useCreateReviewSetCharacterAssociation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReviewSetCharacterAssociationCreate) =>
      reviewSetCharacterAssociationsService.createAssociation(data),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      void queryClient.invalidateQueries({
        queryKey: reviewSetCharacterAssociationKeys.byCharacter(variables.character_id),
      });
      void queryClient.invalidateQueries({
        queryKey: reviewSetCharacterAssociationKeys.byReviewSet(variables.review_set_id),
      });
      void queryClient.invalidateQueries({
        queryKey: reviewSetCharacterAssociationKeys.all,
      });

      toast({
        title: '関連付け作成成功',
        description: 'レビューセットとキャラクターの関連付けが作成されました。',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Failed to create association:', error);
      toast({
        title: '関連付け作成失敗',
        description: 'レビューセットとキャラクターの関連付けの作成に失敗しました。',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a ReviewSet-Character association
 */
export function useDeleteReviewSetCharacterAssociation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewSetId, characterId }: { reviewSetId: string; characterId: string }) =>
      reviewSetCharacterAssociationsService.deleteAssociation(reviewSetId, characterId),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      void queryClient.invalidateQueries({
        queryKey: reviewSetCharacterAssociationKeys.byCharacter(variables.characterId),
      });
      void queryClient.invalidateQueries({
        queryKey: reviewSetCharacterAssociationKeys.byReviewSet(variables.reviewSetId),
      });
      void queryClient.invalidateQueries({
        queryKey: reviewSetCharacterAssociationKeys.all,
      });

      toast({
        title: '関連付け削除成功',
        description: 'レビューセットとキャラクターの関連付けが削除されました。',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Failed to delete association:', error);
      toast({
        title: '関連付け削除失敗',
        description: 'レビューセットとキャラクターの関連付けの削除に失敗しました。',
        variant: 'destructive',
      });
    },
  });
}
