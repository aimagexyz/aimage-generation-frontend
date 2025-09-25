import { useCallback, useMemo, useState } from 'react';

// Base types for unified list management
export type UnifiedSortDirection = 'asc' | 'desc';
export type UnifiedFilterStatus = 'all' | 'active' | 'inactive';

export interface UnifiedViewState {
  searchQuery: string;
  sortField: string;
  sortDirection: UnifiedSortDirection;
  filterStatus: UnifiedFilterStatus;
  selectedIds: Set<string>;
  showBulkActions: boolean;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface SortOption {
  value: string;
  label: string;
}

export interface BulkAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive';
}

export interface UnifiedListManagementOptions<T> {
  data: T[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  searchFields: (keyof T)[];
  enableBulkActions?: boolean;
  enableAdvancedFilters?: boolean;
  enableSorting?: boolean;
  defaultSortField?: string;
  defaultSortDirection?: UnifiedSortDirection;
  filterOptions?: FilterOption[];
  sortOptions?: SortOption[];
  getItemId: (item: T) => string;
  getItemStatus?: (item: T) => boolean;
  customFilterFn?: (item: T, filterStatus: string) => boolean;
  customSortFn?: (items: T[], sortField: string, sortDirection: UnifiedSortDirection) => T[];
}

export interface UnifiedListManagementReturn<T> {
  viewState: UnifiedViewState;
  updateViewState: (updates: Partial<UnifiedViewState>) => void;
  resetFilters: () => void;
  toggleSortDirection: () => void;
  filteredItems: T[];
  handleSearchChange: (query: string) => void;
  selectedCount: number;
  handleBulkSelection: (itemId: string, selected: boolean) => void;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  announceChange: (message: string) => void;
}

const DEFAULT_VIEW_STATE: UnifiedViewState = {
  searchQuery: '',
  sortField: 'updated',
  sortDirection: 'desc',
  filterStatus: 'all',
  selectedIds: new Set<string>(),
  showBulkActions: false,
};

export function useUnifiedListManagement<T>({
  data,
  isLoading: _isLoading,
  isError: _isError,
  refetch: _refetch,
  searchFields,
  enableBulkActions = false,
  enableAdvancedFilters = false,
  enableSorting = true,
  defaultSortField = 'updated',
  defaultSortDirection = 'desc',
  filterOptions: _filterOptions = [],
  sortOptions: _sortOptions = [],
  getItemId,
  getItemStatus,
  customFilterFn,
  customSortFn,
}: UnifiedListManagementOptions<T>): UnifiedListManagementReturn<T> {
  const [viewState, setViewState] = useState<UnifiedViewState>({
    ...DEFAULT_VIEW_STATE,
    sortField: defaultSortField,
    sortDirection: defaultSortDirection,
  });

  const updateViewState = useCallback((updates: Partial<UnifiedViewState>) => {
    setViewState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setViewState((prev) => ({
      ...prev,
      searchQuery: '',
      filterStatus: 'all',
      selectedIds: new Set<string>(),
      showBulkActions: false,
    }));
  }, []);

  const toggleSortDirection = useCallback(() => {
    setViewState((prev) => ({
      ...prev,
      sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleSearchChange = useCallback(
    (query: string) => {
      updateViewState({ searchQuery: query });
    },
    [updateViewState],
  );

  const announceChange = useCallback((message: string) => {
    console.log(`Accessibility announcement: ${message}`);
  }, []);

  const filteredItems = useMemo(() => {
    if (!data) {
      return [];
    }

    let filtered = [...data];

    // Apply search filter
    if (viewState.searchQuery.trim()) {
      const searchLower = viewState.searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        return searchFields.some((field) => {
          const value = item[field];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(searchLower);
          }
          if (typeof value === 'object' && value != null) {
            return JSON.stringify(value).toLowerCase().includes(searchLower);
          }
          return false;
        });
      });
    }

    // Apply status filter
    if (enableAdvancedFilters && getItemStatus && viewState.filterStatus != 'all') {
      filtered = filtered.filter((item) => {
        const isActive = getItemStatus(item);
        return viewState.filterStatus === 'active' ? isActive : !isActive;
      });
    }

    // Apply custom filter
    if (customFilterFn && viewState.filterStatus != 'all') {
      filtered = filtered.filter((item) => {
        return customFilterFn(item, viewState.filterStatus);
      });
    }

    // Apply sorting
    if (enableSorting && viewState.sortField) {
      filtered.sort((a, b) => {
        const aValue = getNestedValue(a, viewState.sortField);
        const bValue = getNestedValue(b, viewState.sortField);

        let comparison = 0;

        if (String(aValue) < String(bValue)) {
          comparison = -1;
        } else if (String(aValue) > String(bValue)) {
          comparison = 1;
        }

        return viewState.sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    // Apply custom sort
    if (customSortFn && viewState.sortField) {
      filtered = customSortFn(filtered, viewState.sortField, viewState.sortDirection);
    }

    return filtered;
  }, [
    data,
    viewState,
    searchFields,
    enableAdvancedFilters,
    enableSorting,
    getItemStatus,
    customFilterFn,
    customSortFn,
  ]);

  const selectedCount = viewState.selectedIds.size;

  const handleBulkSelection = useCallback(
    (itemId: string, selected: boolean) => {
      if (!enableBulkActions) {
        return;
      }

      setViewState((prev) => {
        const newSelectedIds = new Set(prev.selectedIds);
        if (selected) {
          newSelectedIds.add(itemId);
        } else {
          newSelectedIds.delete(itemId);
        }

        return {
          ...prev,
          selectedIds: newSelectedIds,
          showBulkActions: newSelectedIds.size > 0,
        };
      });
    },
    [enableBulkActions],
  );

  const handleSelectAll = useCallback(() => {
    if (!enableBulkActions) {
      return;
    }

    const allIds = new Set(filteredItems.map(getItemId));
    setViewState((prev) => ({
      ...prev,
      selectedIds: allIds,
      showBulkActions: true,
    }));

    announceChange(`${allIds.size}件のアイテムを全選択しました`);
  }, [enableBulkActions, filteredItems, getItemId, announceChange]);

  const handleDeselectAll = useCallback(() => {
    if (!enableBulkActions) {
      return;
    }

    setViewState((prev) => ({
      ...prev,
      selectedIds: new Set<string>(),
      showBulkActions: false,
    }));

    announceChange('選択を全て解除しました');
  }, [enableBulkActions, announceChange]);

  return {
    viewState,
    updateViewState,
    resetFilters,
    toggleSortDirection,
    filteredItems,
    handleSearchChange,
    selectedCount,
    handleBulkSelection,
    handleSelectAll,
    handleDeselectAll,
    announceChange,
  };
}

// Helper function to get nested values
function getNestedValue<T>(obj: T, path: string): string {
  try {
    const value = path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);

    if (value == null) {
      return '';
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  } catch {
    return '';
  }
}
