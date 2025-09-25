import { useCallback, useState } from 'react';

export type SortField = 'title' | 'status' | 'updated' | 'created' | 'version';
export type SortDirection = 'asc' | 'desc';
export type FilterStatus = 'all' | 'active' | 'inactive';

export interface ViewState {
  mode: 'list' | 'grid' | 'compact';
  sortField: SortField;
  sortDirection: SortDirection;
  filterStatus: FilterStatus;
  searchQuery: string;
  selectedIds: Set<string>;
  showBulkActions: boolean;
}

const initialViewState: ViewState = {
  mode: 'list',
  sortField: 'updated',
  sortDirection: 'desc',
  filterStatus: 'all',
  searchQuery: '',
  selectedIds: new Set(),
  showBulkActions: false,
};

export function useViewState() {
  const [viewState, setViewState] = useState<ViewState>(initialViewState);

  const updateViewState = useCallback((updates: Partial<ViewState>) => {
    setViewState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    updateViewState({ searchQuery: '', filterStatus: 'all' });
  }, [updateViewState]);

  const toggleSortDirection = useCallback(() => {
    updateViewState({
      sortDirection: viewState.sortDirection === 'asc' ? 'desc' : 'asc',
    });
  }, [viewState.sortDirection, updateViewState]);

  return {
    viewState,
    updateViewState,
    resetFilters,
    toggleSortDirection,
  };
}
