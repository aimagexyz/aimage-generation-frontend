import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/ui/use-toast';
import type { PreviewFile, UploadConfirmationResult } from '@/types/filePreview';
import { cleanupPreviewUrls, createPreviewFile } from '@/utils/filePreviewUtils';

interface UseFilePreviewOptions {
  onConfirm?: (result: UploadConfirmationResult) => void;
  autoOpenPreview?: boolean;
}

interface UseFilePreviewReturn {
  // State
  previewFiles: PreviewFile[];
  isPreviewModalOpen: boolean;

  // Actions
  addFiles: (files: File[]) => void;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  openPreviewModal: () => void;
  closePreviewModal: () => void;
  handleConfirmUpload: (result: UploadConfirmationResult) => void;

  // Computed
  hasFiles: boolean;
  hasValidFiles: boolean;
  hasErrors: boolean;
  validFileCount: number;
  errorCount: number;
}

export const useFilePreview = (options: UseFilePreviewOptions = {}): UseFilePreviewReturn => {
  const { onConfirm, autoOpenPreview = true } = options;
  const { toast } = useToast();

  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Add files to preview
  const addFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) {
        return;
      }

      const newPreviewFiles = files.map(createPreviewFile);

      // Check for invalid files and show toast
      const invalidFiles = newPreviewFiles.filter((f) => f.status === 'error');
      const validFiles = newPreviewFiles.filter((f) => f.status !== 'error');

      if (invalidFiles.length > 0) {
        toast({
          title: 'ファイル形式エラー',
          description: `${invalidFiles.length}件のファイルがサポートされていない形式です。`,
          variant: 'destructive',
        });

        // Clean up blob URLs for invalid files immediately
        invalidFiles.forEach((file) => {
          if (file.previewUrl) {
            URL.revokeObjectURL(file.previewUrl);
          }
        });
      }

      // Only add valid files to state - no error files stored
      if (validFiles.length > 0) {
        setPreviewFiles((prev) => [...prev, ...validFiles]);

        // Auto-open preview if enabled
        if (autoOpenPreview) {
          setIsPreviewModalOpen(true);
        }
      }
    },
    [toast, autoOpenPreview],
  );

  // Remove a specific file
  const removeFile = useCallback((fileId: string) => {
    setPreviewFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  }, []);

  // Clear all files
  const clearFiles = useCallback(() => {
    setPreviewFiles((prev) => {
      cleanupPreviewUrls(prev);
      return [];
    });
    setIsPreviewModalOpen(false);
  }, []);

  // Modal controls
  const openPreviewModal = useCallback(() => {
    setIsPreviewModalOpen(true);
  }, []);

  const closePreviewModal = useCallback(() => {
    setIsPreviewModalOpen(false);
    // Clear files when modal is closed - user canceled the upload
    clearFiles();
  }, [clearFiles]);

  // Handle upload confirmation
  const handleConfirmUpload = useCallback(
    (result: UploadConfirmationResult) => {
      // Don't close modal here - let the parent handle it

      toast({
        title: 'アップロード開始',
        description: `${result.totalCount}件のファイルをアップロードします。`,
      });

      // Call the external confirm handler
      if (onConfirm) {
        onConfirm(result);
      }

      // Clear files after confirmation and close modal
      clearFiles();
      setIsPreviewModalOpen(false);
    },
    [onConfirm, toast, clearFiles],
  );

  // Computed values
  const hasFiles = previewFiles.length > 0;
  const hasValidFiles = previewFiles.some((f) => f.status !== 'error');
  const hasErrors = previewFiles.some((f) => f.status === 'error');
  const validFileCount = previewFiles.filter((f) => f.status !== 'error').length;
  const errorCount = previewFiles.filter((f) => f.status === 'error').length;

  // Cleanup on unmount - using ref to avoid stale closure
  const previewFilesRef = useRef<PreviewFile[]>([]);

  useEffect(() => {
    previewFilesRef.current = previewFiles;
  }, [previewFiles]);

  useEffect(() => {
    return () => {
      cleanupPreviewUrls(previewFilesRef.current);
    };
  }, []);

  return {
    // State
    previewFiles,
    isPreviewModalOpen,

    // Actions
    addFiles,
    removeFile,
    clearFiles,
    openPreviewModal,
    closePreviewModal,
    handleConfirmUpload,

    // Computed
    hasFiles,
    hasValidFiles,
    hasErrors,
    validFileCount,
    errorCount,
  };
};
