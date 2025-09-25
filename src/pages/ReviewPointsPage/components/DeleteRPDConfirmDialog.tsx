import { AlertTriangle, Trash2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

import type { ReviewPointDefinitionSchema } from '../../../types/ReviewPointDefinition';

interface DeleteRPDConfirmDialogProps {
  rpd: ReviewPointDefinitionSchema | null;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation dialog for deleting RPDs with safety checks
 */
export default function DeleteRPDConfirmDialog({
  rpd,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteRPDConfirmDialogProps): JSX.Element | null {
  if (!isOpen || !rpd) {
    return null;
  }

  const currentVersion = rpd.current_version;
  const hasMultipleVersions = rpd.versions && rpd.versions.length > 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Review Point Definition
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the RPD and all its versions.
          </DialogDescription>
        </DialogHeader>

        {/* RPD Information */}
        <div className="my-4 p-4 bg-muted rounded-lg">
          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Title:</span>
              <p className="text-sm">{currentVersion?.title || 'Untitled RPD'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Key:</span>
              <p className="text-sm">{rpd.key}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
              <p className={`text-sm ${rpd.is_active ? 'text-green-600' : 'text-muted-foreground'}`}>
                {rpd.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>

        {/* Warning for multiple versions */}
        {hasMultipleVersions && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This RPD has {rpd.versions.length} versions. All versions and their history will be permanently deleted.
            </AlertDescription>
          </Alert>
        )}

        {/* Warning for active RPD */}
        {rpd.is_active && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This RPD is currently active and may be used in ongoing AI reviews. Deleting it may affect active
              workflows.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting} className="min-w-[80px]">
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Deleting...
              </div>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
