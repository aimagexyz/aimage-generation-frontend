import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { fetchApi } from '@/api/client';
import type { components } from '@/api/schemas';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { toast } from '@/components/ui/use-toast';

type TaskSimpleOut = components['schemas']['TaskSimpleOut'];

interface CopySubtaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  projectId: string;
  subtaskId: string;
}

export function CopySubtaskDialog({ isOpen, onOpenChange, projectId, subtaskId }: CopySubtaskDialogProps) {
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: tasks, isLoading: isLoadingTasks } = useQuery<TaskSimpleOut[]>({
    queryKey: ['tasks', projectId, 'all'],
    queryFn: () =>
      fetchApi({
        url: `/api/v1/projects/${projectId}/tasks/all` as '/api/v1/projects/{project_id}/tasks/all',
        method: 'get',
      }).then((res) => res.data),
    enabled: isOpen && !!projectId,
  });

  const { mutate: copySubtask, isPending: isCopying } = useMutation({
    mutationFn: (targetTaskId: string) =>
      fetchApi({
        url: `/api/v1/subtasks/${subtaskId}/copy` as '/api/v1/subtasks/{subtask_id}/copy',
        method: 'post',
        data: { target_task_id: targetTaskId },
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    onSuccess: () => {
      toast({
        title: 'コピー完了',
        description: 'サブタスクが正常にコピーされました。',
        variant: 'default',
      });
      // Invalidate queries to refetch task/subtask lists if needed
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['task-subtasks'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'コピーエラー',
        description: `コピーに失敗しました: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleCopy = () => {
    if (selectedTaskId) {
      copySubtask(selectedTaskId);
    } else {
      toast({
        title: '選択エラー',
        description: 'コピー先のタスクを選択してください。',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>サブタスクを別のタスクにコピー</DialogTitle>
          <DialogDescription>このサブタスクをコピーする先のタスクを選択してください。</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select onValueChange={setSelectedTaskId} disabled={isLoadingTasks || isCopying}>
            <SelectTrigger>
              <SelectValue placeholder={isLoadingTasks ? 'タスクを読み込み中...' : 'タスクを選択'} />
            </SelectTrigger>
            <SelectContent>
              {tasks?.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isCopying}>
            キャンセル
          </Button>
          <Button onClick={handleCopy} disabled={!selectedTaskId || isCopying}>
            {isCopying ? 'コピー中...' : 'コピー'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
