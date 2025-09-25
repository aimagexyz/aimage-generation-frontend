import { ArrowUpDown, CheckCircle2, Filter, SortAsc, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

import type { SortField, ViewState } from '../hooks/useViewState';

interface SearchAndFiltersProps {
  viewState: ViewState;
  onViewStateChange: (updates: Partial<ViewState>) => void;
  onToggleSortDirection: () => void;
}

const SORT_OPTIONS = [
  { value: 'updated', label: '最終更新' },
  { value: 'title', label: 'タイトル' },
  { value: 'status', label: 'ステータス' },
  { value: 'created', label: '作成日' },
  { value: 'version', label: 'バージョン' },
] as const;

const getSortFieldLabel = (field: SortField): string => {
  const option = SORT_OPTIONS.find((opt) => opt.value === field);
  return option?.label || '最終更新';
};

export function SearchAndFilters({ viewState, onViewStateChange, onToggleSortDirection }: SearchAndFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-background/50 backdrop-blur-sm"
            aria-label="ステータスでフィルター"
          >
            <Filter className="w-4 h-4 mr-2" />
            ステータス
            {viewState.filterStatus !== 'all' && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {viewState.filterStatus === 'active' && 'アクティブ'}
                {viewState.filterStatus === 'inactive' && '非アクティブ'}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>ステータスフィルター</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={viewState.filterStatus === 'all'}
            onCheckedChange={() => onViewStateChange({ filterStatus: 'all' })}
          >
            すべてのRPD
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={viewState.filterStatus === 'active'}
            onCheckedChange={() => onViewStateChange({ filterStatus: 'active' })}
          >
            <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
            アクティブのみ
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={viewState.filterStatus === 'inactive'}
            onCheckedChange={() => onViewStateChange({ filterStatus: 'inactive' })}
          >
            <XCircle className="w-4 h-4 mr-2 text-muted-foreground" />
            非アクティブのみ
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort Options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-background/50 backdrop-blur-sm"
            aria-label="並び替えオプション"
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            {getSortFieldLabel(viewState.sortField)}
            <SortAsc
              className={`h-3 w-3 ml-1 transition-transform ${viewState.sortDirection === 'desc' ? 'rotate-180' : ''}`}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>並び替え基準</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SORT_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={viewState.sortField === option.value}
              onCheckedChange={() =>
                onViewStateChange({
                  sortField: option.value as SortField,
                })
              }
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onToggleSortDirection}>
            <ArrowUpDown className="w-4 h-4 mr-2" />
            {viewState.sortDirection === 'asc' ? '降順に変更' : '昇順に変更'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
