import { useState } from 'react';

import type { CharacterDetail } from '@/api/charactersService';
import { useToast } from '@/components/ui/use-toast';
import { aiPredictionService } from '@/services/aiPredictionService';

interface UseCharacterPredictionProps {
  subtaskId: string;
  availableCharacters: CharacterDetail[];
  onCharacterSelect: (character: CharacterDetail | null) => void;
  onMultiplePredictions?: (characters: CharacterDetail[]) => void;
}

export function useCharacterPrediction({
  subtaskId,
  availableCharacters,
  onCharacterSelect,
  onMultiplePredictions,
}: UseCharacterPredictionProps) {
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictedCharacters, setPredictedCharacters] = useState<CharacterDetail[]>([]);
  const { toast } = useToast();

  const predictCharacter = async (): Promise<void> => {
    if (!availableCharacters || availableCharacters.length === 0) {
      toast({
        title: 'キャラクター予測エラー',
        description: 'プロジェクトにキャラクターが登録されていません。',
        variant: 'destructive',
      });
      return;
    }

    setIsPredicting(true);

    try {
      // Try multiple character prediction first
      const predictedChars = await aiPredictionService.predictMultipleCharactersForSubtask(
        subtaskId,
        availableCharacters,
      );

      if (predictedChars && predictedChars.length > 0) {
        setPredictedCharacters(predictedChars);
        if (onMultiplePredictions) {
          onMultiplePredictions(predictedChars);
        }

        // Auto-select the first character if only one is predicted
        if (predictedChars.length === 1) {
          onCharacterSelect(predictedChars[0]);
        }

        toast({
          title: 'キャラクター予測完了',
          description: `AIが${predictedChars.length}人のキャラクターを予測しました。`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'キャラクター予測失敗',
          description: 'AIがキャラクターを予測できませんでした。',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Character prediction error:', error);
      toast({
        title: 'キャラクター予測エラー',
        description: 'AIキャラクター予測中にエラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setIsPredicting(false);
    }
  };

  return {
    isPredicting,
    predictCharacter,
    predictedCharacters,
  };
}
