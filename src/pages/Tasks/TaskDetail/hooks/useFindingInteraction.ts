import { useCallback, useState } from 'react';

import type { FindingInteractionType } from '../components/AiReviewPanel';

/**
 * Custom hook to manage interactions with findings from an AI review.
 * It tracks the currently active/hovered finding and handles actions like
 * scrolling to a finding in a list when it's clicked on a visual representation.
 *
 * @returns An object containing the active finding ID and an interaction handler function.
 */
export function useFindingInteraction() {
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);

  /**
   * Handles interactions with findings, such as hover or click events.
   * Updates the active finding ID and can trigger side effects like scrolling.
   *
   * @param action The type of interaction (e.g., 'enter', 'leave', 'click').
   * @param findingId The ID of the finding that was interacted with.
   */
  const handleFindingInteraction = useCallback((action: FindingInteractionType, findingId: string) => {
    if (action === 'enter') {
      setActiveFindingId(findingId);
    } else if (action === 'leave') {
      setActiveFindingId(null);
    } else if (action === 'click') {
      setActiveFindingId(findingId);
      // Attempt to scroll the finding into view in its list
      const element = document.getElementById(`finding-item-${findingId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, []);

  return {
    activeFindingId,
    handleFindingInteraction,
    clearActiveFindingId: () => setActiveFindingId(null), // Allow parent to clear active finding
  };
}
