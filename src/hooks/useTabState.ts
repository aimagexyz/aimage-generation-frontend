import { useState } from 'react';

// Tab types
export type TabType = 'rpd' | 'review-set';

/**
 * Hook for managing tab state between RPD and ReviewSet management
 */
export function useTabState(defaultTab: TabType = 'rpd') {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  const switchToRPD = () => setActiveTab('rpd');
  const switchToReviewSet = () => setActiveTab('review-set');

  return {
    activeTab,
    setActiveTab,
    switchToRPD,
    switchToReviewSet,
    isRPDActive: activeTab === 'rpd',
    isReviewSetActive: activeTab === 'review-set',
  };
}
