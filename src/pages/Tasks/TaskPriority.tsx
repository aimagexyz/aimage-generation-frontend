import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from '@/components/ui/Select';

import { useTaskMetadata } from './hooks/useTasks';

type Props = {
  projectId: string;
  taskId: string;
  priorityId: string | undefined | null; // 支持undefined和null值
};

export function TaskPriority(props: Props) {
  const { taskId, priorityId } = props;

  const { getTaskPriority, taskPriorities, updateTaskPriority } = useTaskMetadata();

  // 如果priorityId为undefined或null，不渲染组件
  if (!priorityId) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        未設定
      </Badge>
    );
  }

  return (
    <Select
      value={priorityId}
      onValueChange={(newPriorityId) => {
        updateTaskPriority(
          { taskId, priorityId: newPriorityId },
          {
            onSuccess: () => {
              // 优先级更新成功后，组件会通过props接收新的priorityId
            },
          },
        );
      }}
    >
      <SelectTrigger className="p-0 border-0 bg-transparent justify-start gap-1 h-full">
        <Badge variant="outline">{getTaskPriority(priorityId)}</Badge>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {taskPriorities?.map((priority) => (
            <SelectItem key={priority.id} value={priority.id}>
              {priority.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
