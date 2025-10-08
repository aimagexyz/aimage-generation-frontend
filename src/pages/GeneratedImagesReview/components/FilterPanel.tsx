import { Calendar as CalendarIcon, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';

import { FilterState } from '../utils/filterImages';

interface FilterPanelProps {
  readonly filters: FilterState;
  readonly onFiltersChange: (filters: FilterState) => void;
  readonly availableTags: string[];
  readonly tagCounts: Record<string, number>;
  readonly resultCount: number;
  readonly totalCount: number;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  availableTags,
  resultCount,
  totalCount,
}: FilterPanelProps) {
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const handleStartDateChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange: { ...filters.dateRange, start: date || null },
    });
    setStartDateOpen(false);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange: { ...filters.dateRange, end: date || null },
    });
    setEndDateOpen(false);
  };

  const handleSearchChange = (query: string) => {
    onFiltersChange({ ...filters, searchQuery: query });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      dateRange: { start: null, end: null },
      selectedTags: [],
      searchQuery: '',
    });
  };

  const hasActiveFilters =
    filters.dateRange.start ||
    filters.dateRange.end ||
    filters.selectedTags.length > 0 ||
    filters.searchQuery;

  const formatDate = (date: Date | null) => {
    if (!date) {
return '日付を選択';
}
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card/50 backdrop-blur-sm p-3 shadow-sm">
      {/* Horizontal Layout */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search - Always visible */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search"
            placeholder="プロンプトを検索..."
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-9 pl-9"
          />
        </div>

        {/* Result Count */}
        <Badge variant="secondary" className="h-9 px-3">
          {resultCount} / {totalCount}
        </Badge>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-9"
            >
              <X className="mr-1 h-4 w-4" />
              クリア
            </Button>
          )}
          {(availableTags.length > 0 || filters.dateRange.start || filters.dateRange.end) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="h-9"
            >
              <SlidersHorizontal className="mr-1 h-4 w-4" />
              フィルター
              <ChevronDown
                className={`ml-1 h-4 w-4 transition-transform ${
                  filtersExpanded ? 'rotate-180' : ''
                }`}
              />
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters - Collapsible */}
      {filtersExpanded && (
        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300 border-t pt-3">
          {/* Date Range Filters */}
          <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">開始日</Label>
          <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-left font-normal h-9"
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                <span className="text-xs">{formatDate(filters.dateRange.start)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateRange.start || undefined}
                onSelect={handleStartDateChange}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">終了日</Label>
          <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-left font-normal h-9"
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                <span className="text-xs">{formatDate(filters.dateRange.end)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateRange.end || undefined}
                onSelect={handleEndDateChange}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}

