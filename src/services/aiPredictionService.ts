import type { CharacterDetail } from '@/api/charactersService';
import { fetchApi } from '@/api/client';
import type { UrlPaths } from '@/api/helper';

interface CharacterPredictionResponse {
  character_id: string;
  character_name: string;
  confidence: number;
  prediction_method: string;
  predicted: boolean;
}

interface CharacterPredictionResponseList {
  characters: CharacterPredictionResponse[];
}

/**
 * AI character prediction service that calls the backend API
 */
export const aiPredictionService = {
  /**
   * Initiate character prediction for a subtask (background task)
   * @param subtaskId - The subtask ID to predict character for
   * @returns Promise that resolves when task is successfully initiated
   */
  initiateCharacterPrediction: async (subtaskId: string): Promise<boolean> => {
    try {
      // Call the backend API endpoint to initiate prediction
      const response = await fetchApi({
        url: `/api/v1/ai-reviews/subtasks/${subtaskId}/predict-character` as UrlPaths,
        method: 'post',
      });

      // 新的API返回任务提交确认
      console.log('Character prediction task initiated:', response.data);
      return true;
    } catch (error) {
      console.error('Character prediction API error:', error);
      return false;
    }
  },

  /**
   * Get predicted character from subtask data (after prediction completes)
   * @param subtask - The subtask data containing character_ids
   * @param availableCharacters - List of available characters to find the predicted one
   * @returns The predicted character or null
   */
  getCharacterFromSubtask: (
    subtask: { character_ids?: string[] },
    availableCharacters: CharacterDetail[],
  ): CharacterDetail | null => {
    if (!subtask?.character_ids || !Array.isArray(subtask.character_ids)) {
      return null;
    }

    // Skip special status values
    const statusValues = ['PROCESSING', 'FAILED'];
    const validCharacterIds = subtask.character_ids.filter(
      (id: string) => !statusValues.includes(id) && id !== '00000000-0000-0000-0000-000000000000',
    );

    if (validCharacterIds.length === 0) {
      return null;
    }

    // Return the first valid predicted character
    const characterId = validCharacterIds[0];
    return availableCharacters.find((char) => char.id === characterId) || null;
  },

  /**
   * Call backend API to predict multiple characters for a subtask
   * @param subtaskId - The subtask ID to predict characters for
   * @param availableCharacters - List of available characters to find the predicted ones
   * @returns Promise that resolves to an array of predicted characters
   */
  predictMultipleCharactersForSubtask: async (
    subtaskId: string,
    availableCharacters: CharacterDetail[],
  ): Promise<CharacterDetail[]> => {
    const CHARACTER_PREDICTION_PLACEHOLDER = 'Character_Prediction_Placeholder';
    // const PLACEHOLDER_CHARACTER_ID = '00000000-0000-0000-0000-000000000000';
    try {
      // Call the backend API endpoint
      const response = await fetchApi({
        url: `/api/v1/ai-reviews/subtasks/${subtaskId}/predict-character` as UrlPaths,
        method: 'post',
      });

      const prediction = response.data as CharacterPredictionResponseList;
      console.log('multiple prediction', prediction);

      if (
        prediction.characters.length === 1 &&
        prediction.characters[0].character_name === CHARACTER_PREDICTION_PLACEHOLDER
      ) {
        return [];
      }

      // Check if we have predicted characters in the list
      if (prediction.characters && prediction.characters.length > 0) {
        const predictedCharacters = prediction.characters
          .filter((pred) => pred.predicted && pred.character_id)
          .map((pred) => availableCharacters.find((char) => char.id === pred.character_id))
          .filter((char): char is CharacterDetail => char !== undefined);
        return predictedCharacters;
      }

      return [];
    } catch (error) {
      console.error('Multiple character prediction API error:', error);
      return [];
    }
  },
};
