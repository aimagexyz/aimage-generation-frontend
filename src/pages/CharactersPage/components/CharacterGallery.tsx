import { Loader2, MoreVertical, Trash2, Upload } from 'lucide-react';
import { useCallback, useState } from 'react';
import { LuImage, LuUpload } from 'react-icons/lu';

import type { CharacterDetail } from '@/api/charactersService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { LazyImage } from '@/components/ui/LazyImage';
import { LikeButton } from '@/components/ui/LikeButton';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  useCharacterConceptArt,
  useCharacterGallery,
  useDeleteConceptArtImage,
  useDeleteGalleryImage,
  useUploadConceptArtImage,
  useUploadConceptArtImagesBatch,
  useUploadGalleryImage,
  useUploadGalleryImagesBatch,
} from '@/hooks/useCharacters';

import { BatchUploadModal } from './BatchUploadModal';

// Add new props interface for the merged component
interface MergedImageManagementProps {
  character: CharacterDetail;
  projectId: string;
  selectedCharacterImageUrl: string;
  hasImage: (character: CharacterDetail) => boolean;
  fileManagement: {
    dragActive: boolean;
    handleDrag: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
    handleImageModalOpen: () => void;
    handleFileButtonClick: () => void;
  };
}

// Update the main export to be MergedImageManagement
export function MergedImageManagement({
  character,
  projectId,
  selectedCharacterImageUrl,
  hasImage,
  fileManagement,
}: MergedImageManagementProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isBatchUploadModalOpen, setIsBatchUploadModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isBatchUploading, setIsBatchUploading] = useState(false);

  // Concept art state variables
  const [selectedConceptArtFiles, setSelectedConceptArtFiles] = useState<File[]>([]);
  const [isConceptArtBatchUploadModalOpen, setIsConceptArtBatchUploadModalOpen] = useState(false);
  const [conceptArtUploadProgress, setConceptArtUploadProgress] = useState(0);
  const [conceptArtUploadStatus, setConceptArtUploadStatus] = useState<string>('');
  const [isConceptArtBatchUploading, setIsConceptArtBatchUploading] = useState(false);
  const [conceptArtDragActive, setConceptArtDragActive] = useState(false);

  const { toast } = useToast();

  const { data: galleryData, isLoading } = useCharacterGallery(character.id, projectId);
  const { mutate: uploadImage, isPending: isUploading } = useUploadGalleryImage();
  const { mutate: deleteImage } = useDeleteGalleryImage();
  const { mutate: uploadImagesBatch } = useUploadGalleryImagesBatch();

  // Concept art hooks
  const { data: conceptArtData, isLoading: isConceptArtLoading } = useCharacterConceptArt(character.id, projectId);
  const { mutate: uploadConceptArtImage, isPending: isConceptArtUploading } = useUploadConceptArtImage();
  const { mutate: deleteConceptArtImage } = useDeleteConceptArtImage();
  const { mutate: uploadConceptArtImagesBatch } = useUploadConceptArtImagesBatch();

  const images = galleryData?.gallery_images || [];
  const conceptArtImages = conceptArtData?.concept_art_images || [];

  // Unified gallery file selection handler
  const handleGalleryFileUpload = useCallback(
    (files: FileList | null) => {
      if (files && files.length > 0) {
        const imageFiles = Array.from(files).filter((file) => {
          const isImage = file.type.startsWith('image/');
          const isAI = file.name.toLowerCase().endsWith('.ai');
          return isImage || isAI;
        });

        if (imageFiles.length === 0) {
          toast({
            title: 'ファイル形式エラー',
            description: '画像ファイルのみアップロード可能です',
            variant: 'destructive',
          });
          return;
        }

        if (imageFiles.length === 1) {
          // Single file upload
          uploadImage(
            { characterId: character.id, projectId, file: imageFiles[0] },
            {
              onSuccess: () => {
                toast({
                  title: '画像をアップロードしました',
                  description: 'ギャラリーに画像が追加されました',
                });
              },
              onError: (error) => {
                toast({
                  title: '画像のアップロードに失敗しました',
                  description: error.message,
                  variant: 'destructive',
                });
              },
            },
          );
        } else {
          // Multiple files - open batch upload modal
          setSelectedFiles(imageFiles);
          setIsBatchUploadModalOpen(true);
        }
      }
    },
    [character.id, projectId, uploadImage, toast],
  );

  const handleGalleryDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files) {
        handleGalleryFileUpload(e.dataTransfer.files);
      }
    },
    [handleGalleryFileUpload],
  );

  const handleGalleryDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleImageClick = useCallback((imageUrl: string) => {
    setSelectedImage(imageUrl);
  }, []);

  const handleImageDelete = useCallback(
    (index: number) => {
      if (window.confirm('この画像を削除してもよろしいですか？')) {
        deleteImage(
          { characterId: character.id, projectId, imageIndex: index },
          {
            onSuccess: () => {
              toast({
                title: '画像を削除しました',
                description: 'ギャラリーから画像が削除されました',
              });
            },
            onError: (error) => {
              toast({
                title: '画像の削除に失敗しました',
                description: error.message,
                variant: 'destructive',
              });
            },
          },
        );
      }
    },
    [character.id, projectId, deleteImage, toast],
  );

  const handleUploadButtonClick = () => {
    document.getElementById('gallery-upload-input')?.click();
  };

  const handleBatchUpload = useCallback(() => {
    if (selectedFiles.length > 0) {
      setIsBatchUploading(true);
      setUploadProgress(0);
      setUploadStatus('アップロード開始...');

      uploadImagesBatch(
        {
          characterId: character.id,
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
            setIsBatchUploadModalOpen(false);
            setSelectedFiles([]);
            setUploadProgress(0);
            setUploadStatus('');

            toast({
              title: 'バッチアップロード完了',
              description:
                `${result.uploaded_count}個のファイルがアップロードされました` +
                (result.failed_count > 0 ? `（${result.failed_count}個失敗）` : ''),
              variant: result.failed_count > 0 ? 'destructive' : 'default',
            });

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
  }, [selectedFiles, character.id, projectId, uploadImagesBatch, toast]);

  const removeFileFromBatch = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Concept art file handlers
  const handleConceptArtFileUpload = useCallback(
    (files: FileList | null) => {
      if (files && files.length > 0) {
        const imageFiles = Array.from(files).filter((file) => {
          const isImage = file.type.startsWith('image/');
          const isAI = file.name.toLowerCase().endsWith('.ai');
          return isImage || isAI;
        });

        if (imageFiles.length === 0) {
          toast({
            title: 'ファイル形式エラー',
            description: '画像ファイルのみアップロード可能です',
            variant: 'destructive',
          });
          return;
        }

        if (imageFiles.length === 1) {
          // Single file upload
          uploadConceptArtImage(
            { characterId: character.id, projectId, file: imageFiles[0] },
            {
              onSuccess: () => {
                toast({
                  title: '設定集画像をアップロードしました',
                  description: '設定集に画像が追加されました',
                });
              },
              onError: (error) => {
                toast({
                  title: '設定集画像のアップロードに失敗しました',
                  description: error.message,
                  variant: 'destructive',
                });
              },
            },
          );
        } else {
          // Multiple files - open batch upload modal
          setSelectedConceptArtFiles(imageFiles);
          setIsConceptArtBatchUploadModalOpen(true);
        }
      }
    },
    [character.id, projectId, uploadConceptArtImage, toast],
  );

  const handleConceptArtDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setConceptArtDragActive(false);

      if (e.dataTransfer.files) {
        handleConceptArtFileUpload(e.dataTransfer.files);
      }
    },
    [handleConceptArtFileUpload],
  );

  const handleConceptArtDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setConceptArtDragActive(true);
    } else if (e.type === 'dragleave') {
      setConceptArtDragActive(false);
    }
  }, []);

  const handleConceptArtImageDelete = useCallback(
    (index: number) => {
      if (window.confirm('この設定集画像を削除してもよろしいですか？')) {
        deleteConceptArtImage(
          { characterId: character.id, projectId, imageIndex: index },
          {
            onSuccess: () => {
              toast({
                title: '設定集画像を削除しました',
                description: '設定集から画像が削除されました',
              });
            },
            onError: (error) => {
              toast({
                title: '設定集画像の削除に失敗しました',
                description: error.message,
                variant: 'destructive',
              });
            },
          },
        );
      }
    },
    [character.id, projectId, deleteConceptArtImage, toast],
  );

  const handleConceptArtUploadButtonClick = () => {
    document.getElementById('concept-art-upload-input')?.click();
  };

  const handleConceptArtBatchUpload = useCallback(() => {
    if (selectedConceptArtFiles.length > 0) {
      setIsConceptArtBatchUploading(true);
      setConceptArtUploadProgress(0);
      setConceptArtUploadStatus('アップロード開始...');

      uploadConceptArtImagesBatch(
        {
          characterId: character.id,
          projectId,
          files: selectedConceptArtFiles,
          onProgress: (progress, fileName) => {
            setConceptArtUploadProgress(progress);
            setConceptArtUploadStatus(fileName);
          },
        },
        {
          onSuccess: (result) => {
            setIsConceptArtBatchUploading(false);
            setIsConceptArtBatchUploadModalOpen(false);
            setSelectedConceptArtFiles([]);
            setConceptArtUploadProgress(0);
            setConceptArtUploadStatus('');

            toast({
              title: '設定集バッチアップロード完了',
              description:
                `${result.uploaded_count}個のファイルがアップロードされました` +
                (result.failed_count > 0 ? `（${result.failed_count}個失敗）` : ''),
              variant: result.failed_count > 0 ? 'destructive' : 'default',
            });

            if (result.failed_count > 0) {
              console.warn('Failed concept art uploads:', result.failed_files);
            }
          },
          onError: (error) => {
            console.error('Concept art batch upload failed:', error);
            setIsConceptArtBatchUploading(false);
            toast({
              title: '設定集バッチアップロードに失敗しました',
              description: error.message,
              variant: 'destructive',
            });
          },
        },
      );
    }
  }, [selectedConceptArtFiles, character.id, projectId, uploadConceptArtImagesBatch, toast]);

  const removeConceptArtFileFromBatch = useCallback((index: number) => {
    setSelectedConceptArtFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  function MainImageContent() {
    if (fileManagement.dragActive) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-primary">
          <Upload className="w-16 h-16 mb-4" />
          <p className="text-lg font-semibold">メイン画像に設定</p>
        </div>
      );
    }
    if (hasImage(character)) {
      return (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900"></div>
          <img
            key={`${character.id}-${character.updated_at}`}
            src={character.image_url || selectedCharacterImageUrl}
            alt={character.name}
            className="relative z-10 object-contain w-full h-auto max-h-[500px] cursor-pointer"
            onClick={fileManagement.handleImageModalOpen}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.includes('/api/v1/characters/')) {
                target.src = selectedCharacterImageUrl;
              }
            }}
          />
          <div className="absolute inset-0 z-20 flex items-center justify-center transition-all duration-300 opacity-0 bg-black/0 hover:bg-black/40 hover:opacity-100 group">
            <div className="flex flex-col items-center gap-3 text-white">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileManagement.handleFileButtonClick();
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 font-medium"
              >
                <LuUpload className="w-4 h-4 mr-2" />
                画像を変更
              </Button>
            </div>
          </div>
        </>
      );
    }
    return (
      <div
        className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground cursor-pointer hover:text-foreground hover:bg-muted/50 transition-all duration-200 group"
        onClick={fileManagement.handleFileButtonClick}
      >
        <div className="relative">
          <LuImage className="w-16 h-16 mb-4 group-hover:scale-110 transition-transform duration-200" />
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <LuUpload className="w-3 h-3 text-primary-foreground" />
          </div>
        </div>
        <p className="mb-1 font-medium text-center group-hover:text-primary transition-colors duration-200">
          メイン画像をアップロード
        </p>
        <p className="text-sm text-center">ドラッグ&ドロップまたはクリックして選択</p>
      </div>
    );
  }

  if (isLoading || isConceptArtLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Main image skeleton */}
          <div className="space-y-4">
            <Skeleton className="w-32 h-6" />
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="w-48 h-10 mx-auto" />
          </div>

          {/* Gallery skeleton */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="w-48 h-6 animate-pulse" />
              <Skeleton className="w-32 h-8 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="aspect-square rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>

        {/* Concept Art skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="w-48 h-6 animate-pulse" />
            <Skeleton className="w-32 h-8 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="aspect-square rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Combined Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">ギャラリー</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            メイン画像の管理とギャラリー画像の一覧表示
            {images.length > 0 && <span className="ml-2 text-green-600">（ギャラリー: {images.length} 枚）</span>}
            {conceptArtImages.length > 0 && (
              <span className="ml-2 text-green-600">（設定集: {conceptArtImages.length} 枚）</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleUploadButtonClick}
            disabled={isUploading || isBatchUploading}
            className="shadow-sm min-w-[140px]"
          >
            {isUploading || isBatchUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            ギャラリー追加
          </Button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Side - Main Image Management */}
        <div className="space-y-4">
          <div
            className={`relative rounded-lg overflow-hidden border-2 transition-all duration-200 ${
              hasImage(character) ? 'min-h-[300px] max-h-[500px]' : 'aspect-square'
            } ${(() => {
              if (fileManagement.dragActive) {
                return 'border-primary bg-primary/5 border-solid';
              }
              if (hasImage(character)) {
                return 'border-solid border-border hover:border-primary/50';
              }
              return 'border-dashed border-border hover:border-muted-foreground';
            })()}`}
            onDragEnter={fileManagement.handleDrag}
            onDragLeave={fileManagement.handleDrag}
            onDragOver={fileManagement.handleDrag}
            onDrop={fileManagement.handleDrop}
          >
            <MainImageContent />
          </div>
        </div>

        {/* Right Side - Gallery */}
        <div className="flex flex-col space-y-4">
          {/* Upload Area for Gallery - Only show when no images or during drag */}
          {dragActive ? (
            <div className="flex-grow flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg text-primary bg-primary/5">
              <Upload className="w-16 h-16 mb-4" />
              <p className="text-lg font-semibold">ギャラリーに追加</p>
            </div>
          ) : (
            <>
              {images.length === 0 && (
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 hover:border-primary hover:text-primary"
                  onDragEnter={handleGalleryDrag}
                  onDragLeave={handleGalleryDrag}
                  onDragOver={handleGalleryDrag}
                  onDrop={handleGalleryDrop}
                  onClick={handleUploadButtonClick}
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-medium">ギャラリーに追加</p>
                      <p className="text-sm text-muted-foreground">クリックまたはD&Dでアップロード</p>
                    </div>
                  </div>
                </div>
              )}

              <ScrollArea className="h-[500px] -mr-4 pr-4" onDragEnter={handleGalleryDrag}>
                {images.length > 0 && (
                  <div
                    className="h-full"
                    onDragEnter={handleGalleryDrag}
                    onDragLeave={handleGalleryDrag}
                    onDragOver={handleGalleryDrag}
                    onDrop={handleGalleryDrop}
                  >
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                      {images.map((imageUrl, index) => (
                        <Card
                          key={index}
                          className="group relative aspect-square overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg"
                        >
                          <LazyImage
                            src={imageUrl}
                            alt={`${character.name}のギャラリー画像 ${index + 1}`}
                            className="h-full w-full cursor-pointer object-contain transition-transform duration-300 group-hover:scale-105"
                            skeletonClassName="bg-muted"
                            fallbackSrc="/placeholder-image.svg"
                            onClick={() => {
                              handleImageClick(imageUrl);
                            }}
                          />
                          {/* Like button */}
                          <div className="absolute left-2 top-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                            <LikeButton
                              imageUrl={imageUrl}
                              size="sm"
                              variant="floating"
                              className="h-8 w-8 shadow-lg backdrop-blur-sm"
                            />
                          </div>
                          {/* Actions menu */}
                          <div className="absolute right-2 top-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className="h-8 w-8 rounded-full"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleImageDelete(index);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>削除</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </div>
      </div>

      {/* Concept Art Section */}
      <div className="space-y-6 border-t pt-6">
        {/* Concept Art Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">角色設定集</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              角色参考図/設定集の画像管理
              {conceptArtImages.length > 0 && (
                <span className="ml-2 text-blue-600">（{conceptArtImages.length} 枚）</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleConceptArtUploadButtonClick}
              disabled={isConceptArtUploading || isConceptArtBatchUploading}
              className="shadow-sm min-w-[140px]"
              variant="outline"
            >
              {isConceptArtUploading || isConceptArtBatchUploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              設定集追加
            </Button>
          </div>
        </div>

        {/* Concept Art Grid */}
        {conceptArtDragActive ? (
          <div className="flex-grow flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-primary bg-primary/5">
            <Upload className="w-16 h-16 mb-4" />
            <p className="text-lg font-semibold">設定集に追加</p>
          </div>
        ) : (
          <>
            {conceptArtImages.length === 0 && (
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 hover:border-primary hover:text-primary"
                onDragEnter={handleConceptArtDrag}
                onDragLeave={handleConceptArtDrag}
                onDragOver={handleConceptArtDrag}
                onDrop={handleConceptArtDrop}
                onClick={handleConceptArtUploadButtonClick}
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium">設定集に追加</p>
                    <p className="text-sm text-muted-foreground">角色参考図や設定集をアップロード</p>
                  </div>
                </div>
              </div>
            )}

            <ScrollArea className="h-auto max-h-[600px] -mr-4 pr-4" onDragEnter={handleConceptArtDrag}>
              {conceptArtImages.length > 0 && (
                <div
                  className="h-full"
                  onDragEnter={handleConceptArtDrag}
                  onDragLeave={handleConceptArtDrag}
                  onDragOver={handleConceptArtDrag}
                  onDrop={handleConceptArtDrop}
                >
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {conceptArtImages.map((imageUrl, index) => (
                      <Card
                        key={index}
                        className="group relative aspect-square overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg"
                      >
                        <LazyImage
                          src={imageUrl}
                          alt={`${character.name}の設定集画像 ${index + 1}`}
                          className="h-full w-full cursor-pointer object-contain transition-transform duration-300 group-hover:scale-105"
                          skeletonClassName="bg-muted"
                          fallbackSrc="/placeholder-image.svg"
                          onClick={() => {
                            setSelectedImage(imageUrl);
                          }}
                        />
                        {/* Like button */}
                        <div className="absolute left-2 top-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <LikeButton
                            imageUrl={imageUrl}
                            size="sm"
                            variant="floating"
                            className="h-8 w-8 shadow-lg backdrop-blur-sm"
                          />
                        </div>
                        {/* Actions menu */}
                        <div className="absolute right-2 top-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConceptArtImageDelete(index);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>削除</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </div>

      {/* Hidden file inputs for gallery */}
      <input
        id="gallery-upload-input"
        type="file"
        accept="image/*,.ai"
        multiple
        onChange={(e) => {
          handleGalleryFileUpload(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      <input
        id="concept-art-upload-input"
        type="file"
        accept="image/*,.ai"
        multiple
        onChange={(e) => {
          handleConceptArtFileUpload(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Batch Upload Modals */}
      <BatchUploadModal
        isOpen={isBatchUploadModalOpen}
        onOpenChange={setIsBatchUploadModalOpen}
        selectedFiles={selectedFiles}
        onFilesChange={setSelectedFiles}
        onUpload={handleBatchUpload}
        onRemoveFile={removeFileFromBatch}
        isUploading={isBatchUploading}
        uploadProgress={uploadProgress}
        uploadStatus={uploadStatus}
        characterName={character.name}
      />

      <BatchUploadModal
        isOpen={isConceptArtBatchUploadModalOpen}
        onOpenChange={setIsConceptArtBatchUploadModalOpen}
        selectedFiles={selectedConceptArtFiles}
        onFilesChange={setSelectedConceptArtFiles}
        onUpload={handleConceptArtBatchUpload}
        onRemoveFile={removeConceptArtFileFromBatch}
        isUploading={isConceptArtBatchUploading}
        uploadProgress={conceptArtUploadProgress}
        uploadStatus={conceptArtUploadStatus}
        characterName={`${character.name} - 設定集`}
      />

      {/* Image preview modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75"
          onClick={() => setSelectedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="画像プレビュー"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSelectedImage(null);
            }
          }}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedImage}
              alt={`${character.name}のギャラリー画像`}
              className="object-contain max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4"
              onClick={() => setSelectedImage(null)}
              aria-label="画像プレビューを閉じる"
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
