import type {
  ReviewSetCharacterAssociationCreate,
  ReviewSetCharacterAssociationOut,
  ReviewSetCharacterAssociationWithDetails,
} from '@/types/ReviewSetCharacterAssociation';

import { fetchApi } from './client';
import type { UrlPaths } from './helper';

const BASE_URL = '/api/v1/review-set-character-associations';

export const reviewSetCharacterAssociationsService = {
  /**
   * 创建 ReviewSet 和 Character 的关联
   */
  createAssociation: async (data: ReviewSetCharacterAssociationCreate): Promise<ReviewSetCharacterAssociationOut> => {
    const response = await fetchApi({
      url: `${BASE_URL}/` as UrlPaths,
      method: 'POST',
      data,
    });
    return response.data as ReviewSetCharacterAssociationOut;
  },

  /**
   * 获取特定的 ReviewSet 和 Character 关联详情
   */
  getAssociation: async (
    reviewSetId: string,
    characterId: string,
  ): Promise<ReviewSetCharacterAssociationWithDetails> => {
    const response = await fetchApi({
      url: `${BASE_URL}/review_set/${reviewSetId}/character/${characterId}` as UrlPaths,
      method: 'GET',
    });
    return response.data as ReviewSetCharacterAssociationWithDetails;
  },

  /**
   * 获取特定 ReviewSet 的所有 Character 关联
   */
  getAssociationsByReviewSet: async (reviewSetId: string): Promise<ReviewSetCharacterAssociationWithDetails[]> => {
    const response = await fetchApi({
      url: `${BASE_URL}/review_set/${reviewSetId}` as UrlPaths,
      method: 'GET',
    });
    return response.data as ReviewSetCharacterAssociationWithDetails[];
  },

  /**
   * 获取特定 Character 的所有 ReviewSet 关联
   */
  getAssociationsByCharacter: async (characterId: string): Promise<ReviewSetCharacterAssociationWithDetails[]> => {
    const response = await fetchApi({
      url: `${BASE_URL}/character/${characterId}` as UrlPaths,
      method: 'GET',
    });
    return response.data as ReviewSetCharacterAssociationWithDetails[];
  },

  /**
   * 删除 ReviewSet 和 Character 的关联
   */
  deleteAssociation: async (reviewSetId: string, characterId: string): Promise<void> => {
    await fetchApi({
      url: `${BASE_URL}/review_set/${reviewSetId}/character/${characterId}` as UrlPaths,
      method: 'DELETE',
    });
  },
};
