import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { ReviewSetOut, ReviewSetUpdate } from '@/api/reviewSetsService';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { useUpdateReviewSet } from '@/hooks/useReviewSets';

// Form validation schema
const reviewSetEditSchema = z.object({
  name: z.string().min(1, 'レビューセット名は必須です').max(100, 'レビューセット名は100文字以内で入力してください'),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional(),
});

type ReviewSetEditFormData = z.infer<typeof reviewSetEditSchema>;

interface ReviewSetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewSet: ReviewSetOut | null;
  onSuccess: () => void;
}

export default function ReviewSetEditModal({ isOpen, onClose, reviewSet, onSuccess }: ReviewSetEditModalProps) {
  // Mutation hook
  const updateReviewSetMutation = useUpdateReviewSet();

  // Form setup
  const form = useForm<ReviewSetEditFormData>({
    resolver: zodResolver(reviewSetEditSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Update form when reviewSet changes
  useEffect(() => {
    if (reviewSet) {
      form.reset({
        name: reviewSet.name,
        description: reviewSet.description || '',
      });
    }
  }, [reviewSet, form]);

  // Form submission handler
  const onSubmit = (data: ReviewSetEditFormData) => {
    if (!reviewSet) {
      return;
    }

    const updateData: ReviewSetUpdate = {
      name: data.name,
      description: data.description || null,
      // Note: We're not updating RPD/character/tag associations in this simplified version
      rpd_ids: null,
      character_ids: null,
      task_tag_ids: null,
    };

    updateReviewSetMutation.mutate(
      { reviewSetId: reviewSet.id, data: updateData },
      {
        onSuccess: () => {
          // Reset form and close modal
          form.reset();
          onClose();
          onSuccess();
        },
        onError: (error) => {
          console.error('Failed to update review set:', error);
        },
      },
    );
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (!reviewSet) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>レビューセットを編集</DialogTitle>
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
                disabled={updateReviewSetMutation.isPending}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={updateReviewSetMutation.isPending}>
                {updateReviewSetMutation.isPending ? '更新中...' : '更新'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
