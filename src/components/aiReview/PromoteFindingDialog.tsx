import React from 'react';

import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { usePromoteFinding } from '@/hooks/aiReview/usePromoteFinding';
import { type PromoteFindingRequestBody, SharingScope } from '@/types/PromotedFinding';

interface PromoteFindingDialogProps {
  originalFindingId: string;
  aiReviewId: string;
  currentSubtaskId: string;
  children: React.ReactNode;
  onPromotionSuccess?: () => void;
}

export function PromoteFindingDialog({
  originalFindingId,
  aiReviewId,
  currentSubtaskId,
  children,
  onPromotionSuccess,
}: PromoteFindingDialogProps): JSX.Element {
  const promoteMutation = usePromoteFinding();

  const handlePromote = () => {
    const requestBody: PromoteFindingRequestBody = {
      finding_entry_id: originalFindingId,
      subtask_id_context: currentSubtaskId,
      sharing_scope: SharingScope.PROJECT,
    };

    promoteMutation.mutate(
      { data: requestBody, originalFindingId, aiReviewId },
      {
        onSuccess: () => {
          onPromotionSuccess?.();
        },
      },
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Promote Finding to Knowledge Base</DialogTitle>
          <DialogDescription>
            Are you sure you want to promote this finding? This action will make it available for future reference.
          </DialogDescription>
        </DialogHeader>

        {promoteMutation.isError && (
          <div className="my-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <p className="font-semibold">Error promoting finding:</p>
            <p className="text-sm">{promoteMutation.error?.message || 'An unexpected error occurred.'}</p>
          </div>
        )}

        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handlePromote} disabled={promoteMutation.isPending}>
            {promoteMutation.isPending ? 'Promoting...' : 'Promote Finding'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
