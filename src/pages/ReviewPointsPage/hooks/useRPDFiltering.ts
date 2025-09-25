import { useMemo } from 'react';

import type { ReviewPointDefinitionSchema } from '../../../types/ReviewPointDefinition';
import type { ViewState } from './useViewState';

export function useRPDFiltering(rpds: ReviewPointDefinitionSchema[] | undefined, viewState: ViewState) {
  return useMemo(() => {
    if (!rpds) {
      return [];
    }

    const filtered = rpds.filter((rpd) => {
      // Status filter
      if (viewState.filterStatus !== 'all') {
        const isActive = rpd.is_active;
        if (viewState.filterStatus === 'active' && !isActive) {
          return false;
        }
        if (viewState.filterStatus === 'inactive' && isActive) {
          return false;
        }
      }

      // Search filter
      if (viewState.searchQuery) {
        const query = viewState.searchQuery.toLowerCase();
        const title = rpd.current_version?.title?.toLowerCase() || '';
        const key = rpd.key.toLowerCase();
        const description = rpd.current_version?.description_for_ai?.toLowerCase() || '';

        return title.includes(query) || key.includes(query) || description.includes(query);
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (viewState.sortField) {
        case 'title':
          aValue = a.current_version?.title || 'タイトルなし';
          bValue = b.current_version?.title || 'タイトルなし';
          break;
        case 'status':
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
          break;
        case 'updated':
          aValue = new Date(a.updated_at);
          bValue = new Date(b.updated_at);
          break;
        case 'created':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'version':
          aValue = a.current_version_num;
          bValue = b.current_version_num;
          break;
        default:
          aValue = a.updated_at;
          bValue = b.updated_at;
      }

      if (aValue < bValue) {
        return viewState.sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return viewState.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [rpds, viewState]);
}
