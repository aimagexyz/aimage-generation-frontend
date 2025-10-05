import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDate } from 'date-fns';
import { useState } from 'react';
import { LuChevronLeft, LuChevronRight, LuDownload, LuPencil } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';

import { fetchApi } from '@/api/client';
import { updateTaskDetails } from '@/api/tasks';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/Table';
import { toast } from '@/components/ui/use-toast';
import { UserAvatarNameLabel } from '@/components/UserAvatarNameLabel';
import type { TaskUpdatePayload } from '@/types/tasks';

import { useExportPdf } from '../hooks/useExportPdf';
import { useTasks } from '../hooks/useTasks';
import { TaskPriority } from '../TaskPriority';
import { TaskStatus } from '../TaskStatus';
import { EditTaskModal } from './components/EditTaskModal';

type Props = {
  projectId: string;
  taskId: string;
};

export function TaskHeader(props: Props) {
  const { projectId, taskId } = props;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { tasks } = useTasks({ projectId });
  const { mutate: downloadPdf, isPending: isDownloading } = useExportPdf();

  // Main task query
  const { data: task, isError: isTaskError } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () =>
      fetchApi({
        url: `/api/v1/tasks/${taskId}` as '/api/v1/tasks/{task_id}',
        method: 'get',
      }).then((res) => res.data),
    enabled: !!taskId,
  });

  const { mutate: updateTask, isPending: isUpdatingTask } = useMutation({
    mutationFn: (payload: TaskUpdatePayload) => updateTaskDetails(taskId, payload),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Task updated successfully.' });
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      setIsEditModalOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to update task: ${error.message}`, variant: 'destructive' });
    },
  });

  const handleOpenEditModal = () => setIsEditModalOpen(true);
  const handleCloseEditModal = () => setIsEditModalOpen(false);

  const handleSaveTask = (data: TaskUpdatePayload) => {
    if (!task) {
      return;
    }
    updateTask(data);
  };

  const hasPrevTask = !!tasks?.length && tasks[0].id !== taskId;
  const hasNextTask = !!tasks?.length && tasks[tasks.length - 1]?.id !== taskId;

  const handleNavigateTask = (direction: 'prev' | 'next') => {
    if (!tasks?.length) {
      return;
    }
    const currentIndex = tasks.findIndex((task) => task.id === taskId);
    if (direction === 'prev' && !hasPrevTask) {
      return;
    }
    if (direction === 'next' && !hasNextTask) {
      return;
    }
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    const newTaskId = tasks[newIndex].id;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    navigate(`/projects/${projectId}/tasks/${newTaskId}`);
  };

  if (isTaskError) {
    return <div>Error: Task not found</div>;
  }

  if (!task) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col justify-between gap-2">
      <div className="flex gap-2 w-full justify-between">
        <Button
          className="w-full px-1"
          variant="outline"
          size="sm"
          onClick={() => handleNavigateTask('prev')}
          disabled={!hasPrevTask}
        >
          <LuChevronLeft size={16} className="size-4 mr-1" />
          前のタスクへ
        </Button>
        <Button
          className="w-full px-1"
          variant="outline"
          size="sm"
          onClick={() => handleNavigateTask('next')}
          disabled={!hasNextTask}
        >
          次のタスクへ
          <LuChevronRight size={16} className="size-4 ml-1" />
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold">{task.name}</h1>
        <Button variant="outline" size="icon" onClick={handleOpenEditModal} disabled={isUpdatingTask}>
          <LuPencil className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">{task.description}</p>

      <Table>
        <TableBody className="[&_tr]:border-0">
          <TableRow>
            <TableCell className="p-2 px-0 font-semibold">タスクID</TableCell>
            <TableCell className="p-2 whitespace-nowrap break-keep">{task.tid}</TableCell>
          </TableRow>

          <TableRow>
            <TableCell className="p-2 px-0 font-semibold">ステータス</TableCell>
            <TableCell className="p-2">
              <TaskStatus projectId={projectId} taskId={task.id} statusId={task.status_id} />
              {/*               
              <Badge variant="outline" className="whitespace-nowrap break-keep">
                {getTaskStatus(task.status_id)}
              </Badge> */}
            </TableCell>
          </TableRow>

          <TableRow>
            <TableCell className="p-2 px-0 font-semibold">優先度</TableCell>
            <TableCell className="p-2">
              <TaskPriority projectId={projectId} taskId={task.id} priorityId={task.priority_id} />
            </TableCell>
          </TableRow>

          <TableRow>
            <TableCell className="p-2 px-0 font-semibold">担当者</TableCell>
            <TableCell className="p-2">
              <UserAvatarNameLabel
                size="small"
                userId={task?.assignee?.id}
                userName={task?.assignee?.display_name}
                userAvatar={task?.assignee?.avatar_url}
                className="flex items-center"
              />
            </TableCell>
          </TableRow>

          <TableRow>
            <TableCell className="p-2 px-0 font-semibold">作成日時</TableCell>
            <TableCell className="p-2">{formatDate(task.created_at, 'yyyy-MM-dd HH:mm')}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isDownloading} className="w-full">
            <LuDownload className="mr-2 size-3" />
            PDFエクスポート
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem onClick={() => downloadPdf({ taskId: task.id, fileName: `${task.tid}_${task.name}.pdf` })}>
            <LuDownload className="mr-2 h-4 w-4" />
            <span>PDFダウンロード</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditTaskModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} task={task} onSave={handleSaveTask} />
    </div>
  );
}
