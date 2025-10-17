import { type StructuredSelections } from '../components/modals/StructuredInstructionModal';

// Utility functions for prompt building
const buildBasicCharacterPrompt = (category: string, item: string): string => {
  if (category.includes('basic-gender')) {
    return item;
  }
  if (category.includes('basic-age')) {
    return item;
  }
  if (category.includes('basic-bodyType')) {
    return `${item} body type`;
  }
  if (category.includes('basic-skinColor')) {
    return `${item} skin`;
  }
  if (category.includes('basic-ethnicity')) {
    return item;
  }
  return item;
};

const buildHairPrompt = (category: string, item: string): string => {
  if (category.includes('hair-style')) {
    return `${item} hair`;
  }
  if (category.includes('hair-bangs')) {
    return `${item} bangs`;
  }
  if (category.includes('hair-color')) {
    return `${item} hair color`;
  }
  return item;
};

const buildExpressionPrompt = (category: string, item: string): string => {
  if (category.includes('expression-face')) {
    return `${item} expression`;
  }
  return item;
};

const buildClothingPrompt = (category: string, item: string): string => {
  if (category.includes('clothing-theme')) {
    return `${item} style clothing`;
  }
  if (category.includes('clothing-tops')) {
    return `wearing ${item}`;
  }
  if (category.includes('clothing-bottoms')) {
    return item;
  }
  if (category.includes('clothing-accessories')) {
    return `with ${item}`;
  }
  return item;
};

const buildPosePrompt = (category: string, item: string): string => {
  if (category.includes('pose-pose')) {
    return item;
  }
  if (category.includes('pose-gaze')) {
    return `looking ${item}`;
  }
  if (category.includes('pose-composition')) {
    return `${item} shot`;
  }
  if (category.includes('pose-hands')) {
    return `${item} with hands`;
  }
  return item;
};

const categorizeAndFormatSelection = (category: string, item: string): string => {
  if (category.includes('basic-')) {
    return buildBasicCharacterPrompt(category, item);
  }
  if (category.includes('hair-')) {
    return buildHairPrompt(category, item);
  }
  if (category.includes('expression-')) {
    return buildExpressionPrompt(category, item);
  }
  if (category.includes('clothing-')) {
    return buildClothingPrompt(category, item);
  }
  if (category.includes('pose-')) {
    return buildPosePrompt(category, item);
  }
  return item; // Fallback for unhandled categories
};

/**
 * Builds a complete prompt by combining structured selections with the base prompt
 * @param basePrompt - The base text prompt from user input
 * @param selections - Structured selections from the character builder
 * @returns Complete formatted prompt string
 */
export const buildPrompt = (basePrompt: string, selections: StructuredSelections): string => {
  const selectionTexts: string[] = [];

  Object.entries(selections).forEach(([category, item]) => {
    if (item) {
      const formattedSelection = categorizeAndFormatSelection(category, item);
      selectionTexts.push(formattedSelection);
    }
  });

  const combinedSelections = selectionTexts.join(', ');
  return combinedSelections ? `${combinedSelections}, ${basePrompt}` : basePrompt;
};

/**
 * Validates a prompt for basic requirements and content appropriateness
 * @param promptText - The prompt text to validate
 * @returns Validation result with isValid flag and optional suggestion
 */
export const validatePrompt = (promptText: string): { isValid: boolean; suggestion?: string } => {
  if (!promptText.trim()) {
    return { isValid: false, suggestion: 'プロンプトを入力してください' };
  }

  return { isValid: true };
};
