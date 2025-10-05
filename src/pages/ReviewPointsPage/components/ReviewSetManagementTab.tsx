import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import type { ReviewSetOut } from '@/api/reviewSetsService';
import { reviewSetsQueryKeys, useDeleteReviewSet, useReviewSets } from '@/hooks/useReviewSets';

import { useUnifiedListManagement } from '../hooks/useUnifiedListManagement';
import { TIMING, UNIFIED_ANIMATIONS } from '../utils/animations';
import { DetailPanelPlaceholder } from './DetailPanelPlaceholder';
import { LoadingAndErrorStates } from './LoadingAndErrorStates';
import ReviewSetCreateModal from './ReviewSetCreateModal';
import ReviewSetDetailPanel from './ReviewSetDetailPanel';
import ReviewSetListItem from './ReviewSetListItem';
import UnifiedBulkActionBar, { type BulkAction } from './shared/UnifiedBulkActionBar';
import { UnifiedEmptyState, UnifiedListPanel } from './shared/UnifiedListPanel';

interface ReviewSetManagementTabProps {
  projectId: string;
}

export interface ReviewSetManagementTabRef {
  openCreateModal: () => void;
  refreshData: () => void;
}

export const ReviewSetManagementTab = forwardRef<ReviewSetManagementTabRef, ReviewSetManagementTabProps>(
  ({ projectId }, ref) => {
    // Data fetching
    const { data: reviewSets, isLoading, isError, refetch } = useReviewSets(projectId);
    const queryClient = useQueryClient();

    // State management
    const [selectedReviewSet, setSelectedReviewSet] = useState<ReviewSetOut | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Refs for accessibility
    const announcementRef = useRef<HTMLDivElement>(null);

    // Mutations for bulk operations
    const deleteReviewSetMutation = useDeleteReviewSet();

    // Unified list management with enhanced features for review sets
    const listManagement = useUnifiedListManagement<ReviewSetOut>({
      data: reviewSets || [],
      isLoading,
      isError,
      refetch: () => {
        void refetch();
      },
      searchFields: ['name', 'description'] as (keyof ReviewSetOut)[],
      enableBulkActions: true, // Enable bulk actions for review sets
      enableAdvancedFilters: true, // Enable advanced filters for better UX
      enableSorting: true,
      defaultSortField: 'created_at',
      defaultSortDirection: 'desc',
      filterOptions: [
        { value: 'all', label: '全て' },
        { value: 'has_rpds', label: 'RPDあり' },
        { value: 'no_rpds', label: 'RPDなし' },
        { value: 'has_characters', label: 'キャラクターあり' },
        { value: 'no_characters', label: 'キャラクターなし' },
      ],
      sortOptions: [
        { value: 'created_at', label: '作成日時' },
        { value: 'updated_at', label: '更新日時' },
        { value: 'name', label: '名前' },
        { value: 'rpd_count', label: 'RPD数' },
        { value: 'character_count', label: 'キャラクター数' },
      ],
      getItemId: (reviewSet: ReviewSetOut) => reviewSet.id,
      // Custom filter function for review sets
      customFilterFn: (reviewSet: ReviewSetOut, filterStatus: string) => {
        if (filterStatus === 'has_rpds') {
          return (reviewSet.rpds?.length || 0) > 0;
        }
        if (filterStatus === 'no_rpds') {
          return (reviewSet.rpds?.length || 0) === 0;
        }
        if (filterStatus === 'has_characters') {
          return (reviewSet.characters?.length || 0) > 0;
        }
        if (filterStatus === 'no_characters') {
          return (reviewSet.characters?.length || 0) === 0;
        }
        return true;
      },
      // Custom sort function for review sets
      customSortFn: (reviewSets: ReviewSetOut[], sortField: string, sortDirection: 'asc' | 'desc') => {
        return [...reviewSets].sort((a, b) => {
          let aValue: string | number;
          let bValue: string | number;

          if (sortField === 'rpd_count') {
            aValue = a.rpds?.length || 0;
            bValue = b.rpds?.length || 0;
          } else if (sortField === 'character_count') {
            aValue = a.characters?.length || 0;
            bValue = b.characters?.length || 0;
          } else {
            aValue = (a as unknown as Record<string, string | number>)[sortField] || '';
            bValue = (b as unknown as Record<string, string | number>)[sortField] || '';
          }

          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
          }

          if (aValue < bValue) {
            return sortDirection === 'asc' ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortDirection === 'asc' ? 1 : -1;
          }
          return 0;
        });
      },
    });

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      openCreateModal: () => {
        setIsCreateModalOpen(true);
      },
      refreshData: () => {
        void refetch();
      },
    }));

    // Accessibility announcements
    const announceChange = useCallback((message: string) => {
      if (announcementRef.current) {
        announcementRef.current.textContent = message;
      }
    }, []);

    // Auto-select first review set when data loads
    useEffect(() => {
      const filteredReviewSets = listManagement.filteredItems;
      const isSelectedInList = selectedReviewSet && filteredReviewSets.some((rs) => rs.id === selectedReviewSet.id);

      if (filteredReviewSets.length > 0 && !isSelectedInList) {
        const firstReviewSet = filteredReviewSets[0];
        setSelectedReviewSet(firstReviewSet);
        announceChange(`${firstReviewSet.name}が自動的に選択されました`);
      } else if (filteredReviewSets.length === 0) {
        setSelectedReviewSet(null);
      }
    }, [listManagement.filteredItems, selectedReviewSet, announceChange]);

    // Event handlers
    const handleSelectReviewSet = useCallback(
      (reviewSet: ReviewSetOut) => {
        setSelectedReviewSet(reviewSet);
        announceChange(`${reviewSet.name}を選択しました`);
      },
      [announceChange],
    );

    const handleRefresh = useCallback(() => {
      // 先清理缓存，然后重新获取数据
      void queryClient.invalidateQueries({ queryKey: reviewSetsQueryKeys.list(projectId) });
      void refetch();
      announceChange('データを更新しました');
    }, [refetch, announceChange, queryClient, projectId]);

    const handleCreateClick = useCallback(() => {
      setIsCreateModalOpen(true);
    }, []);

    // Bulk operations
    const handleBulkDelete = useCallback(async () => {
      const selectedIds = Array.from(listManagement.viewState.selectedIds);

      try {
        await Promise.all(selectedIds.map((reviewSetId) => deleteReviewSetMutation.mutateAsync(reviewSetId)));

        // Clear selection after successful bulk delete
        listManagement.handleDeselectAll();
        announceChange(`${selectedIds.length}件のレビューセットを削除しました`);

        // Refresh data
        void refetch();
      } catch (error) {
        console.error('Failed to bulk delete review sets:', error);
        announceChange('レビューセットの一括削除に失敗しました');
      }
    }, [listManagement, deleteReviewSetMutation, announceChange, refetch]);

    const handleBulkAction = useCallback(
      (actionKey: string) => {
        if (actionKey === 'delete') {
          void handleBulkDelete();
        } else {
          console.log('Unknown bulk action:', actionKey);
        }
      },
      [handleBulkDelete],
    );

    // Define bulk actions for review sets
    const bulkActions: BulkAction[] = [
      {
        key: 'delete',
        label: '削除',
        icon: <Trash2 className="h-4 w-4" />,
        variant: 'destructive',
      },
    ];

    // Custom empty state component for review sets
    const emptyStateComponent = (
      <UnifiedEmptyState
        title="レビューセットがありません"
        description={
          listManagement.viewState.searchQuery || listManagement.viewState.filterStatus !== 'all'
            ? 'フィルターや検索条件を調整して、お探しのレビューセットを見つけてください。'
            : '最初のレビューセットを作成して、効率的なレビュープロセスを構築しましょう。'
        }
        actionText={
          !listManagement.viewState.searchQuery && listManagement.viewState.filterStatus === 'all'
            ? 'レビューセットを作成'
            : undefined
        }
        onAction={
          !listManagement.viewState.searchQuery && listManagement.viewState.filterStatus === 'all'
            ? handleCreateClick
            : undefined
        }
      />
    );

    // Loading and error states
    if (isLoading || isError) {
      return (
        <div className="flex h-full overflow-hidden">
          <div className="flex-1">
            <LoadingAndErrorStates isLoading={isLoading} isError={isError} onRetry={handleRefresh} />
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full overflow-hidden">
        {/* Accessibility announcements */}
        <div ref={announcementRef} className="sr-only" aria-live="polite" aria-atomic="true" />

        {/* Unified List Panel for Review Sets */}
        <UnifiedListPanel<ReviewSetOut>
          title="レビューセット"
          createButtonText="新規作成"
          searchPlaceholder="レビューセットを検索..."
          listManagement={listManagement}
          onCreateClick={handleCreateClick}
          emptyStateComponent={emptyStateComponent}
          headerActions={
            listManagement.filteredItems.length > 0 && (
              <div className="flex items-center gap-2">
                {/* Bulk selection toggle */}
                <button
                  onClick={
                    listManagement.selectedCount === listManagement.filteredItems.length
                      ? listManagement.handleDeselectAll
                      : listManagement.handleSelectAll
                  }
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {listManagement.selectedCount === listManagement.filteredItems.length ? '全選択解除' : '全選択'}
                </button>

                {/* Item count */}
                <div className="text-xs text-muted-foreground">
                  <span>
                    {listManagement.filteredItems.length}件
                    {reviewSets &&
                      listManagement.filteredItems.length !== reviewSets.length &&
                      ` / ${reviewSets.length}件`}
                  </span>
                </div>
              </div>
            )
          }
          className="w-[480px]"
        >
          {/* Unified Bulk Actions Bar */}
          <AnimatePresence>
            {listManagement.viewState.showBulkActions && (
              <UnifiedBulkActionBar
                selectedCount={listManagement.selectedCount}
                totalCount={listManagement.filteredItems.length}
                onSelectAll={listManagement.handleSelectAll}
                onDeselectAll={listManagement.handleDeselectAll}
                bulkActions={bulkActions}
                onBulkAction={handleBulkAction}
                isLoading={deleteReviewSetMutation.isPending}
                entityName="レビューセット"
              />
            )}
          </AnimatePresence>

          {/* Review Set List Items */}
          <div className="p-2 space-y-2">
            <AnimatePresence>
              {listManagement.filteredItems.map((reviewSet, index) => (
                <motion.div
                  key={reviewSet.id}
                  initial={UNIFIED_ANIMATIONS.listItem.initial}
                  animate={UNIFIED_ANIMATIONS.listItem.animate}
                  exit={UNIFIED_ANIMATIONS.listItem.exit}
                  transition={{
                    duration: TIMING.normal,
                    delay: index * TIMING.stagger,
                  }}
                >
                  <ReviewSetListItem
                    reviewSet={reviewSet}
                    isSelected={selectedReviewSet?.id === reviewSet.id}
                    isBulkSelected={listManagement.viewState.selectedIds.has(reviewSet.id)}
                    onSelect={() => handleSelectReviewSet(reviewSet)}
                    onBulkSelect={(selected: boolean) => listManagement.handleBulkSelection(reviewSet.id, selected)}
                    onRefresh={handleRefresh}
                    showBulkSelect={listManagement.viewState.showBulkActions}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </UnifiedListPanel>

        {/* Enhanced Detail Panel */}
        <motion.div
          className="flex-1 bg-muted/30"
          initial={UNIFIED_ANIMATIONS.detailPanel.initial}
          animate={UNIFIED_ANIMATIONS.detailPanel.animate}
          transition={UNIFIED_ANIMATIONS.detailPanel.transition}
        >
          {selectedReviewSet ? (
            <ReviewSetDetailPanel
              reviewSet={selectedReviewSet}
              onRefresh={handleRefresh}
              onReviewSetUpdate={setSelectedReviewSet}
            />
          ) : (
            <DetailPanelPlaceholder text="レビューセットを選択してください" />
          )}
        </motion.div>

        {/* Create Modal */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <ReviewSetCreateModal
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              projectId={projectId}
              onSuccess={() => {
                setIsCreateModalOpen(false);
                handleRefresh();
              }}
            />
          )}
        </AnimatePresence>
      </div>
    );
  },
);

ReviewSetManagementTab.displayName = 'ReviewSetManagementTab';
