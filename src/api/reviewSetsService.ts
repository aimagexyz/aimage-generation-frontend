import { fetchApi } from './client';
import type { UrlPaths } from './helper';
import type { components } from './schemas';

// Use the generated types from OpenAPI schema
export type ReviewSetOut = components['schemas']['ReviewSetOut'];
export type ReviewSetCreate = components['schemas']['ReviewSetCreate'];
export type ReviewSetUpdate = components['schemas']['ReviewSetUpdate'];
export type RPDForReviewSet = components['schemas']['RPDForReviewSet'];
export type CharacterForReviewSet = components['schemas']['CharacterForReviewSet'];

const BASE_URL = '/api/v1/review-sets'; // Adjusted BASE_URL to match backend

export const reviewSetsService = {
  /**
   * List all review sets for a given project
   * SOLID: Single Responsibility - only handles ReviewSet API calls
   * DRY: Reuses existing fetchApi patterns
   */
  listReviewSets: async (projectId: string): Promise<ReviewSetOut[]> => {
    const response = await fetchApi({
      url: `${BASE_URL}/` as UrlPaths, // Ensure trailing slash as per schema
      method: 'get',
      params: { project_id: projectId },
    });
    return response.data as ReviewSetOut[];
  },

  /**
   * Get a single review set by ID, including its related entities
   */
  getReviewSet: async (reviewSetId: string): Promise<ReviewSetOut> => {
    const response = await fetchApi({
      url: `${BASE_URL}/${reviewSetId}` as UrlPaths,
      method: 'get',
    });
    return response.data as ReviewSetOut;
  },

  /**
   * Create a new review set
   */
  createReviewSet: async (data: ReviewSetCreate): Promise<ReviewSetOut> => {
    const response = await fetchApi({
      url: `${BASE_URL}/` as UrlPaths, // Ensure trailing slash
      method: 'post',
      data,
    });
    return response.data as ReviewSetOut;
  },

  /**
   * Update an existing review set
   */
  updateReviewSet: async (reviewSetId: string, data: ReviewSetUpdate): Promise<ReviewSetOut> => {
    const response = await fetchApi({
      url: `${BASE_URL}/${reviewSetId}` as UrlPaths,
      method: 'put',
      data,
    });
    return response.data as ReviewSetOut;
  },

  /**
   * Delete a review set
   */
  deleteReviewSet: async (reviewSetId: string): Promise<void> => {
    await fetchApi({
      url: `${BASE_URL}/${reviewSetId}` as UrlPaths,
      method: 'delete',
    });
    // 204 No Content response, no return data
  },
};
