import { useEffect, useState } from 'react';

export type DateRange = {
  from: Date | undefined;
  to?: Date;
};

export type DateFilterType = 'created_at' | 'updated_at' | 'due_date';

// 新增：分组类型定义
export type GroupByType = 'none' | 'assignee' | 'tag';

export interface TaskFilters {
  searchQuery: string;
  debouncedSearchQuery: string;
  dateFilterType: DateFilterType;
  dateRange: DateRange | undefined;
  // 新增：分组状态
  groupBy: GroupByType;
}

export interface TaskFilterActions {
  setSearchQuery: (query: string) => void;
  setDateFilterType: (type: DateFilterType) => void;
  setDateRange: (range: DateRange | undefined) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
  // 新增：分组操作
  setGroupBy: (groupBy: GroupByType) => void;
}

export function useTaskFilters(): TaskFilters & TaskFilterActions {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('created_at');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  // 新增：分组状态
  const [groupBy, setGroupBy] = useState<GroupByType>('none');

  // 防抖处理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setDateRange(undefined);
    // 清除分组时重置为 'none'
    setGroupBy('none');
  };

  const hasActiveFilters = Boolean(searchQuery || dateRange?.from || groupBy !== 'none');

  return {
    // State
    searchQuery,
    debouncedSearchQuery,
    dateFilterType,
    dateRange,
    groupBy,
    // Actions
    setSearchQuery,
    setDateFilterType,
    setDateRange,
    clearAllFilters,
    hasActiveFilters,
    setGroupBy,
  };
}
