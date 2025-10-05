import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';

import { useCreateTask } from '../hooks/useCreateTask';
import { useTasks } from '../hooks/useTasks';

const formSchema = z.object({
  tid: z.string().min(1, { message: 'タスクIDは必須項目です' }),
  name: z.string().min(1, { message: 'タスク名は必須項目です' }),
  description: z.string().min(1, { message: '説明は必須項目です' }),
  assignee_id: z.string().min(1, { message: '担当者は必須項目です' }),
  priority_id: z.string().min(1, { message: '優先度は必須項目です' }),
  project_id: z.string().min(1, { message: 'プロジェクトは必須項目です' }),
  status_id: z.string().min(1, { message: 'ステータスは必須項目です' }),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateTask() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mutateAsync: createTask } = useCreateTask();
  const { taskPriorities, taskStatuses } = useTasks({ projectId });
  const { userInfo } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tid: '',
      name: '',
      description: '',
      assignee_id: userInfo?.id || '',
      priority_id: '',
      project_id: projectId || '',
      status_id: taskStatuses?.[0]?.id || '',
    },
    mode: 'onSubmit',
  });

  const onSubmit = async (values: FormValues) => {
    if (!projectId || !taskStatuses?.[0]) {
      return;
    }

    try {
      await createTask(values);

      toast({
        title: 'タスクを作成しました',
      });

      await navigate(`/projects/${projectId}/tasks`);
    } catch (error) {
      console.error('Failed to create task:', error);
      toast({
        title: 'エラーが発生しました',
        variant: 'destructive',
      });
    }
  };

  if (!taskPriorities || !taskStatuses || !userInfo) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-2xl font-bold mb-8">タスクを作成</h1>

      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit(onSubmit)(e);
          }}
          className="space-y-8"
        >
          <FormField
            control={form.control}
            name="tid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>タスクID</FormLabel>
                <FormControl>
                  <Input placeholder="タスクIDを入力" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>タスク名</FormLabel>
                <FormControl>
                  <Input placeholder="タスク名を入力" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>説明</FormLabel>
                <FormControl>
                  <TextArea placeholder="タスクの説明を入力" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>優先度</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="優先度を選択" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {taskPriorities.map((priority) => (
                      <SelectItem key={priority.id} value={priority.id}>
                        {priority.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                // eslint-disable-next-line sonarjs/void-use
                void navigate(`/projects/${projectId}/tasks`);
              }}
            >
              キャンセル
            </Button>
            <Button type="submit">作成</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default CreateTask;
