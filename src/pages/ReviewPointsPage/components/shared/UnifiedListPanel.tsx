import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import React, { useCallback, useMemo, useRef } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { cn } from '@/utils/utils';

import { A11Y, CSS_PATTERNS, LAYOUT } from '../../constants/design';
import type { UnifiedListManagementReturn } from '../../hooks/useUnifiedListManagement';
import { PANEL_VARIANTS } from '../../utils/animations';

// Generic list panel props that can be extended by specific implementations
export interface UnifiedListPanelProps<T> {
  title: string;
  createButtonText?: string; // Make this optional for backward compatibility
  createButtonComponent?: React.ReactNode; // Add custom button support
  searchPlaceholder: string;
  listManagement: UnifiedListManagementReturn<T>;
  onCreateClick?: () => void; // Make this optional when using custom button
  children: React.ReactNode; // List items will be passed as children
  emptyStateComponent?: React.ReactNode;
  headerActions?: React.ReactNode;
  className?: string;
}

/**
 * Unified list panel component that provides consistent layout and behavior
 * for both RPD and ReviewSet management tabs
 */
export function UnifiedListPanel<T>({
  title,
  createButtonText,
  createButtonComponent,
  searchPlaceholder,
  listManagement,
  onCreateClick,
  children,
  emptyStateComponent,
  headerActions,
  className,
}: UnifiedListPanelProps<T>) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { viewState, filteredItems, handleSearchChange, selectedCount, handleSelectAll, handleDeselectAll } =
    listManagement;

  // Memoize search handler
  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleSearchChange(e.target.value);
    },
    [handleSearchChange],
  );

  // Memoize header content
  const headerContent = useMemo(() => {
    return (
      <div className="flex flex-col flex-shrink-0 gap-3 p-4 border-b border-border/50">
        {/* Top row: Title and Create Button */}
        <div className={CSS_PATTERNS.flex.between}>
          <h2 className="font-semibold text-foreground">
            {title} ({filteredItems.length})
          </h2>

          {/* Render either custom button component or default button */}
          {createButtonComponent ||
            (createButtonText && onCreateClick && (
              <Button onClick={onCreateClick} size="sm" aria-label={`${createButtonText}を作成`}>
                <Plus className="w-4 h-4 mr-1" />
                {createButtonText}
              </Button>
            ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search
            className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={searchInputRef}
            placeholder={searchPlaceholder}
            value={viewState.searchQuery}
            onChange={handleSearchInputChange}
            className="pl-9 bg-background/50 backdrop-blur-sm"
            aria-label={A11Y.labels.search}
          />
        </div>

        {/* Bottom row: Bulk selection controls and other actions */}
        {(!!viewState.showBulkActions || !!headerActions) && (
          <div className={CSS_PATTERNS.flex.between}>
            <div className="flex items-center gap-2">
              {/* Bulk selection controls */}
              {viewState.showBulkActions && filteredItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectedCount === filteredItems.length ? handleDeselectAll : handleSelectAll}
                  className="text-xs text-muted-foreground hover:text-foreground"
                  aria-label={selectedCount === filteredItems.length ? A11Y.labels.deselectAll : A11Y.labels.selectAll}
                >
                  {selectedCount === filteredItems.length ? '全解除' : '全選択'}
                </Button>
              )}
            </div>

            <div className={CSS_PATTERNS.flex.start}>{headerActions}</div>
          </div>
        )}
      </div>
    );
  }, [
    title,
    filteredItems.length,
    createButtonComponent,
    createButtonText,
    onCreateClick,
    searchPlaceholder,
    viewState.searchQuery,
    viewState.showBulkActions,
    handleSearchInputChange,
    selectedCount,
    handleSelectAll,
    handleDeselectAll,
    headerActions,
  ]);

  // Memoize list content
  // eslint-disable-next-line sonarjs/function-return-type
  const listContent = useMemo((): React.ReactNode => {
    if (filteredItems.length === 0) {
      if (emptyStateComponent) {
        return emptyStateComponent;
      }
      return (
        <div className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">アイテムがありません</p>
        </div>
      );
    }

    return (
      <div className="p-2 space-y-2">
        <AnimatePresence mode="popLayout">{children}</AnimatePresence>
      </div>
    );
  }, [filteredItems.length, emptyStateComponent, children]);

  return (
    <motion.div
      className={cn(
        'flex flex-col border-r bg-background/50 backdrop-blur-sm border-border/50',
        LAYOUT.listPanel.width,
        'min-w-0',
        className,
      )}
      variants={PANEL_VARIANTS}
      initial="hidden"
      animate="visible"
    >
      {headerContent}

      <ScrollArea className="flex-1">{listContent}</ScrollArea>
    </motion.div>
  );
}

// Helper component for empty states
export const UnifiedEmptyState = React.memo(
  ({
    title,
    description,
    actionText,
    onAction,
    icon: Icon,
  }: {
    title: string;
    description: string;
    actionText?: string;
    onAction?: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  }) => {
    return (
      <motion.div
        className="p-8 space-y-6 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {Icon && (
          <div className="flex items-center justify-center w-20 h-20 mx-auto border rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border-primary/10">
            <Icon className="w-10 h-10 text-primary/60" />
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <p className="max-w-md mx-auto text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>

        {actionText && onAction && (
          <Button onClick={onAction} size="lg" className="mt-6">
            <Plus className="w-5 h-5 mr-2" />
            {actionText}
          </Button>
        )}
      </motion.div>
    );
  },
);

UnifiedEmptyState.displayName = 'UnifiedEmptyState';

// Helper component for list item wrapper with consistent styling
export function UnifiedListItem({
  children,
  isSelected,
  isBulkSelected,
  onClick,
  className,
  ...props
}: {
  children: React.ReactNode;
  isSelected?: boolean;
  isBulkSelected?: boolean;
  onClick?: () => void;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'>) {
  return (
    <motion.div
      className={cn(
        CSS_PATTERNS.listItem,
        'cursor-pointer hover:shadow-md',
        'backdrop-blur-sm',
        isSelected &&
          'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/50 shadow-lg ring-2 ring-primary/20',
        isBulkSelected && !isSelected && 'bg-gradient-to-r from-accent/30 to-accent/20 border-primary/30 shadow-md',
        !isSelected && !isBulkSelected && 'bg-card/80 border-border/50 hover:bg-card hover:border-border',
        className,
      )}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      layout={true}
      id={props.id}
      role={props.role}
      aria-label={props['aria-label']}
      aria-labelledby={props['aria-labelledby']}
      aria-describedby={props['aria-describedby']}
      tabIndex={props.tabIndex}
      onKeyDown={props.onKeyDown}
    >
      {children}
    </motion.div>
  );
}
