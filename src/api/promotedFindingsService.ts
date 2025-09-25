import type { PromotedFindingResponseSchema, PromoteFindingRequestBody } from '../types/PromotedFinding';
import { fetchApi } from './client';
import type { UrlPaths } from './helper';

// Functions will be implemented in the next step as per the plan.
// For now, just creating the file structure.

export const promotedFindingsService = {
  promoteFinding: async (data: PromoteFindingRequestBody): Promise<PromotedFindingResponseSchema> => {
    const response = await fetchApi({
      url: '/api/v1/promoted-findings/' as UrlPaths,
      method: 'post',
      data,
    });

    return response.data as PromotedFindingResponseSchema;
  },
};
