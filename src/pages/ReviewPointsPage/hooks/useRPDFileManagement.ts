import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/ui/use-toast';

import { useUploadRPDReferenceImage, useUploadRPDReferenceImagesBatch } from './useCreateRPD';

export interface UploadedRPDImage {
  id: string;
  file?: File; // Make file optional for existing images
  s3_path?: string;
  url?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  error?: string;
  previewUrl?: string;
  isExisting?: boolean; // Flag to identify existing vs new images
  displayName?: string; // For existing images without file
}

export function useRPDFileManagement(
  projectId: string,
  onImagesChange: (s3Paths: string[]) => void,
  initialImages?: string[], // Add parameter for existing image S3 paths
) {
  const [images, setImages] = useState<UploadedRPDImage[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [batchUploadProgress, setBatchUploadProgress] = useState(0);
  const [batchUploadStatus, setBatchUploadStatus] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const uploadMutation = useUploadRPDReferenceImage();
  const batchUploadMutation = useUploadRPDReferenceImagesBatch();

  // Initialize with existing images
  useEffect(() => {
    console.log('useRPDFileManagement initialImages effect:', {
      initialImages,
      initialImagesLength: initialImages?.length || 0,
      hasInitialImages: !!(initialImages && initialImages.length > 0),
    });

    if (initialImages && initialImages.length > 0) {
      const existingImages: UploadedRPDImage[] = initialImages.map((s3Path, index) => ({
        id: `existing-${s3Path}-${index}`,
        s3_path: s3Path,
        url: s3Path, // S3 path - will be resolved to displayable URL in component
        isExisting: true,
        displayName: `Reference Image ${index + 1}`,
      }));

      console.log('Setting existing images:', existingImages);
      setImages(existingImages);
    } else {
      // Clear images if no initial images provided
      console.log('Clearing images - no initial images provided');
      setImages([]);
    }
  }, [initialImages]);

  // File handling
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFiles = useCallback(
    (files: File[]) => {
      const imageFiles = files.filter((file) => file.type.startsWith('image/'));

      if (imageFiles.length !== files.length) {
        toast({
          title: 'Invalid files',
          description: 'Only image files are allowed.',
          variant: 'destructive',
        });
      }

      // Add new images to state with preview URLs
      const newImages: UploadedRPDImage[] = imageFiles.map((file) => ({
        id: `${file.name}-${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0]}`,
        file,
        isUploading: false,
        previewUrl: URL.createObjectURL(file),
        isExisting: false,
      }));

      setImages((prev) => [...prev, ...newImages]);
    },
    [toast],
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      handleFiles(files);
      // Reset input value so same file can be selected again
      event.target.value = '';
    },
    [handleFiles],
  );

  const handleFileButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Upload functionality
  const uploadImage = useCallback(
    async (imageId: string) => {
      let targetImage: UploadedRPDImage | undefined;

      setImages((prev) => {
        const updated = prev.map((img) =>
          img.id === imageId ? { ...img, isUploading: true, uploadProgress: 0, error: undefined } : img,
        );
        targetImage = updated.find((img) => img.id === imageId);
        return updated;
      });

      if (!targetImage || !targetImage.file) {
        return;
      }

      try {
        const result = await uploadMutation.mutateAsync({
          projectId,
          file: targetImage.file,
        });

        setImages((prev) => {
          const updated = prev.map((img) =>
            img.id === imageId
              ? {
                  ...img,
                  isUploading: false,
                  uploadProgress: 100,
                  s3_path: result.s3_path,
                  url: result.url,
                }
              : img,
          );

          // Update parent component with all current S3 paths
          const s3Paths = updated.filter((img) => img.s3_path).map((img) => img.s3_path!);
          onImagesChange(s3Paths);

          return updated;
        });

        toast({
          title: 'Upload successful',
          description: `${targetImage.file.name} has been uploaded.`,
        });
      } catch (error) {
        console.error('Upload failed:', error);
        setImages((prev) =>
          prev.map((img) =>
            img.id === imageId
              ? {
                  ...img,
                  isUploading: false,
                  uploadProgress: 0,
                  error: 'Upload failed',
                }
              : img,
          ),
        );

        toast({
          title: 'Upload failed',
          description: `Failed to upload ${targetImage.file.name}.`,
          variant: 'destructive',
        });
      }
    },
    [uploadMutation, projectId, onImagesChange, toast],
  );

  // Batch upload functionality
  const uploadAllPending = useCallback(async () => {
    const pendingImages = images.filter((img) => !img.isUploading && !img.s3_path && !img.error && img.file);

    if (pendingImages.length === 0) {
      return;
    }

    if (pendingImages.length === 1) {
      // Use single upload for one image
      await uploadImage(pendingImages[0].id);
      return;
    }

    // Use batch upload for multiple images
    setIsBatchUploading(true);
    setBatchUploadProgress(0);
    setBatchUploadStatus('Preparing batch upload...');

    // Mark pending images as uploading
    const markPendingImagesAsUploading = (img: UploadedRPDImage) =>
      pendingImages.some((p) => p.id === img.id)
        ? { ...img, isUploading: true, uploadProgress: 0, error: undefined }
        : img;

    setImages((prev) => prev.map(markPendingImagesAsUploading));

    try {
      const files = pendingImages.map((img) => img.file!).filter(Boolean);

      const updateImageProgress = (progress: number, img: UploadedRPDImage) =>
        pendingImages.some((p) => p.id === img.id) ? { ...img, uploadProgress: progress } : img;

      const handleProgress = (progress: number, status: string) => {
        setBatchUploadProgress(progress);
        setBatchUploadStatus(status);

        // Update individual image progress
        const mapImageProgress = (img: UploadedRPDImage) => updateImageProgress(progress, img);
        setImages((prev) => prev.map(mapImageProgress));
      };

      const result = await batchUploadMutation.mutateAsync({
        projectId,
        files,
        onProgress: handleProgress,
      });

      // Update successful uploads
      const updateImageWithResult = (img: UploadedRPDImage) => {
        const pendingImage = pendingImages.find((p) => p.id === img.id);
        if (!pendingImage || !pendingImage.file) {
          return img;
        }

        const uploadedFile = result.uploaded_files.find((uploaded) => uploaded.filename === pendingImage.file!.name);

        if (uploadedFile) {
          return {
            ...img,
            isUploading: false,
            uploadProgress: 100,
            s3_path: uploadedFile.s3_path,
            url: uploadedFile.url,
            error: undefined,
          };
        }

        // Check if it failed
        const failedFile = result.failed_files.find((failed) => failed.filename === pendingImage.file!.name);

        return {
          ...img,
          isUploading: false,
          uploadProgress: 0,
          error: failedFile?.error || 'Upload failed',
        };
      };

      setImages((prev) => {
        const updated = prev.map(updateImageWithResult);

        // Update parent component with all current S3 paths
        const s3Paths = updated.filter((img) => img.s3_path).map((img) => img.s3_path!);
        onImagesChange(s3Paths);

        return updated;
      });

      if (result.uploaded_count > 0) {
        const failedCountText = result.failed_count > 0 ? `, ${result.failed_count} failed` : '';
        const description = `${result.uploaded_count} image(s) uploaded successfully${failedCountText}.`;
        toast({
          title: 'Batch upload completed',
          description,
          variant: result.failed_count > 0 ? 'destructive' : 'default',
        });
      }

      if (result.failed_count > 0 && result.uploaded_count === 0) {
        toast({
          title: 'Batch upload failed',
          description: `All ${result.failed_count} images failed to upload.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Batch upload failed:', error);
      // Mark all pending images as failed
      const markPendingImagesAsFailed = (img: UploadedRPDImage) =>
        pendingImages.some((p) => p.id === img.id)
          ? { ...img, isUploading: false, uploadProgress: 0, error: 'Batch upload failed' }
          : img;

      setImages((prev) => prev.map(markPendingImagesAsFailed));

      toast({
        title: 'Batch upload failed',
        description: 'Failed to upload images. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsBatchUploading(false);
      setBatchUploadProgress(0);
      setBatchUploadStatus('');
    }
  }, [images, uploadImage, batchUploadMutation, projectId, onImagesChange, toast]);

  const removeImage = useCallback(
    (imageId: string) => {
      const imageToRemove = images.find((img) => img.id === imageId);

      // Clean up preview URL
      if (imageToRemove?.previewUrl) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }

      const updateImagesAfterRemoval = (prev: UploadedRPDImage[]) => {
        const updated = prev.filter((img) => img.id !== imageId);

        // Update parent component with remaining S3 paths
        const s3Paths = updated.filter((img) => img.s3_path).map((img) => img.s3_path!);
        onImagesChange(s3Paths);

        return updated;
      };

      setImages(updateImagesAfterRemoval);
    },
    [images, onImagesChange],
  );

  // Image viewing functionality
  const handleImageClick = useCallback((imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setIsImageModalOpen(true);
  }, []);

  const handleCloseImageModal = useCallback(() => {
    setIsImageModalOpen(false);
    setSelectedImageUrl('');
  }, []);

  // Utility functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Computed values
  const hasUploadedImages = images.some((img) => img.s3_path);
  const hasPendingImages = images.some((img) => !img.s3_path && !img.error && img.file);
  const pendingCount = images.filter((img) => !img.s3_path && !img.error && img.file).length;
  const uploadedCount = images.filter((img) => img.s3_path).length;
  const existingCount = images.filter((img) => img.isExisting).length;

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    images.forEach((img) => {
      if (img.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
  }, [images]);

  return {
    // State
    images,
    dragActive,
    selectedImageUrl,
    isImageModalOpen,
    isBatchUploading,
    batchUploadProgress,
    batchUploadStatus,
    fileInputRef,

    // Upload state
    isUploading: uploadMutation.isPending,
    isBatchUploadPending: batchUploadMutation.isPending,

    // Computed values
    hasUploadedImages,
    hasPendingImages,
    pendingCount,
    uploadedCount,
    existingCount,

    // Handlers
    handleDrag,
    handleDrop,
    handleFiles,
    handleFileSelect,
    handleFileButtonClick,
    uploadImage,
    uploadAllPending,
    removeImage,
    handleImageClick,
    handleCloseImageModal,
    formatFileSize,
    cleanup,
  };
}
