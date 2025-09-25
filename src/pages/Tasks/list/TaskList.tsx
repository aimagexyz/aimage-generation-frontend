import 'react-day-picker/style.css';

import clsx from 'clsx';
import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { FaArrowDown, FaArrowUp } from 'react-icons/fa';
import { LuCalendarDays, LuDownload, LuPresentation, LuSearch, LuTrash2 } from 'react-icons/lu';
import { Link } from 'react-router-dom';

import { TaskTagsDisplay } from '@/components/TaskTagsDisplay';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { Badge } from '@/components/ui/Badge';
import { BatchReviewModal } from '@/components/ui/BatchReviewModal';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { Input } from '@/components/ui/Input';
import { PaginationComponent } from '@/components/ui/Pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { UserAvatarNameLabel } from '@/components/UserAvatarNameLabel';
import { useDeleteTask } from '@/hooks/useDeleteTask';
import { groupBy as groupByFn } from '@/utils/groupBy';

import { useExportPptx } from '../hooks/useExportPptx';
import { useTaskFilters } from '../hooks/useTaskFilters';
import { type TaskSortKey, useTasks } from '../hooks/useTasks';
import { TaskStatus } from '../TaskStatus';
import { type ColumnKey, DEFAULT_COLUMNS } from './components/ColumnManager';
import { EditableDueDate } from './components/EditableDueDate';
import { FilterBadges } from './components/FilterBadges';
import { type EnhancedTask, enhanceTaskWithMockData, formatDateLong } from './components/MockDataGenerator';
import { TaskThumbnailPreview } from './components/TaskThumbnailPreview';

type Props = {
  projectId: string;
};

