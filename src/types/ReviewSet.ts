// KISS: Simple, focused type definitions
// SOLID: Single responsibility for ReviewSet type definitions
// DRY: Re-export existing generated types, add only what's needed

import type { CharacterDetail } from '@/api/charactersService';
import type { components } from '@/api/schemas';

// Re-export core types from generated schemas
export type ReviewSetOut = components['schemas']['ReviewSetOut'];
export type ReviewSetCreate = components['schemas']['ReviewSetCreate'];
export type ReviewSetUpdate = components['schemas']['ReviewSetUpdate'];
export type RPDForReviewSet = components['schemas']['RPDForReviewSet'];
export type CharacterForReviewSet = components['schemas']['CharacterForReviewSet'];

// Additional helper types for UI components

/**
 * Selection state for ReviewSet and RPD combination
 * Used in ReReviewModal and ReviewSetSelector
 */
export interface ReviewSelection {
  rpdIds: string[];
  reviewSetIds: string[];
  mode?: 'quality' | 'speed'; // Add mode selection for re-review
}

/**
 * Simplified ReviewSet for display in selection components
 * Includes computed properties for easier UI rendering
 */
export interface ReviewSetDisplay extends ReviewSetOut {
  /**
   * Total number of RPDs in this review set
   */
  rpdCount: number;
  /**
   * Comma-separated list of RPD titles for display
   */
  rpdTitlesDisplay: string;
  /**
   * Whether this review set is currently selected
   */
  isSelected?: boolean;
}

/**
 * Props interface for ReviewSet selection components
 * Following existing MultiSelectCombobox pattern
 */
export interface ReviewSetSelectorProps {
  projectId: string;
  selectedRpdIds: string[];
  onRpdSelectionChange: (rpdIds: string[]) => void;
  selectedReviewSetIds: string[];
  onReviewSetSelectionChange: (reviewSetIds: string[]) => void;
  className?: string;
  disabled?: boolean;
  selectedCharacter?: CharacterDetail | null;
}

/**
 * Props for individual ReviewSet card component
 */
export interface ReviewSetCardProps {
  reviewSet: ReviewSetOut;
  isSelected: boolean;
  onToggle: (reviewSetId: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Helper function return type for transforming ReviewSetOut to ReviewSetDisplay
 */
export interface ReviewSetTransformResult {
  reviewSets: ReviewSetDisplay[];
  totalRpdCount: number;
  hasReviewSets: boolean;
}
