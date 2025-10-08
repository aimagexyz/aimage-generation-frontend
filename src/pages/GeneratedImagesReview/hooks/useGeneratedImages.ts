import { useQuery } from '@tanstack/react-query';

import {
  type GeneratedReferenceResponse,
  referenceGenerationService,
} from '@/api/referenceGenerationService';

export type { GeneratedReferenceResponse };

export function useGeneratedImages(projectId: string) {
  return useQuery({
    queryKey: ['generated-images', projectId],
    queryFn: async () => {
      return referenceGenerationService.listReferences(projectId);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

