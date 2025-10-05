import { zodResolver } from '@hookform/resolvers/zod';
import { FileImage } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { TextArea } from '@/components/ui/TextArea';
import { useToast } from '@/components/ui/use-toast';
import { getFileDisplayName, isSpecialImageFile } from '@/utils/fileUtils';

import { useCreateSubtaskMutation } from '../Subtask/useSubtask';

// Define the Zod schema for form validation
const MAX_FILE_SIZE = 1000 * 1024 * 1024; // 1000MB

const createSubtaskSchema = z.object({
  name: z.string().min(1, { message: 'サブタスク名は必須です。' }),
  description: z.string().optional(),
  mediaFile: z
    .instanceof(FileList)
    .refine((files) => files?.length === 1, 'ファイルを選択してください。')
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, 'ファイルサイズは最大100MBです。')
    .refine((files) => {
      const file = files?.[0];
      if (!file) {
        return false;
      }
      // Accept all image and video types, plus AI and PSD files
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isAIFile =
        file.type === 'application/postscript' ||
        file.type === 'application/illustrator' ||
        file.name.toLowerCase().endsWith('.ai');
      return isImage || isVideo || isAIFile;
    }, 'サポートされていないファイル形式です。画像、ビデオ、またはAIファイルを選択してください。'),
});

type CreateSubtaskFormValues = z.infer<typeof createSubtaskSchema>;

interface CreateSubtaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  taskId: string;
  projectId: string; // projectId is passed but not directly used in this component yet, might be for the hook if needed later
  onSuccess?: () => void;
}

export function CreateSubtaskDialog({
  isOpen,
  onOpenChange,
  taskId,
  // projectId,
  onSuccess,
}: CreateSubtaskDialogProps): React.ReactElement {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const createSubtaskMutation = useCreateSubtaskMutation(); // Instantiate the hook

  const form = useForm<CreateSubtaskFormValues>({
    resolver: zodResolver(createSubtaskSchema),
    defaultValues: {
      name: '',
      description: '',
      mediaFile: undefined,
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!isSpecialImageFile(file)) {
        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);
      } else {
        setImagePreview(null);
      }
    } else {
      setSelectedFile(null);
      setImagePreview(null);
    }
  };

  const resetDialog = useCallback(() => {
    form.reset();
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setSelectedFile(null);
  }, [form, imagePreview]);

  const onSubmit = async (values: CreateSubtaskFormValues): Promise<void> => {
    if (!values.mediaFile || values.mediaFile.length === 0) {
      // This check might be redundant due to Zod validation but kept as a safeguard
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: 'ファイルを選択してください。',
      });
      return;
    }
    const selectedFile = values.mediaFile[0];

    // Determine task type based on file type
    const isVideo = selectedFile.type.startsWith('video/');
    const taskType = isVideo ? 'video' : 'picture';

    // 创建标准的FormData对象
    const formData = new FormData();

    // 使用新的API格式
    formData.append('name', values.name);
    formData.append('task_type_str', taskType);
    formData.append('file', selectedFile);

    if (values.description) {
      formData.append('description', values.description);
    }

    toast({ title: '送信中...', description: 'サブタスクを作成しています。' });

    try {
      // FormData会自动设置正确的Content-Type和boundary
      await createSubtaskMutation.mutateAsync({ taskId, formData });
      toast({ title: '成功', description: 'サブタスクが正常に作成されました。' });
      resetDialog();
      onOpenChange(false);
      onSuccess?.(); // Trigger onSuccess callback to refresh data or perform other actions
    } catch (error) {
      console.error('Failed to create subtask:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました。';
      toast({
        variant: 'destructive',
        title: '作成失敗',
        description: `サブタスクの作成に失敗しました: ${errorMessage}`,
      });
    }
  };

  useEffect(() => {
    if (!isOpen) {
      resetDialog();
    }
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [isOpen, resetDialog, imagePreview]);

  let previewContent: React.ReactNode = null;
  if (selectedFile && isSpecialImageFile(selectedFile)) {
    previewContent = (
      <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-md">
        <FileImage className="h-12 w-12 text-muted-foreground mb-3" />
        <span className="text-sm font-medium text-center">{getFileDisplayName(selectedFile.name, 30)}</span>
        <span className="text-xs text-muted-foreground mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
      </div>
    );
  } else if (imagePreview) {
    previewContent = <img src={imagePreview} alt="画像プレビュー" className="w-auto max-h-48 rounded-md" />;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>サブタスクを新規作成</DialogTitle>
          <DialogDescription>新しい画像サブタスクを作成します。必須項目を入力してください。</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            void form.handleSubmit(onSubmit)(e);
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="name">
              サブタスク名 <span className="text-destructive">*</span>
            </Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="mediaFile">
              ファイル <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mediaFile"
              type="file"
              accept="image/*,video/*,.ai"
              {...form.register('mediaFile', {
                onChange: handleImageChange,
              })}
            />
            {form.formState.errors.mediaFile && (
              <p className="mt-1 text-sm text-destructive">
                {typeof form.formState.errors.mediaFile.message === 'string'
                  ? form.formState.errors.mediaFile.message
                  : 'ファイルに関するエラーがあります。'}
              </p>
            )}
          </div>

          {(imagePreview || selectedFile) && <div className="p-2 mt-2 rounded-md border">{previewContent}</div>}

          <div>
            <Label htmlFor="description">説明</Label>
            <TextArea id="description" {...form.register('description')} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createSubtaskMutation.isPending}
            >
              キャンセル
            </Button>
            {/* Update disabled state and button text based on mutation status */}
            <Button
              type="submit"
              disabled={!form.formState.isValid || form.formState.isSubmitting || createSubtaskMutation.isPending}
            >
              {createSubtaskMutation.isPending ? '作成中...' : '作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
