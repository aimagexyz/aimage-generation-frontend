import { useQueryClient } from '@tanstack/react-query';
import { memo, useState } from 'react';
import {
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuDownload,
  LuInfo,
  LuList,
  LuLoader,
  LuPencil,
  LuPresentation,
} from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';

import type { components } from '@/api/schemas'; // Import TaskOut
import { updateTaskDetails } from '@/api/tasks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/Select';
import { UserAvatarNameLabel } from '@/components/UserAvatarNameLabel';
import type { TaskNavigationItem } from '@/pages/Tasks/hooks/useTasks';

import { useExportPptx } from '../../hooks/useExportPptx';
import { TaskStatus } from '../../TaskStatus'; // Adjust path as necessary
import { EditTaskModal } from './EditTaskModal';

type TaskOut = components['schemas']['TaskOut']; // Define TaskOut

// Props type for TaskNavigationBar
interface TaskNavigationBarProps {
  projectId: string;
  taskId: string;
  task: TaskOut | undefined; // Accept task as a prop
  allTasks: TaskNavigationItem[] | undefined; // Accept navigation tasks as a prop
  totalTasks?: number; // Total tasks count from API
  isTaskLoading: boolean; // Accept loading state as a prop
  onNavigateTask: (direction: 'prev' | 'next') => Promise<void>; // New prop for navigation
}

