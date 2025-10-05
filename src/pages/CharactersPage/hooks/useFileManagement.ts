import { useCallback, useRef, useState } from 'react';

import type { CharacterDetail } from '@/api/charactersService';
import { useToast } from '@/components/ui/use-toast';
import { useUploadCharacterImage, useUploadGalleryImagesBatch } from '@/hooks/useCharacters';

export function useFileManagement(selectedCharacter: CharacterDetail | null, projectId: string) {
  const [selectedFile, setSelectedFile] = useState<File>();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBatchUploadModalOpen, setIsBatchUploadModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isBatchUploading, setIsBatchUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { mutate: uploadImage, isPending: isUploading } = useUploadCharacterImage();
  const { mutate: uploadBatchImages, isPending: isBatchUploadPending } = useUploadGalleryImagesBatch();

  // File handling
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files[0]) {
        setSelectedFile(files[0]);
        if (selectedCharacter) {
          setIsUploadModalOpen(true);
        }
      }
    },
    [selectedCharacter],
  );

  const handleBatchFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        const fileArray = Array.from(files);
        setSelectedFiles(fileArray);
        if (selectedCharacter) {
          setIsBatchUploadModalOpen(true);
        }
      }
    },
    [selectedCharacter],
  );

  const handlePdfFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files[0]) {
        const pdfFile = files[0];
        toast({
          title: 'PDF処理中',
          description: `${pdfFile.name} を処理しています...`,
        });
        event.target.value = '';
      }
    },
    [toast],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const fileArray = Array.from(e.dataTransfer.files);

        // Filter for image files only
        const imageFiles = fileArray.filter((file) => file.type.startsWith('image/'));

        if (imageFiles.length === 1) {
          setSelectedFile(imageFiles[0]);
          if (selectedCharacter) {
            setIsUploadModalOpen(true);
          }
        } else if (imageFiles.length > 1) {
          setSelectedFiles(imageFiles);
          if (selectedCharacter) {
            setIsBatchUploadModalOpen(true);
          }
        } else {
          toast({
            title: 'ファイル形式エラー',
            description: '画像ファイルのみアップロード可能です',
            variant: 'destructive',
          });
        }
      }
    },
    [selectedCharacter, toast],
  );

  const handleFileButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleBatchFileButtonClick = useCallback(() => {
    batchFileInputRef.current?.click();
  }, []);

  // Modal handlers
  const handleImageModalOpen = useCallback(() => {
    setImageZoom(1);
    setImageRotation(0);
    setIsImageModalOpen(true);
  }, []);

  const closeUploadModal = useCallback(() => {
    setIsUploadModalOpen(false);
    setSelectedFile(undefined);
  }, []);

  const closeBatchUploadModal = useCallback(() => {
    setIsBatchUploadModalOpen(false);
    setSelectedFiles([]);
    setUploadProgress(0);
    setUploadStatus('');
    setIsBatchUploading(false);
  }, []);

  // Upload handling
  const handleUploadImage = useCallback(() => {
    if (selectedFile && selectedCharacter) {
      uploadImage(
        {
          characterId: selectedCharacter.id,
          projectId,
          file: selectedFile,
        },
        {
          onSuccess: () => {
            setSelectedFile(undefined);
            setIsUploadModalOpen(false);
            toast({
              title: '画像のアップロードが成功しました',
              description: `${selectedCharacter.name} の画像がアップロードされました`,
            });
          },
          onError: (error) => {
            console.error('Upload failed:', error);
            toast({
              title: '画像のアップロードに失敗しました',
              description: error.message,
              variant: 'destructive',
            });
          },
        },
      );
    }
  }, [selectedFile, selectedCharacter, projectId, uploadImage, toast]);

  const handleBatchUploadImages = useCallback(() => {
    if (selectedFiles.length > 0 && selectedCharacter) {
      setIsBatchUploading(true);
      setUploadProgress(0);
      setUploadStatus('アップロード開始...');

      uploadBatchImages(
        {
          characterId: selectedCharacter.id,
          projectId,
          files: selectedFiles,
          onProgress: (progress, fileName) => {
            setUploadProgress(progress);
            setUploadStatus(fileName);
          },
        },
        {
          onSuccess: (result) => {
            setIsBatchUploading(false);
            closeBatchUploadModal();

            toast({
              title: 'バッチアップロード完了',
              description:
                `${result.uploaded_count}個のファイルがアップロードされました` +
                (result.failed_count > 0 ? `（${result.failed_count}個失敗）` : ''),
              variant: result.failed_count > 0 ? 'destructive' : 'default',
            });

            // Show detailed results if there were failures
            if (result.failed_count > 0) {
              console.warn('Failed uploads:', result.failed_files);
            }
          },
          onError: (error) => {
            console.error('Batch upload failed:', error);
            setIsBatchUploading(false);
            toast({
              title: 'バッチアップロードに失敗しました',
              description: error.message,
              variant: 'destructive',
            });
          },
        },
      );
    }
  }, [selectedFiles, selectedCharacter, projectId, uploadBatchImages, toast, closeBatchUploadModal]);

  // File removal from batch
  const removeFileFromBatch = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    // State
    selectedFile,
    setSelectedFile,
    selectedFiles,
    setSelectedFiles,
    isUploadModalOpen,
    setIsUploadModalOpen,
    isBatchUploadModalOpen,
    setIsBatchUploadModalOpen,
    dragActive,
    imageZoom,
    setImageZoom,
    imageRotation,
    setImageRotation,
    isImageModalOpen,
    setIsImageModalOpen,
    uploadProgress,
    uploadStatus,
    isBatchUploading,
    fileInputRef,
    batchFileInputRef,

    // Upload state
    isUploading,
    isBatchUploadPending,

    // Handlers
    handleFileSelect,
    handleBatchFileSelect,
    handlePdfFileSelect,
    handleDrag,
    handleDrop,
    handleFileButtonClick,
    handleBatchFileButtonClick,
    handleImageModalOpen,
    closeUploadModal,
    closeBatchUploadModal,
    handleUploadImage,
    handleBatchUploadImages,
    removeFileFromBatch,
  };
}
