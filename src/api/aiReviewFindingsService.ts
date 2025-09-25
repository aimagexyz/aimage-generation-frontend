import type { AiReviewSchema } from '../types/aiReview'; // Corrected case
import type { AiReviewFindingHumanOverrideCreate, FindingStatusUpdate } from '../types/AiReviewFinding';
import { fetchApi } from './client';
import type { UrlPaths } from './helper';

const BASE_URL = '/api/v1/ai-review-findings'; // Adjusted BASE_URL

export const aiReviewFindingsService = {
  updateFindingStatus: async (findingId: string, data: FindingStatusUpdate): Promise<AiReviewSchema> => {
    const response = await fetchApi({
      url: `${BASE_URL}/${findingId}/status` as UrlPaths,
      method: 'patch',
      data: data as unknown as { is_fixed: boolean },
    });
    return response.data as AiReviewSchema;
  },

  overrideAiFinding: async (
    originalAiFindingId: string,
    data: AiReviewFindingHumanOverrideCreate,
  ): Promise<AiReviewSchema> => {
    const response = await fetchApi({
      url: `${BASE_URL}/${originalAiFindingId}/override` as UrlPaths,
      method: 'post',
      data, // data is AiReviewFindingHumanOverrideCreate
    });
    return response.data as AiReviewSchema;
  },
};
