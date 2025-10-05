import { fetchApi } from './client';
import type { UrlPaths } from './helper';

// Simplified types for direct many-to-many relationship
export interface CharacterRPD {
  id: string;
  key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RPDCharacter {
  id: string;
  name: string;
  alias?: string;
  description?: string;
}

export interface CharacterRPDsResponse {
  character_id: string;
  rpds: CharacterRPD[];
}

export interface RPDCharactersResponse {
  rpd_id: string;
  characters: RPDCharacter[];
}

export interface SimpleApiResponse {
  message: string;
}

export const rpdCharacterAssociationsService = {
  // Add RPD to Character
  addRPDToCharacter: async (characterId: string, rpdId: string): Promise<SimpleApiResponse> => {
    const response = await fetchApi({
      url: `/api/v1/characters/${characterId}/rpds/${rpdId}` as UrlPaths,
      method: 'post',
    });
    return response.data as SimpleApiResponse;
  },

  // Remove RPD from Character
  removeRPDFromCharacter: async (characterId: string, rpdId: string): Promise<SimpleApiResponse> => {
    const response = await fetchApi({
      url: `/api/v1/characters/${characterId}/rpds/${rpdId}` as UrlPaths,
      method: 'delete',
    });
    return response.data as SimpleApiResponse;
  },

  // Get all RPDs associated with a Character
  getCharacterRPDs: async (characterId: string): Promise<CharacterRPDsResponse> => {
    const response = await fetchApi({
      url: `/api/v1/characters/${characterId}/rpds` as UrlPaths,
      method: 'get',
    });
    return response.data as CharacterRPDsResponse;
  },

  // Add Character to RPD (alternative endpoint)
  addCharacterToRPD: async (rpdId: string, characterId: string): Promise<SimpleApiResponse> => {
    const response = await fetchApi({
      url: `/api/v1/review-point-definitions/${rpdId}/characters/${characterId}` as UrlPaths,
      method: 'post',
    });
    return response.data as SimpleApiResponse;
  },

  // Remove Character from RPD (alternative endpoint)
  removeCharacterFromRPD: async (rpdId: string, characterId: string): Promise<SimpleApiResponse> => {
    const response = await fetchApi({
      url: `/api/v1/review-point-definitions/${rpdId}/characters/${characterId}` as UrlPaths,
      method: 'delete',
    });
    return response.data as SimpleApiResponse;
  },

  // Get all Characters associated with an RPD (alternative endpoint)
  getRPDCharacters: async (rpdId: string): Promise<RPDCharactersResponse> => {
    const response = await fetchApi({
      url: `/api/v1/review-point-definitions/${rpdId}/characters` as UrlPaths,
      method: 'get',
    });
    return response.data as RPDCharactersResponse;
  },
};

// Legacy compatibility - keeping the old interface name but with new implementation
export const createRPDCharacterAssociation = rpdCharacterAssociationsService.addRPDToCharacter;
export const deleteRPDCharacterAssociation = rpdCharacterAssociationsService.removeRPDFromCharacter;
export const getCharacterRPDAssociations = rpdCharacterAssociationsService.getCharacterRPDs;
