import { format } from 'date-fns';
import { CalendarDays, Search, Tag, Users, X } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

import type { DateFilterType, DateRange, GroupByType } from '../../hooks/useTaskFilters';
import type { TaskPriorityItem, TaskStatusItem } from '../../hooks/useTasks';

interface FilterBadgesProps {
  searchQuery: string;
  dateRange: DateRange | undefined;
  dateFilterType: DateFilterType;
  statusFilter?: string;
  priorityFilter?: string;
  tagFilter?: string;
  groupBy: GroupByType;
  // assigneeFilter?: string;
  taskStatuses?: TaskStatusItem[];
  taskPriorities?: TaskPriorityItem[];
  onClearSearch: () => void;
  onClearDateRange: () => void;
  onClearStatus?: () => void;
  onClearPriority?: () => void;
  onClearTag?: () => void;
  onClearGroupBy: () => void;
  // onClearAssignee?: () => void;
  onClearAll: () => void;
}

const DATE_FILTER_LABELS: Record<DateFilterType, string> = {
  created_at: '作成日',
  updated_at: '更新日',
  due_date: '期限日',
};

const GROUP_BY_LABELS: Record<GroupByType, string> = {
  none: 'グループなし',
  assignee: '担当者別',
  tag: 'タグ別',
};

export function FilterBadges({
  searchQuery,
  dateRange,
  dateFilterType,
  statusFilter,
  priorityFilter,
  tagFilter,
  groupBy,
  // assigneeFilter,
  taskStatuses,
  taskPriorities,
  onClearSearch,
  onClearDateRange,
  onClearStatus,
  onClearPriority,
  onClearTag,
  onClearGroupBy,
  // onClearAssignee,
  onClearAll,
}: FilterBadgesProps) {
  const hasFilters =
    searchQuery || dateRange?.from || statusFilter || priorityFilter || tagFilter || groupBy !== 'none'; // || assigneeFilter;

  if (!hasFilters) {
    return null;
  }

  const getStatusName = (statusId: string) => {
    return taskStatuses?.find((s) => s.id === statusId)?.name || statusId;
  };

  const getPriorityName = (priorityId: string) => {
    return taskPriorities?.find((p) => p.id === priorityId)?.name || priorityId;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">筛选条件:</span>

      {searchQuery && (
        <Badge variant="secondary" className="text-xs h-6 gap-1">
          <Search className="h-3 w-3" />
          {searchQuery}
          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent" onClick={onClearSearch}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {dateRange?.from && (
        <Badge variant="secondary" className="text-xs h-6 gap-1">
          <CalendarDays className="h-3 w-3" />
          {DATE_FILTER_LABELS[dateFilterType]}:
          {dateRange.to
            ? `${format(dateRange.from, 'MM/dd')} - ${format(dateRange.to, 'MM/dd')}`
            : format(dateRange.from, 'MM/dd')}
          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent" onClick={onClearDateRange}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {statusFilter && (
        <Badge variant="secondary" className="text-xs h-6 gap-1">
          ステータス: {getStatusName(statusFilter)}
          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent" onClick={onClearStatus}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {priorityFilter && (
        <Badge variant="secondary" className="text-xs h-6 gap-1">
          優先度: {getPriorityName(priorityFilter)}
          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent" onClick={onClearPriority}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {tagFilter && (
        <Badge variant="secondary" className="text-xs h-6 gap-1">
          <Tag className="h-3 w-3" />
          タグ: {tagFilter}
          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent" onClick={onClearTag}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {groupBy !== 'none' && (
        <Badge variant="secondary" className="text-xs h-6 gap-1">
          <Users className="h-3 w-3" />
          グループ: {GROUP_BY_LABELS[groupBy]}
          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent" onClick={onClearGroupBy}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {/* Assignee filter hidden for now */}
      {/* {assigneeFilter && (
        <Badge variant="secondary" className="text-xs h-6 gap-1">
          担当者: {assigneeFilter === 'unassigned' ? '未割り当て' : assigneeFilter}
          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent" onClick={onClearAssignee}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )} */}

      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={onClearAll}
      >
        全てクリア
      </Button>
    </div>
  );
}
