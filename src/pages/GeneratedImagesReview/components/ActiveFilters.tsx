import { X } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

import { FilterState } from '../utils/filterImages';

interface ActiveFiltersProps {
  readonly filters: FilterState;
  readonly onRemoveTag: (tag: string) => void;
  readonly onClearDateRange: () => void;
  readonly onClearSearch: () => void;
  readonly onClearAll: () => void;
}

export function ActiveFilters({
  filters,
  onRemoveTag,
  onClearDateRange,
  onClearSearch,
  onClearAll,
}: ActiveFiltersProps) {
  const hasFilters =
    filters.selectedTags.length > 0 || filters.dateRange.start || filters.dateRange.end || filters.searchQuery;

  if (!hasFilters) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">アクティブフィルター:</span>

      {/* Search Query */}
      {filters.searchQuery && (
        <Badge variant="secondary" className="gap-1 pl-3 pr-1">
          検索: {filters.searchQuery}
          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent" onClick={onClearSearch}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {/* Date Range */}
      {(filters.dateRange.start || filters.dateRange.end) && (
        <Badge variant="secondary" className="gap-1 pl-3 pr-1">
          日付: {filters.dateRange.start?.toLocaleDateString('ja-JP')} -{' '}
          {filters.dateRange.end?.toLocaleDateString('ja-JP')}
          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent" onClick={onClearDateRange}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {/* Tags */}
      {filters.selectedTags.map((tag) => (
        <Badge key={tag} variant="default" className="gap-1 pl-3 pr-1">
          {tag}
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={() => onRemoveTag(tag)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {/* Clear All */}
      <Button variant="ghost" size="sm" onClick={onClearAll} className="h-7 text-xs">
        すべてクリア
      </Button>
    </div>
  );
}
