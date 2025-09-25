import { useQuery } from '@tanstack/react-query';

import { type CharacterDetail, charactersService } from '@/api/charactersService';

export interface UseCharactersProps {
  projectId: string;
  enabled?: boolean;
}

export interface UseCharactersReturn {
  characters: CharacterDetail[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Custom hook for managing character data for a specific project
 * @param projectId - The project ID to fetch characters for
 * @param enabled - Whether the query should be enabled (default: true if projectId exists)
 * @returns Character data, loading states, and refetch function
 */
export function useCharacters({ projectId, enabled = !!projectId }: UseCharactersProps): UseCharactersReturn {
  const {
    data: characters,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<CharacterDetail[]>({
    queryKey: ['characters', projectId],
    queryFn: () => charactersService.listCharacters(projectId),
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  return {
    characters,
    isLoading,
    isError,
    error,
    refetch: () => {
      void refetch();
    },
  };
}
