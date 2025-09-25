import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { rpdCharacterAssociationsService } from '@/api/rpdCharacterAssociationsService';
import { toast } from '@/components/ui/use-toast';

const RPD_CHARACTER_ASSOCIATIONS_QUERY_KEY = 'rpdCharacterAssociations';

// Hook for getting RPDs associated with a Character
export function useCharacterRPDAssociations(characterId: string | null | undefined) {
  return useQuery({
    queryKey: [RPD_CHARACTER_ASSOCIATIONS_QUERY_KEY, 'characterRPDs', characterId],
    queryFn: () => {
      if (!characterId) {
        throw new Error('Character ID is required');
      }
      return rpdCharacterAssociationsService.getCharacterRPDs(characterId);
    },
    enabled: !!characterId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for getting Characters associated with an RPD
export function useRPDCharacterAssociations(rpdId: string | null | undefined) {
  return useQuery({
    queryKey: [RPD_CHARACTER_ASSOCIATIONS_QUERY_KEY, 'rpdCharacters', rpdId],
    queryFn: () => {
      if (!rpdId) {
        throw new Error('RPD ID is required');
      }
      return rpdCharacterAssociationsService.getRPDCharacters(rpdId);
    },
    enabled: !!rpdId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for creating an RPD-Character association
export function useCreateRPDCharacterAssociation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ characterId, rpdId }: { characterId: string; rpdId: string }) =>
      rpdCharacterAssociationsService.addRPDToCharacter(characterId, rpdId),
    onSuccess: (_, { characterId, rpdId }) => {
      // Invalidate relevant queries
      void queryClient.invalidateQueries({
        queryKey: [RPD_CHARACTER_ASSOCIATIONS_QUERY_KEY, 'characterRPDs', characterId],
      });
      void queryClient.invalidateQueries({
        queryKey: [RPD_CHARACTER_ASSOCIATIONS_QUERY_KEY, 'rpdCharacters', rpdId],
      });

      toast({
        title: '関連付け成功',
        description: 'RPDとキャラクターの関連付けが作成されました。',
      });
    },
    onError: (error) => {
      toast({
        title: '関連付け失敗',
        description: `関連付けの作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        variant: 'destructive',
      });
    },
  });
}

// Hook for deleting an RPD-Character association
export function useDeleteRPDCharacterAssociation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ characterId, rpdId }: { characterId: string; rpdId: string }) =>
      rpdCharacterAssociationsService.removeRPDFromCharacter(characterId, rpdId),
    onSuccess: (_, { characterId, rpdId }) => {
      // Invalidate relevant queries
      void queryClient.invalidateQueries({
        queryKey: [RPD_CHARACTER_ASSOCIATIONS_QUERY_KEY, 'characterRPDs', characterId],
      });
      void queryClient.invalidateQueries({
        queryKey: [RPD_CHARACTER_ASSOCIATIONS_QUERY_KEY, 'rpdCharacters', rpdId],
      });

      toast({
        title: '削除成功',
        description: 'RPDとキャラクターの関連付けが削除されました。',
      });
    },
    onError: (error) => {
      toast({
        title: '削除失敗',
        description: `関連付けの削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        variant: 'destructive',
      });
    },
  });
}

// Alternative hooks using RPD as the primary entity
export function useAddCharacterToRPD() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rpdId, characterId }: { rpdId: string; characterId: string }) =>
      rpdCharacterAssociationsService.addCharacterToRPD(rpdId, characterId),
    onSuccess: (_, { rpdId, characterId }) => {
      // Invalidate relevant queries
      void queryClient.invalidateQueries({
        queryKey: [RPD_CHARACTER_ASSOCIATIONS_QUERY_KEY, 'rpdCharacters', rpdId],
      });
      void queryClient.invalidateQueries({
        queryKey: [RPD_CHARACTER_ASSOCIATIONS_QUERY_KEY, 'characterRPDs', characterId],
      });

      toast({
        title: '関連付け成功',
        description: 'キャラクターとRPDの関連付けが作成されました。',
      });
    },
    onError: (error) => {
      toast({
        title: '関連付け失敗',
        description: `関連付けの作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveCharacterFromRPD() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rpdId, characterId }: { rpdId: string; characterId: string }) =>
      rpdCharacterAssociationsService.removeCharacterFromRPD(rpdId, characterId),
    onSuccess: (_, { rpdId, characterId }) => {
      // Invalidate relevant queries
      void queryClient.invalidateQueries({
        queryKey: [RPD_CHARACTER_ASSOCIATIONS_QUERY_KEY, 'rpdCharacters', rpdId],
      });
      void queryClient.invalidateQueries({
        queryKey: [RPD_CHARACTER_ASSOCIATIONS_QUERY_KEY, 'characterRPDs', characterId],
      });

      toast({
        title: '削除成功',
        description: 'キャラクターとRPDの関連付けが削除されました。',
      });
    },
    onError: (error) => {
      toast({
        title: '削除失敗',
        description: `関連付けの削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        variant: 'destructive',
      });
    },
  });
}
