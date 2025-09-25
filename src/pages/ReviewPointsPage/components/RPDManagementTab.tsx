import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Plus } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { ReviewPointDefinitionSchema } from '../../../types/ReviewPointDefinition';
import { useReviewPointDefinitions } from '../hooks/useReviewPointDefinitions';
import { useUnifiedListManagement } from '../hooks/useUnifiedListManagement';
import { useUpdateRPDStatus } from '../hooks/useUpdateRPDStatus';
import type { ViewState } from '../hooks/useViewState';
import { TIMING, UNIFIED_ANIMATIONS } from '../utils/animations';
import BulkActionBar from './BulkActionBar';
import { DetailPanelPlaceholder } from './DetailPanelPlaceholder';
import { EmptyState } from './EmptyState';
import EnhancedRPDListItem from './EnhancedRPDListItem';
import { LoadingAndErrorStates } from './LoadingAndErrorStates';
import RPDCreateModal from './RPDCreateModal';
import RPDCreateModalFast from './RPDCreateModalFast';
import RPDCreateModalNew from './RPDCreateModalNew';
import RPDDetailPanel from './RPDDetailPanel';
import RPDEditModalNew from './RPDEditModalNew';
import { UnifiedListPanel } from './shared/UnifiedListPanel';

interface RPDManagementTabProps {
  projectId: string;
}

export interface RPDManagementTabRef {
  openCreateModal: () => void;
  refreshData: () => void;
}

