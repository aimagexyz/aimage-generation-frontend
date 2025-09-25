import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode, useCallback, useEffect, useRef } from 'react';

import { UnifiedListManagementReturn } from '../../hooks/useUnifiedListManagement';
import { TIMING, UNIFIED_ANIMATIONS } from '../../utils/animations';
import { LoadingAndErrorStates } from '../LoadingAndErrorStates';
import { UnifiedListPanel } from './UnifiedListPanel';

// Define the interface for list management
interface ListManagement<T> extends UnifiedListManagementReturn<T> {
  handleBulkSelect: (itemId: string, selected: boolean) => void;
  handleBulkSelectAll: () => void;
}

export interface UnifiedManagementTabProps<T> {
  // Data and state
  data: T[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;

  // List management
  listManagement: ListManagement<T>;

  // UI Configuration
  title: string;
  createButtonText: string;
  searchPlaceholder: string;
  panelWidth?: string;

  // Item selection
  selectedItem: T | null;
  onItemSelect: (item: T | null) => void;
  getItemId: (item: T) => string;

  // Auto-selection behavior
  enableAutoSelection?: boolean;
  getItemDisplayName?: (item: T) => string;

  // Accessibility
  enableAccessibilityAnnouncements?: boolean;

  // Render props for customization
  renderListItem: (item: T, index: number) => ReactNode;
  renderDetailPanel: (item: T | null) => ReactNode;
  renderEmptyState: () => ReactNode;
  renderHeaderActions?: () => ReactNode;
  renderBulkActions?: () => ReactNode;

  // Event handlers
  onCreateClick: () => void;
  onRefresh: () => void;

  // Modal management
  renderModals?: () => ReactNode;
}

/**
 * Unified Management Tab Component
 *
 * This component provides a consistent structure for management tabs with:
 * - Split-panel layout (list + detail)
 * - Unified animations and transitions
 * - Consistent loading/error states
 * - Accessibility features
 * - Customizable rendering through render props
 */
export function UnifiedManagementTab<T>({
  // data: _data, // Unused parameter
  isLoading,
  isError,
  // refetch: _refetch, // Unused parameter
  listManagement,
  title,
  createButtonText,
  searchPlaceholder,
  panelWidth = 'w-[480px]',
  selectedItem,
  onItemSelect,
  getItemId,
  enableAutoSelection = true,
  getItemDisplayName,
  enableAccessibilityAnnouncements = true,
  renderListItem,
  renderDetailPanel,
  renderEmptyState,
  renderHeaderActions,
  renderBulkActions,
  onCreateClick,
  onRefresh,
  renderModals,
}: UnifiedManagementTabProps<T>) {
  // Accessibility announcements
  const announcementRef = useRef<HTMLDivElement>(null);

  // Announce changes for screen readers
  const announceChange = useCallback(
    (message: string) => {
      if (enableAccessibilityAnnouncements && announcementRef.current) {
        announcementRef.current.textContent = message;
      }
    },
    [enableAccessibilityAnnouncements],
  );

  // Auto-select first item when data loads
  useEffect(() => {
    if (!enableAutoSelection) {
      return;
    }

    const filteredItems = listManagement.filteredItems;
    const isSelectedInList =
      selectedItem && filteredItems.some((item: T) => getItemId(item) === getItemId(selectedItem));

    if (filteredItems.length > 0 && !isSelectedInList) {
      const firstItem = filteredItems[0];
      onItemSelect(firstItem);

      if (getItemDisplayName && enableAccessibilityAnnouncements) {
        announceChange(`${getItemDisplayName(firstItem)}が自動的に選択されました`);
      }
    } else if (filteredItems.length === 0 && selectedItem) {
      // Clear selection if no items match filters
      onItemSelect(null);
    }
  }, [
    enableAutoSelection,
    listManagement.filteredItems,
    selectedItem,
    getItemId,
    onItemSelect,
    getItemDisplayName,
    enableAccessibilityAnnouncements,
    announceChange,
  ]);

  // Handle item selection with accessibility
  const handleItemSelect = useCallback(
    (item: T) => {
      onItemSelect(item);

      if (getItemDisplayName && enableAccessibilityAnnouncements) {
        announceChange(`${getItemDisplayName(item)}を選択しました`);
      }
    },
    [onItemSelect, getItemDisplayName, enableAccessibilityAnnouncements, announceChange],
  );

  // Loading and error states
  if (isLoading || isError) {
    return (
      <div className="flex h-full overflow-hidden">
        <div className="flex-1">
          <LoadingAndErrorStates isLoading={isLoading} isError={isError} onRetry={onRefresh} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Accessibility announcements */}
      {enableAccessibilityAnnouncements && (
        <div ref={announcementRef} className="sr-only" aria-live="polite" aria-atomic="true" />
      )}

      {/* Unified List Panel */}
      <UnifiedListPanel
        title={title}
        createButtonText={createButtonText}
        searchPlaceholder={searchPlaceholder}
        listManagement={listManagement}
        onCreateClick={onCreateClick}
        emptyStateComponent={renderEmptyState()}
        headerActions={renderHeaderActions?.()}
        className={panelWidth}
      >
        {/* Bulk Actions */}
        {renderBulkActions?.()}

        {/* List Items */}
        <div className="p-2 space-y-2">
          <AnimatePresence>
            {listManagement.filteredItems.map((item: T, index: number) => (
              <motion.div
                key={getItemId(item)}
                initial={UNIFIED_ANIMATIONS.listItem.initial}
                animate={UNIFIED_ANIMATIONS.listItem.animate}
                exit={UNIFIED_ANIMATIONS.listItem.exit}
                transition={{
                  duration: TIMING.normal,
                  delay: index * TIMING.stagger,
                }}
                onClick={() => handleItemSelect(item)}
              >
                {renderListItem(item, index)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </UnifiedListPanel>

      {/* Detail Panel */}
      <motion.div
        className="flex-1 bg-muted/30"
        initial={UNIFIED_ANIMATIONS.detailPanel.initial}
        animate={UNIFIED_ANIMATIONS.detailPanel.animate}
        transition={UNIFIED_ANIMATIONS.detailPanel.transition}
      >
        {renderDetailPanel(selectedItem)}
      </motion.div>

      {/* Modals */}
      {renderModals?.()}
    </div>
  );
}
