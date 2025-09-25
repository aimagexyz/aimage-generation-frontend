import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LuUpload } from 'react-icons/lu';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { useToast } from '@/components/ui/use-toast';

import { useCreateSubtask } from './hooks/useCreateSubtask';

const MAX_FILE_SIZE = 1000 * 1024 * 1024; // 1000MB (increased for video files)
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/mov', 'video/avi'] as const;
const ACCEPTED_FILE_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES] as const;

const formSchema = z.object({
  name: z.string().min(1, '必須項目です'),
  description: z.string().optional(),
  file: z
    .custom<File>((file): file is File => file instanceof File, 'ファイルを選択してください')
    .refine((file: File) => file.size <= MAX_FILE_SIZE, 'ファイルサイズは1000MB以下にしてください')
    .refine(
      (file: File) => ACCEPTED_FILE_TYPES.includes(file.type as (typeof ACCEPTED_FILE_TYPES)[number]),
      '画像（JPG、PNG、WEBP）または動画（MP4、MOV、AVI）ファイルを選択してください',
    ),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  taskId: string;
  trigger: React.ReactNode;
  onSuccess?: () => void;
};

export function CreateSubtaskDialog({ taskId, trigger, onSuccess }: Props) {
  const { toast } = useToast();
  const { mutateAsync: createSubtask } = useCreateSubtask();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      // Determine task type based on file type
      const isVideo = ACCEPTED_VIDEO_TYPES.includes(values.file.type as (typeof ACCEPTED_VIDEO_TYPES)[number]);
      const taskType = isVideo ? 'video' : 'picture';

      await createSubtask({
        taskId,
        name: values.name,
        description: values.description,
        file: values.file,
        taskType,
      });

      toast({
        title: 'サブタスクを作成しました',
      });

      onSuccess?.();
    } catch (error) {
      console.error('Failed to create subtask:', error);
      toast({
        title: 'エラーが発生しました',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>サブタスクを作成</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>サブタスク名</FormLabel>
                  <FormControl>
                    <Input placeholder="サブタスク名を入力" {...field} />
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
                    <TextArea placeholder="説明を入力" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, value } }) => (
                <FormItem>
                  <FormLabel>ファイル</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = ACCEPTED_FILE_TYPES.join(',');
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              onChange(file);
                            }
                          };
                          input.click();
                        }}
                      >
                        <LuUpload className="mr-2 size-4" />
                        ファイルをアップロード
                      </Button>
                      {value instanceof File && <span className="text-sm text-muted-foreground">{value.name}</span>}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                作成
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