export const RPDManagementTab = forwardRef<RPDManagementTabRef, RPDManagementTabProps>(({ projectId }, ref) => {
  // State management
  const [selectedRPD, setSelectedRPD] = useState<ReviewPointDefinitionSchema | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFastCreateModalOpen, setIsFastCreateModalOpen] = useState(false);
  const [isCreateModalNewOpen, setIsCreateModalNewOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Refs
  const announcementRef = useRef<HTMLDivElement>(null);

  // Data fetching
  const {
    data: rpds,
    isLoading,
    isError,
    refetch,
  } = useReviewPointDefinitions({
    activeOnly: false,
    projectId,
  });

  const updateStatusMutation = useUpdateRPDStatus();

  // Unified list management with advanced features
  const listManagement = useUnifiedListManagement({
    data: rpds,
    isLoading,
    isError,
    refetch: () => {
      void refetch();
    },
    searchFields: ['key', 'updated_at'],
    enableBulkActions: true,
    enableAdvancedFilters: true,
    enableSorting: true,
    defaultSortField: 'updated_at',
    defaultSortDirection: 'desc',
    filterOptions: [
      { value: 'all', label: '全て' },
      { value: 'active', label: 'アクティブ' },
      { value: 'inactive', label: '非アクティブ' },
    ],
    sortOptions: [
      { value: 'updated_at', label: '更新日時' },
      { value: 'created_at', label: '作成日時' },
      { value: 'key', label: 'キー' },
    ],
    getItemId: (rpd) => rpd.id,
    getItemStatus: (rpd) => rpd.is_active,
  });

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    openCreateModal: () => {
      setIsCreateModalNewOpen(true);
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

  // Auto-select first RPD when data loads
  useEffect(() => {
    const filteredRPDs = listManagement.filteredItems;
    const isSelectedInList = selectedRPD && filteredRPDs.some((rpd) => rpd.id === selectedRPD.id);

    if (filteredRPDs.length > 0 && !isSelectedInList) {
      const firstRPD = filteredRPDs[0];
      setSelectedRPD(firstRPD);
      announceChange(`${firstRPD.current_version?.title || 'タイトルなしRPD'}が自動的に選択されました`);
    } else if (filteredRPDs.length === 0) {
      setSelectedRPD(null);
    }
  }, [listManagement.filteredItems, selectedRPD, announceChange]);

  // Event handlers
  const handleRPDSelect = useCallback(
    (rpd: ReviewPointDefinitionSchema) => {
      setSelectedRPD(rpd);
      announceChange(`${rpd.current_version?.title || 'タイトルなしRPD'}を選択しました`);
    },
    [announceChange],
  );

  const handleInlineStatusToggle = useCallback(
    async (rpdId: string, newStatus: boolean) => {
      try {
        await updateStatusMutation.mutateAsync({ rpdId, data: { is_active: newStatus } });
        announceChange(`RPDのステータスが${newStatus ? 'アクティブ' : '非アクティブ'}に変更されました`);
      } catch (error) {
        console.error('Failed to update RPD status:', error);
        announceChange('RPDステータスの更新に失敗しました');
      }
    },
    [updateStatusMutation, announceChange],
  );

  // Bulk status update handler
  const handleBulkStatusUpdate = useCallback(
    async (isActive: boolean) => {
      const selectedIds = Array.from(listManagement.viewState.selectedIds);

      try {
        await Promise.all(
          selectedIds.map((rpdId) => updateStatusMutation.mutateAsync({ rpdId, data: { is_active: isActive } })),
        );

        // Clear selection after successful bulk update
        listManagement.handleDeselectAll();
        announceChange(
          `${selectedIds.length}件のRPDのステータスが${isActive ? 'アクティブ' : '非アクティブ'}に変更されました`,
        );
      } catch (error) {
        console.error('Failed to bulk update RPD status:', error);
        announceChange('RPDの一括ステータス更新に失敗しました');
      }
    },
    [listManagement, updateStatusMutation, announceChange],
  );

  // Handle create button click
  const handleCreateClick = useCallback(() => {
    setIsCreateModalNewOpen(true);
  }, []);

  // Handle fast create button click
  const handleFastCreateClick = useCallback(() => {
    setIsFastCreateModalOpen(true);
  }, []);

  // Custom empty state component
  const emptyStateComponent = (
    <EmptyState
      viewState={{
        searchQuery: listManagement.viewState.searchQuery,
        filterStatus: listManagement.viewState.filterStatus as 'all' | 'active' | 'inactive',
        sortField: listManagement.viewState.sortField as ViewState['sortField'],
        sortDirection: listManagement.viewState.sortDirection as ViewState['sortDirection'],
        selectedIds: listManagement.viewState.selectedIds,
        showBulkActions: listManagement.viewState.showBulkActions,
        mode: 'list' as const,
      }}
      onCreateClick={handleCreateClick}
      onResetFilters={listManagement.resetFilters}
    />
  );

  // Loading and error states
  if (isLoading || isError) {
    return (
      <div className="flex h-full overflow-hidden">
        <div className="flex-1">
          <LoadingAndErrorStates isLoading={isLoading} isError={isError} onRetry={() => void refetch()} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Accessibility announcements */}
      <div ref={announcementRef} className="sr-only" aria-live="polite" aria-atomic="true" />

      {/* Unified List Panel */}
      <UnifiedListPanel
        title="RPD"
        createButtonComponent={
          <CreateDropdownButton onCreateClick={handleCreateClick} onFastCreateClick={handleFastCreateClick} />
        }
        searchPlaceholder="RPDを検索..."
        listManagement={listManagement}
        emptyStateComponent={emptyStateComponent}
        className="w-[480px]"
      >
        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {listManagement.viewState.showBulkActions && (
            <BulkActionBar
              selectedCount={listManagement.selectedCount}
              totalCount={listManagement.filteredItems.length}
              onSelectAll={listManagement.handleSelectAll}
              onDeselectAll={listManagement.handleDeselectAll}
              onBulkActivate={() => void handleBulkStatusUpdate(true)}
              onBulkDeactivate={() => void handleBulkStatusUpdate(false)}
              isLoading={updateStatusMutation.isPending}
            />
          )}
        </AnimatePresence>

        {/* RPD List Items */}
        <div className="p-2 space-y-2">
          <AnimatePresence>
            {listManagement.filteredItems.map((rpd, index) => (
              <motion.div
                key={rpd.id}
                initial={UNIFIED_ANIMATIONS.listItem.initial}
                animate={UNIFIED_ANIMATIONS.listItem.animate}
                exit={UNIFIED_ANIMATIONS.listItem.exit}
                transition={{
                  duration: TIMING.normal,
                  delay: index * TIMING.stagger,
                }}
              >
                <EnhancedRPDListItem
                  rpd={rpd}
                  isSelected={selectedRPD?.id === rpd.id}
                  isBulkSelected={listManagement.viewState.selectedIds.has(rpd.id)}
                  projectId={projectId}
                  onSelect={() => handleRPDSelect(rpd)}
                  onBulkSelect={(selected: boolean) => listManagement.handleBulkSelection(rpd.id, selected)}
                  onStatusToggle={(newStatus: boolean) => handleInlineStatusToggle(rpd.id, newStatus)}
                  onEdit={() => {
                    setSelectedRPD(rpd);
                    setIsEditModalOpen(true);
                  }}
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
        {selectedRPD ? (
          <RPDDetailPanel rpd={selectedRPD} onEdit={() => setIsEditModalOpen(true)} />
        ) : (
          <DetailPanelPlaceholder />
        )}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <RPDCreateModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            projectId={projectId}
          />
        )}

        {isFastCreateModalOpen && (
          <RPDCreateModalFast
            isOpen={isFastCreateModalOpen}
            onClose={() => setIsFastCreateModalOpen(false)}
            projectId={projectId}
          />
        )}

        {isCreateModalNewOpen && (
          <RPDCreateModalNew
            isOpen={isCreateModalNewOpen}
            onClose={() => setIsCreateModalNewOpen(false)}
            projectId={projectId}
          />
        )}

        {isEditModalOpen && selectedRPD && (
          <RPDEditModalNew
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            rpdId={selectedRPD.id}
            projectId={projectId}
            onSuccess={async () => {
              // 编辑成功后更新选中的RPD数据
              const result = await refetch();
              if (selectedRPD && result.data) {
                const updatedRPD = result.data.find((rpd) => rpd.id === selectedRPD.id);
                if (updatedRPD) {
                  setSelectedRPD(updatedRPD);
                  announceChange(`${updatedRPD.current_version?.title || 'タイトルなしRPD'}を更新しました`);
                }
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

RPDManagementTab.displayName = 'RPDManagementTab';

// Component for the create dropdown button
interface CreateDropdownButtonProps {
  onCreateClick: () => void;
  onFastCreateClick: () => void;
}

function CreateDropdownButton({ onCreateClick, onFastCreateClick }: CreateDropdownButtonProps) {
  return (
    <div className="flex items-center">
      {/* Main create button */}
      <Button onClick={onCreateClick} size="sm" className="rounded-r-none border-r-0" aria-label="RPD作成">
        <Plus className="w-4 h-4 mr-1" />
        RPD作成
      </Button>

      {/* Dropdown trigger button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="rounded-l-none px-2" aria-label="その他の作成オプション">
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onFastCreateClick}>
            <Plus className="w-4 h-4 mr-2" />
            スピード作成
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
