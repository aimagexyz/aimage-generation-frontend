import { useCallback } from 'react';

import type { ReviewPointDefinitionSchema } from '../../../types/ReviewPointDefinition';
import { useUpdateRPDStatus } from './useUpdateRPDStatus';
import type { ViewState } from './useViewState';

interface UseBulkOperationsProps {
  viewState: ViewState;
  updateViewState: (updates: Partial<ViewState>) => void;
  filteredRPDs: ReviewPointDefinitionSchema[];
  announceChange: (message: string) => void;
}

export function useBulkOperations({
  viewState,
  updateViewState,
  filteredRPDs,
  announceChange,
}: UseBulkOperationsProps) {
  const updateStatusMutation = useUpdateRPDStatus();

  const handleBulkSelection = useCallback(
    (rpdId: string, selected: boolean) => {
      const newSelectedIds = new Set(viewState.selectedIds);
      if (selected) {
        newSelectedIds.add(rpdId);
      } else {
        newSelectedIds.delete(rpdId);
      }

      updateViewState({
        selectedIds: newSelectedIds,
        showBulkActions: newSelectedIds.size > 0,
      });
    },
    [viewState.selectedIds, updateViewState],
  );

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(filteredRPDs.map((rpd) => rpd.id));
    updateViewState({
      selectedIds: allIds,
      showBulkActions: allIds.size > 0,
    });
    announceChange(`すべての${allIds.size}件のRPDを選択しました`);
  }, [filteredRPDs, updateViewState, announceChange]);

  const handleDeselectAll = useCallback(() => {
    updateViewState({
      selectedIds: new Set(),
      showBulkActions: false,
    });
    announceChange('すべての選択を解除しました');
  }, [updateViewState, announceChange]);

  const handleBulkStatusUpdate = useCallback(
    async (newStatus: boolean) => {
      const selectedIds = Array.from(viewState.selectedIds);

      if (selectedIds.length === 0) {
        return;
      }

      try {
        const updatePromises = selectedIds.map((rpdId) =>
          updateStatusMutation.mutateAsync({
            rpdId,
            data: { is_active: newStatus },
          }),
        );

        await Promise.all(updatePromises);

        updateViewState({
          selectedIds: new Set(),
          showBulkActions: false,
        });

        announceChange(`${selectedIds.length}件のRPDを${newStatus ? 'アクティブ' : '非アクティブ'}に一括更新しました`);
      } catch (error) {
        console.error('Failed to update RPDs:', error);
      }
    },
    [viewState.selectedIds, updateStatusMutation, updateViewState, announceChange],
  );

  return {
    handleBulkSelection,
    handleSelectAll,
    handleDeselectAll,
    handleBulkStatusUpdate,
    isLoading: updateStatusMutation.isPending,
  };
}