export function TaskList({ projectId }: Readonly<Props>) {
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  // 允许用户选择每页数量，默认 20，持久化到 localStorage
  const [pageSize, setPageSize] = useState<number>(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('tasks_page_size') : null;
    const parsed = stored ? Number(stored) : 20;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
  });

  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>(undefined);
  const [tagFilter, setTagFilter] = useState<string | undefined>(undefined);

  const {
    tasks,
    handleSort,
    currentSortKey,
    currentSortOrder,
    taskPriorities,
    taskStatuses,
    totalTasks,
    totalPages,
    isTasksLoading,
    pageSize: apiPageSize,
  } = useTasks({
    projectId,
    page: currentPage,
    size: pageSize,
    statusId: statusFilter,
    priorityId: priorityFilter,
    // assigneeId: assigneeFilter,
  });

  const { mutate: exportPptx, exportingTaskId: exportingPptxId } = useExportPptx();
  const { mutate: deleteTask, isPending: isDeletingTask } = useDeleteTask();

  const [visibleColumns] = useState<ColumnKey[]>([
    'select',
    'id',
    'name',
    'thumbnail',
    'status',
    'tags',
    'assignee',
    'created_at',
    'due_date',
    'download',
  ]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // DRY: Reuse existing modal state pattern
  const [isBatchReviewModalOpen, setIsBatchReviewModalOpen] = useState(false);

  // Batch operation states
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  // 使用筛选状态管理Hook
  const {
    searchQuery,
    debouncedSearchQuery,
    dateFilterType,
    dateRange,
    groupBy,
    setSearchQuery,
    setDateRange,
    setGroupBy,
    clearAllFilters,
  } = useTaskFilters();

  // 滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 自定义清除所有筛选器函数
  const handleClearAllFilters = () => {
    clearAllFilters(); // 清除搜索和日期筛选
    setStatusFilter(undefined);
    setPriorityFilter(undefined);
  };

  // 筛选条件变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, tagFilter]);

  // 每页数量变化时重置页码并持久化
  useEffect(() => {
    setCurrentPage(1);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('tasks_page_size', String(pageSize));
      }
    } catch {
      // ignore storage errors
    }
  }, [pageSize]);

  // 处理滚动指示器显示
  const handleScrollIndicators = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const leftIndicator = document.getElementById('scroll-indicator-left');
    const rightIndicator = document.getElementById('scroll-indicator-right');

    if (leftIndicator) {
      leftIndicator.style.opacity = scrollLeft > 0 ? '1' : '0';
    }

    if (rightIndicator) {
      rightIndicator.style.opacity = scrollLeft < scrollWidth - clientWidth ? '1' : '0';
    }
  }, []);

  // 监听滚动事件
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    // 初始化指示器状态
    handleScrollIndicators();

    // 添加滚动监听
    container.addEventListener('scroll', handleScrollIndicators);

    // 添加窗口大小变化监听
    window.addEventListener('resize', handleScrollIndicators);

    return () => {
      container.removeEventListener('scroll', handleScrollIndicators);
      window.removeEventListener('resize', handleScrollIndicators);
    };
  }, [handleScrollIndicators]);

  // 自定义日期选择处理函数
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      return;
    }
    // 如果已经有完整的日期范围，点击任何日期都清空并重新开始
    if (dateRange?.from && dateRange?.to) {
      setDateRange({ from: date, to: undefined });
      return;
    }
    // 如果没有选择任何日期，设置为开始日期
    if (!dateRange?.from) {
      setDateRange({ from: date, to: undefined });
      return;
    }
    // 如果只有开始日期，根据新点击的日期位置决定范围
    const existingDate = dateRange.from;
    if (date < existingDate) {
      // 新日期更早，设置为开始日期
      setDateRange({ from: date, to: existingDate });
    } else if (date > existingDate) {
      // 新日期更晚，设置为结束日期
      setDateRange({ from: existingDate, to: date });
    } else {
      // 点击同一个日期，创建单日范围
      setDateRange({ from: date, to: date });
    }
  };

  const enhancedTasks = useMemo(() => {
    return tasks?.map((task) => enhanceTaskWithMockData(task)) || [];
  }, [tasks]);

  // 搜索过滤逻辑 - 注意：现在只在当前页的数据中搜索
  const filteredTasks = useMemo(() => {
    let tempTasks = [...enhancedTasks];

    // Date filter
    const currentRange = dateRange;
    if (currentRange?.from || currentRange?.to) {
      const { from, to } = currentRange;
      const start = from ? new Date(from) : null;
      if (start) {
        start.setHours(0, 0, 0, 0);
      }

      const end = to ? new Date(to) : null;
      if (end) {
        end.setHours(23, 59, 59, 999);
      }

      tempTasks = tempTasks.filter((task) => {
        const taskDateValue = task[dateFilterType];
        if (!taskDateValue) {
          return false;
        }

        const taskDate = new Date(taskDateValue);

        return (!start || taskDate >= start) && (!end || taskDate <= end);
      });
    }

    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      tempTasks = tempTasks.filter((task) => {
        // 搜索ID（包含tid）
        const idMatch = task.tid.toLowerCase().includes(query) || task.id.toLowerCase().includes(query);

        // 搜索任务名称
        const nameMatch = task.name.toLowerCase().includes(query);

        // 搜索描述
        const descriptionMatch = task.description?.toLowerCase().includes(query) || false;

        return idMatch || nameMatch || descriptionMatch;
      });
    }

    // Tag filter (client-side)
    if (tagFilter && tagFilter !== 'all') {
      const tagQuery = tagFilter.toLowerCase();
      tempTasks = tempTasks.filter((task) => (task.tags || []).some((t) => t.name.toLowerCase() === tagQuery));
    }

    return tempTasks;
  }, [enhancedTasks, debouncedSearchQuery, dateFilterType, dateRange, tagFilter]);

  // 分组逻辑
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') {
      return { none: filteredTasks };
    }

    if (groupBy === 'assignee') {
      return groupByFn(filteredTasks, (task) => {
        return task.assignee?.display_name || '未割り当て';
      });
    }

    if (groupBy === 'tag') {
      // Build group by tag name; tasks without tags go to 'タグなし'
      const groups = groupByFn(filteredTasks, (task) => {
        if (!task.tags || task.tags.length === 0) {
          return 'タグなし';
        }
        // Group multi-tagged tasks under each tag by duplicating references flattened afterwards
        // Here we return first tag for grouping key to keep table stable; alternative is expanding rows per tag
        return task.tags[0]?.name || 'タグなし';
      });
      return groups;
    }

    return { none: filteredTasks };
  }, [filteredTasks, groupBy]);

  const visibleColumnConfigs = DEFAULT_COLUMNS.filter((col) => visibleColumns.includes(col.key));
  const columnCount = visibleColumns.length;

  const toggleSelect = (taskId: string) => {
    setSelectedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    setSelectedTasks((prev) => {
      if (prev.size === filteredTasks.length) {
        return new Set();
      }
      return new Set(filteredTasks.map((t) => t.id));
    });
  };

  const handleExportPptx = (taskId: string) => {
    const task = tasks?.find((t) => t.id === taskId);
    if (!task) {
      return;
    }
    exportPptx({ taskId, fileName: `${task.tid}_${task.name}.pptx` });
  };

  // KISS: Simple delete handlers with confirmation
  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
  };

  const confirmDeleteTask = () => {
    if (!taskToDelete) {
      return;
    }

    deleteTask(taskToDelete, {
      onSettled: () => setTaskToDelete(null),
    });
  };

  // Batch download handler
  const handleBatchDownload = async () => {
    if (selectedTasks.size === 0) {
      return;
    }

    setIsBatchDownloading(true);
    const selectedTaskIds = Array.from(selectedTasks);

    try {
      // Download each PPTX file sequentially
      for (const taskId of selectedTaskIds) {
        const task = tasks?.find((t) => t.id === taskId);
        if (task) {
          // Use the existing export function
          await new Promise<void>((resolve) => {
            exportPptx(
              { taskId, fileName: `${task.tid}_${task.name}.pptx` },
              {
                onSettled: () => resolve(),
              },
            );
          });
          // Small delay between downloads to avoid overwhelming the server
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } finally {
      setIsBatchDownloading(false);
    }
  };

  // Batch delete handler
  const handleBatchDelete = async () => {
    if (selectedTasks.size === 0) {
      return;
    }

    setIsBatchDeleting(true);
    const selectedTaskIds = Array.from(selectedTasks);

    try {
      // Delete each task sequentially
      for (const taskId of selectedTaskIds) {
        await new Promise<void>((resolve) => {
          deleteTask(taskId, {
            onSettled: () => resolve(),
          });
        });
      }
      // Clear selection after successful deletion
      setSelectedTasks(new Set());
    } finally {
      setIsBatchDeleting(false);
      setShowBatchDeleteConfirm(false);
    }
  };

  const renderSortIcon = (columnKey: TaskSortKey) => {
    if (currentSortKey === columnKey) {
      return currentSortOrder === 'asc' ? (
        <FaArrowUp className="ml-1 size-2.5" />
      ) : (
        <FaArrowDown className="ml-1 size-2.5" />
      );
    }
    return null;
  };

  // 处理分页变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const dateDisplay = useMemo(() => {
    if (!dateRange?.from) {
      return 'Date';
    }
    if (dateRange.to) {
      return `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`;
    }
    return format(dateRange.from, 'MMM d');
  }, [dateRange]);

  // KISS: Extract task row rendering to reduce nesting
  const renderTaskRow = (task: EnhancedTask): JSX.Element[] => {
    const rows: JSX.Element[] = [];

    // 主要任务行
    rows.push(
      <TableRow key={task.id} className="hover:bg-muted/50">
        {visibleColumnConfigs.map((column) => (
          <TableCell key={column.key} className={clsx(column.width, column.key === 'name' ? '' : 'whitespace-nowrap')}>
            {renderCellContent(task, column.key)}
          </TableCell>
        ))}
      </TableRow>,
    );

    return rows;
  };

  // KISS: Extract table body rendering to fix linter issues
  const renderTableBody = (): JSX.Element[] => {
    // KISS: Simple loading state with skeleton rows
    if (isTasksLoading) {
      return Array.from({ length: 5 }, (_, index) => (
        <TableRow key={`skeleton-${index}`}>
          {visibleColumnConfigs.map((column) => (
            <TableCell key={column.key} className={clsx(column.width)}>
              <Skeleton className="h-6 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ));
    }

    // KISS: Simple empty state handling
    if (filteredTasks.length === 0) {
      const hasFilters = searchQuery || dateRange?.from || groupBy !== 'none';
      const emptyMessage = hasFilters ? 'フィルター条件に一致するタスクがありません。' : 'タスクがありません。';

      return [
        <TableRow key="empty-state">
          <TableCell colSpan={columnCount} className="h-24 text-center">
            {emptyMessage}
          </TableCell>
        </TableRow>,
      ];
    }

    // KISS: Return main task list content
    const allRows: JSX.Element[] = [];

    Object.entries(groupedTasks).forEach(([groupKey, tasks]) => {
      // 分组标题行 - 仅在有分组时显示
      if (groupBy !== 'none') {
        allRows.push(
          <TableRow key={`group-${groupKey}`} className="bg-muted/30">
            <TableCell colSpan={columnCount} className="font-semibold text-sm py-3 px-4">
              <div className="flex items-center gap-2">
                {groupBy === 'assignee' && groupKey !== '未割り当て' ? (
                  <>
                    <UserAvatarNameLabel
                      userId={tasks[0]?.assignee?.id || ''}
                      userName={tasks[0]?.assignee?.display_name}
                      userAvatar={tasks[0]?.assignee?.avatar_url}
                      className="text-sm font-semibold"
                      size="small"
                    />
                    <span className="text-muted-foreground">({tasks.length}件)</span>
                  </>
                ) : (
                  <>
                    <span>{groupKey}</span>
                    <span className="text-muted-foreground">({tasks.length}件)</span>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>,
        );
      }

      // 分组内的任务行
      tasks.forEach((task) => {
        allRows.push(...renderTaskRow(task));
      });
    });

    return allRows;
  };

  // Render cell content with clean Notion-like styling
  const renderCellContent = (task: EnhancedTask, columnKey: ColumnKey): JSX.Element => {
    switch (columnKey) {
      case 'select':
        return (
          <Checkbox
            checked={selectedTasks.has(task.id)}
            onCheckedChange={() => toggleSelect(task.id)}
            className="border-gray-300"
          />
        );

      case 'id':
        return (
          <Link
            to={`/projects/${projectId}/tasks/${task.id}`}
            className="text-xs font-mono text-blue-600 hover:text-blue-800 hover:underline"
          >
            {task.tid.slice(-4)}
          </Link>
        );

      case 'thumbnail':
        return (
          <div className="text-center">
            <TaskThumbnailPreview taskId={task.id} />
          </div>
        );

      case 'name':
        return (
          <div className="space-y-1">
            <Link
              to={`/projects/${projectId}/tasks/${task.id}`}
              className="font-medium text-gray-900 hover:text-blue-600 hover:underline block line-clamp-2"
              title={task.name}
            >
              {task.name}
            </Link>
            {task.description && (
              <p className="text-sm text-gray-500 line-clamp-2" title={task.description}>
                {task.description}
              </p>
            )}
          </div>
        );

      case 'status':
        return <TaskStatus projectId={projectId} taskId={task.id} statusId={task.status_id} />;

      case 'tags': {
        const convertedTags = (task.tags || []).map((tag) => ({
          id: tag.id,
          name: tag.name,
          project_id: tag.project.id,
          created_at: tag.created_at,
          updated_at: tag.updated_at,
        }));
        return <TaskTagsDisplay taskId={task.id} projectId={projectId} tags={convertedTags} maxDisplay={2} />;
      }

      case 'assignee':
        return task.assignee ? (
          <UserAvatarNameLabel
            userId={task.assignee.id}
            userName={task.assignee.display_name}
            userAvatar={task.assignee.avatar_url}
            className="text-sm"
            size="small"
          />
        ) : (
          <span className="text-sm text-gray-400">Unassigned</span>
        );

      case 'priority': {
        const priority = taskPriorities?.find((p) => p.id === task.priority_id);
        if (!priority) {
          return <span className="text-sm text-gray-400">-</span>;
        }

        const priorityColors = {
          高: 'bg-red-100 text-red-700 border-red-200',
          中: 'bg-yellow-100 text-yellow-700 border-yellow-200',
          低: 'bg-green-100 text-green-700 border-green-200',
        };

        return (
          <Badge
            variant="outline"
            className={`text-xs ${priorityColors[priority.name as keyof typeof priorityColors] || 'bg-gray-100 text-gray-700'}`}
          >
            {priority.name}
          </Badge>
        );
      }

      case 'created_at':
        return <span className="text-sm text-gray-600">{formatDateLong(task.created_at)}</span>;

      case 'due_date':
        return <EditableDueDate taskId={task.id} dueDate={task.due_date} />;

      case 'download': {
        const isExporting = exportingPptxId === task.id;
        const isDeleting = isDeletingTask && taskToDelete === task.id;
        return (
          <div className="flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-3 text-sm border-gray-200" disabled={isExporting}>
                  {isExporting ? (
                    <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />
                  ) : (
                    <LuDownload className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExportPptx(task.id)}>
                  <LuPresentation className="mr-2 h-4 w-4" />
                  PPTX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* KISS: Simple delete button with confirmation */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-sm border-gray-200 text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={isDeleting || isExporting}
                  onClick={() => handleDeleteTask(task.id)}
                >
                  {isDeleting ? (
                    <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />
                  ) : (
                    <LuTrash2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>タスクを削除</p>
              </TooltipContent>
            </Tooltip>
          </div>
        );
      }

      default:
        return <span className="text-sm text-gray-400">-</span>;
    }
  };

  useEffect(() => {
    setSelectedTasks(new Set());
  }, [currentPage]);

  return (
    <div className="max-w-full mx-auto space-y-3">
      {/* Compact Filter Section - Single Row */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <LuSearch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm bg-background border-input hover:border-muted-foreground/50 focus:border-primary transition-colors"
          />
        </div>

        {/* Filters - All in one row */}
        <div className="flex items-center gap-1.5">
          {/* Status Filter */}
          <Select
            value={statusFilter || 'all'}
            onValueChange={(value) => setStatusFilter(value === 'all' ? undefined : value)}
          >
            <SelectTrigger
              className={clsx('h-8 text-xs transition-all', statusFilter ? 'bg-primary/10 border-primary/30' : '')}
            >
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {taskStatuses?.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select
            value={priorityFilter || 'all'}
            onValueChange={(value) => setPriorityFilter(value === 'all' ? undefined : value)}
          >
            <SelectTrigger
              className={clsx('h-8 text-xs transition-all', priorityFilter ? 'bg-orange-50 border-orange-300' : '')}
            >
              <SelectValue placeholder="全優先度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全優先度</SelectItem>
              {taskPriorities?.map((priority) => (
                <SelectItem key={priority.id} value={priority.id}>
                  {priority.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Page Size */}
          <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="h-8 w-[90px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {([20, 50, 100] as const).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}/ページ
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tag Filter */}
          <Select
            value={tagFilter || 'all'}
            onValueChange={(value) => setTagFilter(value === 'all' ? undefined : value)}
          >
            <SelectTrigger
              className={clsx('h-8 text-xs transition-all', tagFilter ? 'bg-green-50 border-green-300' : '')}
            >
              <SelectValue placeholder="全タグ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全タグ</SelectItem>
              {Array.from(
                new Set(
                  enhancedTasks
                    .flatMap((t) => t.tags || [])
                    .map((tg) => tg.name)
                    .filter((n): n is string => Boolean(n)),
                ),
              )
                .sort((a, b) => a.localeCompare(b, 'ja'))
                .map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {/* Group By */}
          <Select value={groupBy} onValueChange={(value) => setGroupBy(value as 'none' | 'assignee' | 'tag')}>
            <SelectTrigger
              className={clsx('h-8 text-xs transition-all', groupBy !== 'none' ? 'bg-purple-50 border-purple-300' : '')}
            >
              <SelectValue placeholder="グループなし" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">グループなし</SelectItem>
              <SelectItem value="assignee">担当者別</SelectItem>
              <SelectItem value="tag">タグ別</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={clsx('h-8 px-2 text-xs', dateRange?.from ? 'bg-blue-50 border-blue-300' : '')}
              >
                <LuCalendarDays className="mr-1 h-3 w-3" />
                {dateDisplay}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DayPicker mode="single" selected={dateRange?.from} onSelect={handleDateSelect} className="p-3" />
            </PopoverContent>
          </Popover>
        </div>

        {/* Task Count - Moved to the end */}
        <div className="ml-auto text-xs text-muted-foreground font-medium">
          Total: <span className="font-semibold text-foreground">{totalTasks || 0} tasks</span>
          {selectedTasks.size > 0 && <span className="ml-2 text-blue-600">• {selectedTasks.size} selected</span>}
        </div>
      </div>

      {/* Enhanced Selection Counter with Batch Processing - KISS: Simple extension of existing UI */}
      {selectedTasks.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-900">{selectedTasks.size}件のタスクが選択されています</span>
          <div className="flex gap-2">
            {/* Batch Download Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleBatchDownload()}
              className="h-8 px-3 text-sm border-blue-200 text-blue-700 hover:bg-blue-100"
              disabled={isBatchDownloading || selectedTasks.size === 0}
            >
              {isBatchDownloading ? (
                <AiOutlineLoading3Quarters className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <LuDownload className="mr-2 h-3 w-3" />
              )}
              一括ダウンロード
            </Button>

            {/* Batch Delete Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBatchDeleteConfirm(true)}
              className="h-8 px-3 text-sm border-red-200 text-red-600 hover:bg-red-50"
              disabled={isBatchDeleting || selectedTasks.size === 0}
            >
              {isBatchDeleting ? (
                <AiOutlineLoading3Quarters className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <LuTrash2 className="mr-2 h-3 w-3" />
              )}
              一括削除
            </Button>

            {/* DRY: Reuse existing button patterns */}
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsBatchReviewModalOpen(true)}
              className="h-8 px-3 text-sm"
            >
              バッチレビュー
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTasks(new Set())}
              className="h-8 px-3 text-sm text-blue-700 hover:text-blue-900"
            >
              選択解除
            </Button>
          </div>
        </div>
      )}

      {/* 活跃筛选条件标签行 */}
      <FilterBadges
        searchQuery={searchQuery}
        dateRange={dateRange}
        dateFilterType={dateFilterType}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        tagFilter={tagFilter}
        groupBy={groupBy}
        // assigneeFilter={assigneeFilter}
        taskStatuses={taskStatuses}
        taskPriorities={taskPriorities}
        onClearSearch={() => setSearchQuery('')}
        onClearDateRange={() => setDateRange(undefined)}
        onClearStatus={() => setStatusFilter(undefined)}
        onClearPriority={() => setPriorityFilter(undefined)}
        onClearTag={() => setTagFilter(undefined)}
        onClearGroupBy={() => setGroupBy('none')}
        // onClearAssignee={() => setAssigneeFilter(undefined)}
        onClearAll={handleClearAllFilters}
      />

      {/* 移动端统计信息 */}
      <div className="sm:hidden text-sm text-muted-foreground px-2">
        {totalTasks ? (
          <>
            全 {totalTasks} 件中 {Math.min((currentPage - 1) * (apiPageSize || pageSize) + 1, totalTasks)} -{' '}
            {Math.min(currentPage * (apiPageSize || pageSize), totalTasks)} 件を表示
            {filteredTasks.length !== enhancedTasks.length && (
              <span className="ml-2">(フィルター後: {filteredTasks.length} 件)</span>
            )}
          </>
        ) : (
          '読み込み中...'
        )}
      </div>

      {/* Clean Table - Notion Style */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white" ref={scrollContainerRef}>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 bg-gray-50/50">
              {visibleColumnConfigs.map((column) => (
                <TableHead
                  key={column.key}
                  className={clsx(
                    column.width,
                    'h-10 px-4 text-xs font-medium text-gray-600 border-0',
                    column.sortable && 'cursor-pointer hover:text-gray-900',
                  )}
                  onClick={column.sortable ? () => handleSort(column.key as TaskSortKey) : undefined}
                >
                  {column.key === 'select' ? (
                    <Checkbox
                      checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                      onCheckedChange={toggleAll}
                      className="border-gray-300"
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      {column.label}
                      {column.sortable && renderSortIcon(column.key as TaskSortKey)}
                    </div>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{renderTableBody()}</TableBody>
        </Table>
      </div>

      {/* 分页组件 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {Math.min((currentPage - 1) * (apiPageSize || pageSize) + 1, totalTasks)} to{' '}
            {Math.min(currentPage * (apiPageSize || pageSize), totalTasks)} of {totalTasks} tasks
          </p>
          <PaginationComponent currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      )}

      {/* DRY: Reuse existing modal patterns - Batch Review Modal */}
      <BatchReviewModal
        isOpen={isBatchReviewModalOpen}
        onClose={() => setIsBatchReviewModalOpen(false)}
        selectedTaskIds={Array.from(selectedTasks)}
        projectId={projectId}
      />

      {/* Confirmation Dialog for Task Deletion */}
      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>タスクを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻すことができません。タスクは完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{selectedTasks.size}件のタスクを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻すことができません。選択されたすべてのタスクが完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleBatchDelete()}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={isBatchDeleting}
            >
              {isBatchDeleting ? (
                <>
                  <AiOutlineLoading3Quarters className="mr-2 h-4 w-4 animate-spin" />
                  削除中...
                </>
              ) : (
                '削除する'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