// 任务导航组件
export const TaskNavigationBar = memo(
  ({ projectId, taskId, task, allTasks, totalTasks, isTaskLoading, onNavigateTask }: TaskNavigationBarProps) => {
    const navigate = useNavigate();
    const [showTaskDetails, setShowTaskDetails] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const queryClient = useQueryClient();

    // Export hooks
    const { mutate: exportPptx, exportingTaskId: exportingPptxId } = useExportPptx();

    const handleTaskSelect = async (selectedTaskId: string) => {
      if (selectedTaskId !== taskId) {
        await navigate(`/projects/${projectId}/tasks/${selectedTaskId}`);
      }
    };

    const handleOpenEditModal = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent task select dropdown from opening
      setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
      setIsEditModalOpen(false);
    };

    const handleSaveChanges = async (data: import('@/types/tasks').TaskUpdatePayload) => {
      if (!task) {
        return;
      }
      try {
        await updateTaskDetails(task.id, data);
        await queryClient.invalidateQueries({ queryKey: ['task', task.id] });
        await queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }); // To update task list if name changed
        setIsEditModalOpen(false);
      } catch (error) {
        console.error('Failed to update task:', error);
        // Optionally, show an error toast to the user
      }
    };

    const toggleTaskDetails = () => {
      setShowTaskDetails(!showTaskDetails);
    };

    // Export handlers
    const handleExportPptx = () => {
      if (!task) {
        return;
      }
      exportPptx({ taskId: task.id, fileName: `${task.tid}_${task.name}.pptx` });
    };

    // Get current task index for display
    const currentTaskIndex = allTasks?.findIndex((t) => t.id === taskId) ?? -1;
    const totalTasksCount = totalTasks ?? allTasks?.length ?? 0;

    const hasPrevTask = currentTaskIndex > 0;
    const hasNextTask = totalTasksCount > 0 && currentTaskIndex < totalTasksCount - 1;

    // Display loading or task name
    const taskNameDisplay = isTaskLoading ? 'Loading...' : task?.name || 'タスク詳細';
    const taskTidDisplay = isTaskLoading ? '...' : task?.tid || '';

    return (
      <>
        <div className="flex justify-between items-center px-3 py-2.5 border-b bg-gradient-to-r from-muted/5 via-background to-muted/5">
          {/* Previous Task Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              void onNavigateTask('prev');
            }}
            disabled={!hasPrevTask || isTaskLoading}
            className="h-8 w-8 p-0 flex-shrink-0"
            title="前のタスクへ"
          >
            <LuChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
            {totalTasksCount > 0 && !isTaskLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/20 px-2 py-1 rounded-md border border-border/30 flex-shrink-0">
                <span className="font-semibold text-primary">{currentTaskIndex + 1}</span>
                <span className="text-muted-foreground/60">/</span>
                <span className="font-medium">{totalTasksCount}</span>
              </div>
            )}
            <Select
              value={taskId}
              onValueChange={(value) => {
                void handleTaskSelect(value);
              }}
              disabled={isTaskLoading}
            >
              <SelectTrigger asChild>
                <button className="flex items-center gap-2 min-w-0 group hover:bg-muted/30 rounded-md px-2 py-1.5 transition-all duration-200 cursor-pointer border border-transparent hover:border-border/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                      {taskNameDisplay}
                    </h3>
                    <Badge
                      variant="outline"
                      className="text-xs flex-shrink-0 bg-primary/5 border-primary/20 text-primary group-hover:bg-primary/10 transition-colors"
                    >
                      {taskTidDisplay}
                    </Badge>
                  </div>
                  <LuChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </button>
              </SelectTrigger>
              <SelectContent align="center" className="max-h-80">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border/30 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span>プロジェクトのタスク一覧</span>
                    <span className="text-primary font-semibold">{totalTasksCount}件</span>
                  </div>
                </div>
                {allTasks?.map((taskItem, index) => (
                  <SelectItem
                    key={taskItem.id}
                    value={taskItem.id}
                    className="flex flex-col items-start py-3 px-3 hover:bg-muted/50 transition-colors duration-150 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 w-full">
                      <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md min-w-[2rem] text-center">
                        {index + 1}
                      </span>
                      <span className="font-medium truncate flex-1 text-sm">{taskItem.name}</span>
                      <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">
                        {taskItem.tid}
                      </Badge>
                      {taskItem.id === taskId && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" title="現在のタスク" />
                      )}
                    </div>
                    {taskItem.description && (
                      <span className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed pl-8">
                        {taskItem.description}
                      </span>
                    )}
                  </SelectItem>
                ))}
                {(!allTasks || allTasks.length === 0) && (
                  <SelectItem value="no-tasks" disabled className="py-4 text-center">
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <LuList className="w-4 h-4 opacity-50" />
                      <span className="text-xs">タスクが見つかりません</span>
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Edit button */}
            <Button
              variant="ghost"
              size="icon"
              className="ml-1 h-7 w-7 p-0 text-muted-foreground hover:text-primary transition-opacity flex-shrink-0"
              onClick={handleOpenEditModal}
              title="タスク名を編集"
              disabled={isTaskLoading || !task}
            >
              <LuPencil className="w-4 h-4" />
            </Button>

            {/* Detail toggle button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTaskDetails}
              className={`h-7 px-2.5 gap-1.5 text-xs transition-all duration-200 flex-shrink-0 ${
                showTaskDetails
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground border border-transparent hover:border-border/30'
              }`}
              title={showTaskDetails ? 'タスク詳細を非表示' : 'タスク詳細を表示'}
              disabled={isTaskLoading || !task}
            >
              <LuInfo className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">詳細</span>
            </Button>

            {/* Export dropdown button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 gap-1.5 text-xs transition-all duration-200 flex-shrink-0 hover:bg-muted/50 text-muted-foreground hover:text-foreground border border-transparent hover:border-border/30"
                  title="タスクをエクスポート"
                  disabled={isTaskLoading || !task || exportingPptxId === taskId}
                >
                  {exportingPptxId === taskId ? (
                    <LuLoader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LuDownload className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">エクスポート</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPptx}>
                  <LuPresentation className="mr-2 h-4 w-4" />
                  <span>PPTX形式で保存</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Next Task Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              void onNavigateTask('next');
            }}
            disabled={!hasNextTask || isTaskLoading}
            className="h-8 w-8 p-0 flex-shrink-0"
            title="次のタスクへ"
          >
            <LuChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {showTaskDetails && !isTaskLoading && task && (
          <div className="px-3 py-3 border-b bg-gradient-to-r from-muted/10 via-muted/5 to-muted/10 text-sm animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[4rem] flex-shrink-0">説明:</span>
                <span className="text-muted-foreground leading-relaxed">{task.description || 'なし'}</span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">ステータス:</span>
                  <TaskStatus projectId={projectId} taskId={taskId} statusId={task?.status_id} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">担当者:</span>
                  <UserAvatarNameLabel
                    size="small"
                    userId={task?.assignee?.id}
                    userName={task?.assignee?.display_name}
                    userAvatar={task?.assignee?.avatar_url}
                    className="inline-flex items-center"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {!isTaskLoading && task && (
          <EditTaskModal
            isOpen={isEditModalOpen}
            onClose={handleCloseEditModal}
            task={task}
            onSave={(data) => {
              void handleSaveChanges(data);
            }}
          />
        )}
      </>
    );
  },
);
TaskNavigationBar.displayName = 'TaskNavigationBar';
