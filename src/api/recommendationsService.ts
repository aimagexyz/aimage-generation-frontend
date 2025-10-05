import { fetchApi } from './client';
import type { UrlPaths } from './helper';

// Type definitions for review set recommendations
export interface ReviewSetRecommendation {
  review_set_id: string;
  review_set_name: string;
  score: number;
  tag_matches: string[];
  character_matches: string[];
  tag_score: number;
  character_score: number;
}

export interface TaskReviewSetRecommendationsResponse {
  task_id: string;
  task_name: string;
  recommendations: ReviewSetRecommendation[];
  total_recommendations: number;
}

const BASE_URL = '/api/v1/ai-reviews';

export const recommendationsService = {
  getTaskReviewSetRecommendations: async (
    taskId: string,
    projectId: string,
    minScore: number = 0.0,
  ): Promise<TaskReviewSetRecommendationsResponse> => {
    const response = await fetchApi({
      url: `${BASE_URL}/tasks/${taskId}/review-set-recommendations?project_id=${projectId}&min_score=${minScore}` as UrlPaths,
      method: 'get',
    });
    return response.data as TaskReviewSetRecommendationsResponse;
  },
};
