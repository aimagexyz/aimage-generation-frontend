import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { ReviewSetCreate } from '@/api/reviewSetsService';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { useCreateReviewSet } from '@/hooks/useReviewSets';

// Form validation schema
const reviewSetCreateSchema = z.object({
  name: z.string().min(1, 'レビューセット名は必須です').max(100, 'レビューセット名は100文字以内で入力してください'),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional(),
});

type ReviewSetCreateFormData = z.infer<typeof reviewSetCreateSchema>;

interface ReviewSetCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
}

export default function ReviewSetCreateModal({ isOpen, onClose, projectId, onSuccess }: ReviewSetCreateModalProps) {
  // Mutation hook
  const createReviewSetMutation = useCreateReviewSet();

  // Form setup
  const form = useForm<ReviewSetCreateFormData>({
    resolver: zodResolver(reviewSetCreateSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Form submission handler
  const onSubmit = (data: ReviewSetCreateFormData) => {
    const createData: ReviewSetCreate = {
      name: data.name,
      description: data.description || null,
      project_id: projectId,
      rpd_ids: [],
      character_ids: [],
      task_tag_ids: [],
    };

    createReviewSetMutation.mutate(createData, {
      onSuccess: () => {
        // Reset form and close modal
        form.reset();
        onClose();
        onSuccess();
      },
      onError: (error) => {
        console.error('Failed to create review set:', error);
      },
    });
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>レビューセットを作成</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>レビューセット名 *</FormLabel>
                  <FormControl>
                    <Input placeholder="レビューセット名を入力" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>説明</FormLabel>
                  <FormControl>
                    <TextArea placeholder="レビューセットの説明を入力（任意）" className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createReviewSetMutation.isPending}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={createReviewSetMutation.isPending}>
                {createReviewSetMutation.isPending ? '作成中...' : '作成'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
