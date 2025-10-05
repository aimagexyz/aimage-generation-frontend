import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from '@/components/ui/Select';

import { useTaskMetadata } from './hooks/useTasks';

type Props = {
  projectId: string;
  taskId: string;
  statusId: string | undefined | null; // 支持undefined和null值
};

export function TaskStatus(props: Props) {
  const { taskId, statusId } = props;

  const { getTaskStatus, taskStatuses, updateTaskStatus } = useTaskMetadata();

  // 如果statusId为undefined或null，不渲染组件
  if (!statusId) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        未設定
      </Badge>
    );
  }

  return (
    <Select
      value={statusId}
      onValueChange={(newStatusId) => {
        updateTaskStatus(
          { taskId, statusId: newStatusId },
          {
            onSuccess: () => {
              // 状态更新成功后，组件会通过props接收新的statusId
            },
          },
        );
      }}
    >
      <SelectTrigger className="p-0 border-0 bg-transparent justify-start gap-1 h-full">
        <Badge variant="outline">{getTaskStatus(statusId)}</Badge>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {taskStatuses?.map((status) => (
            <SelectItem key={status.id} value={status.id}>
              {status.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
