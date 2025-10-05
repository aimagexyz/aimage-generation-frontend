import { Image as ImageIcon, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useParams } from 'react-router-dom';

import { fetchApi } from '@/api/client';
import {
  advancedBatchUpload,
  // CheckAndGenerateEmbeddingsResponse,
  // checkAndGenerateProjectEmbeddings,
  ExtendedBatchUploadStatusResponse,
  ItemResponse,
} from '@/api/itemsService';
import { PDFConfirmationDialog } from '@/components/PDFConfirmationDialog';
import { PDFExtractionDialog } from '@/components/PDFExtractionDialog';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/Pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/use-toast';
import { usePDFSession } from '@/hooks/usePDFSession';

import {
  EmptyState,
  FilePreviewGrid,
  ImageGridItem,
  ImagePreviewModal,
  LoadingOverlay,
  PageChangeLoadingIndicator,
  UploadButton,
  UploadProgress,
} from './components';

interface UploadedFile extends File {
  preview: string;
}

// 使用ItemResponse替代ProjectItem
type ProjectItem = ItemResponse;

interface ItemsResponse {
  items: ProjectItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Note: processUploadResults function removed as it's no longer needed with the new background task system

// Helper function to handle upload errors
const handleUploadError = (
  error: unknown,
  setUploadStatus: (status: string) => void,
  toast: ReturnType<typeof useToast>['toast'],
) => {
  console.error('Upload error:', error);
  setUploadStatus('アップロード失敗');
  toast({
    title: 'アップロード失敗',
    description: error instanceof Error ? error.message : '不明なエラー',
    variant: 'destructive',
  });
};

// Upload validation helper
const validateUploadConditions = (
  selectedFiles: UploadedFile[],
  projectId: string | undefined,
  toast: ReturnType<typeof useToast>['toast'],
): boolean => {
  if (selectedFiles.length === 0) {
    toast({
      title: 'エラー',
      description: 'アップロードする画像を先に選択してください',
      variant: 'destructive',
    });
    return false;
  }

  if (!projectId) {
    toast({
      title: 'エラー',
      description: 'プロジェクトIDが空です',
      variant: 'destructive',
    });
    return false;
  }

  return true;
};

// Client-side filtering helper
const applyClientSideFilter = (
  items: ProjectItem[],
  query: string,
  setProjectItems: (items: ProjectItem[]) => void,
): void => {
  if (!query.trim()) {
    setProjectItems(items);
    return;
  }

  const filtered = items.filter((item) => item.filename.toLowerCase().includes(query.toLowerCase()));
  setProjectItems(filtered);
};

// Helper function to render pagination items
const renderPaginationItems = (
  generatePaginationItems: () => (number | string)[],
  page: number,
  loading: boolean,
  handlePageChange: (page: number) => void,
) => {
  return generatePaginationItems().map((item, index) => (
    <PaginationItem key={index}>
      {item === 'ellipsis' ? (
        <PaginationEllipsis className="text-gray-600 dark:text-gray-400" />
      ) : (
        <PaginationLink
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handlePageChange(item as number);
          }}
          isActive={page === item}
          className={`rounded-lg transition-all duration-300 ${
            page === item
              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-md scale-105'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105'
          } ${loading ? 'pointer-events-none opacity-50' : ''}`}
        >
          {item}
        </PaginationLink>
      )}
    </PaginationItem>
  ));
};

export default function DataRegistryPage() {
  const { projectId } = useParams<{ projectId: string }>();

  // PDF session管理（在页面级别管理，避免Dialog切换时丢失）
  const pdfSession = usePDFSession({ autoCleanup: false });

  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [currentFileName, setCurrentFileName] = useState('');
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [allProjectItems, setAllProjectItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [searchQuery, setSearchQuery] = useState('');

  // Add state to track if this is the initial load
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Height preservation for smooth page transitions
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [preservedHeight, setPreservedHeight] = useState<number | null>(null);

  // Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // PDF processing state
  const [pdfConfirmationOpen, setPdfConfirmationOpen] = useState(false);
  const [pdfExtractionOpen, setPdfExtractionOpen] = useState(false);
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);
  const [pdfProcessing, setPdfProcessing] = useState(false);

  const { toast } = useToast();

  // プロジェクトの参考画像を取得
  const fetchProjectItems = useCallback(
    async (pageNum: number) => {
      if (!projectId) {
        return;
      }

      // Preserve current height for smooth transitions
      if (!isInitialLoad && gridContainerRef.current) {
        const currentHeight = gridContainerRef.current.offsetHeight;
        setPreservedHeight(currentHeight);
      }

      setLoading(true);
      try {
        const response = await fetchApi({
          url: `/api/v1/items/projects/${projectId}` as never,
          method: 'get',
          params: {
            page: pageNum,
            size: pageSize,
          } as never,
        });

        const data = response.data as ItemsResponse;

        setAllProjectItems(data.items);
        setTotalPages(data.pages);
        setTotalItems(data.total);
        setPage(pageNum);
        setIsInitialLoad(false);

        // Clear preserved height after content loads
        setTimeout(() => setPreservedHeight(null), 100);
      } catch (error) {
        console.error('Failed to fetch project items:', error);
        toast({
          title: 'エラー',
          description: '参考画像の取得に失敗しました',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [projectId, toast, isInitialLoad, pageSize],
  );

  // Apply client-side filtering whenever data or query changes
  useEffect(() => {
    applyClientSideFilter(allProjectItems, searchQuery, setProjectItems);
  }, [allProjectItems, searchQuery]);

  // 初期データの読み込み
  useEffect(() => {
    if (projectId) {
      void fetchProjectItems(1);
    }
  }, [projectId, fetchProjectItems]);

  // PDF检测函数
  const isPDFFile = useCallback((file: File): boolean => {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }, []);

  // PDF处理成功回调
  const handlePdfExtractionSuccess = useCallback(
    (extractedCount: number) => {
      toast({
        title: 'PDF処理完了',
        description: `${extractedCount}枚の画像を正常に登録しました`,
      });
      void fetchProjectItems(1); // 刷新项目图片列表
    },
    [toast, fetchProjectItems],
  );

  // PDF确认处理
  const handlePdfConfirm = useCallback(() => {
    setPdfConfirmationOpen(false);
    setPdfExtractionOpen(true);
  }, []);

  // PDF处理取消
  const handlePdfCancel = useCallback(() => {
    setPdfConfirmationOpen(false);
    setPendingPdfFile(null);
  }, []);

  // PDF提取完成
  const handlePdfExtractionClose = useCallback(() => {
    setPdfExtractionOpen(false);
    setPendingPdfFile(null);
    setPdfProcessing(false);
    // 清理PDF session
    void pdfSession.cleanupSession();
  }, [pdfSession]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // 检查是否包含PDF文件
      const pdfFiles = acceptedFiles.filter(isPDFFile);
      const imageFiles = acceptedFiles.filter((file) => !isPDFFile(file));

      // 处理图片文件
      if (imageFiles.length > 0) {
        const newFiles = imageFiles.map((file) =>
          Object.assign(file, {
            preview: URL.createObjectURL(file),
          }),
        ) as UploadedFile[];

        setSelectedFiles((prev) => [...prev, ...newFiles]);
      }

      // 处理PDF文件（一次只处理一个）
      if (pdfFiles.length > 0) {
        if (pdfFiles.length > 1) {
          toast({
            title: '注意',
            description: 'PDFファイルは一度に1つずつ処理してください。最初のファイルのみ処理します。',
            variant: 'destructive',
          });
        }

        setPendingPdfFile(pdfFiles[0]);
        setPdfConfirmationOpen(true);
      }
    },
    [isPDFFile, toast],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'application/pdf': [],
      'application/postscript': ['.ai'],
      'application/illustrator': ['.ai'],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  // Handle file upload process with progress tracking using new background task system
  const handleFileUpload = useCallback(async () => {
    const fileCount = selectedFiles.length;
    setUploading(true);
    setUploadProgress(0);
    setCurrentFileName('');

    try {
      // Phase 1: Preparation
      setUploadStatus('アップロード準備中...');
      setUploadProgress(2);
      await new Promise((resolve) => setTimeout(resolve, 300));
      setUploadProgress(5);

      // Phase 2: Use advanced batch upload with real-time progress
      setUploadStatus(`${fileCount}個のファイルをアップロード開始...`);

      const finalStatus = await advancedBatchUpload(
        selectedFiles,
        projectId,
        undefined,
        undefined,
        (status: ExtendedBatchUploadStatusResponse) => {
          // Real-time progress updates from backend
          const progressPercentage =
            status.total_items > 0
              ? Math.min(95, Math.round((status.processed_items / status.total_items) * 85) + 10)
              : 10;

          setUploadProgress(progressPercentage);

          // Update status text based on backend status
          let statusText = '';
          let currentFile = '';

          switch (status.status) {
            case 'pending':
              statusText = 'アップロード待機中...';
              break;
            case 'running':
              statusText = `処理中: ${status.processed_items}/${status.total_items}`;

              // Add time estimation if available
              if (status.remainingTimeText) {
                statusText += ` (残り${status.remainingTimeText})`;
              }

              if (status.processed_items < selectedFiles.length) {
                const currentFileIndex = Math.min(status.processed_items, selectedFiles.length - 1);
                currentFile = selectedFiles[currentFileIndex]?.name || '';
              }
              break;
            case 'completed':
              statusText = 'アップロード完了';
              break;
            case 'failed':
              statusText = 'アップロード失敗';
              break;
            default:
              statusText = 'アップロード処理中...';
          }

          // Add success/failure counts if available
          if (status.successful_items > 0 || status.failed_items > 0) {
            statusText += ` (成功: ${status.successful_items}, 失敗: ${status.failed_items})`;
          }

          setUploadStatus(statusText);
          setCurrentFileName(currentFile);
        },
      );

      // Phase 3: Completion
      setUploadProgress(100);
      setUploadStatus('アップロード完了');
      setCurrentFileName('');

      // Handle results based on final status
      if (finalStatus.successful_items > 0) {
        toast({
          title: 'アップロード成功',
          description: `${finalStatus.successful_items}/${fileCount}枚の画像をアップロードしました`,
        });
        void fetchProjectItems(1);
        selectedFiles.forEach((file) => URL.revokeObjectURL(file.preview));
        setSelectedFiles([]);
      }

      if (finalStatus.failed_items > 0) {
        toast({
          title: finalStatus.successful_items > 0 ? '一部のアップロードが失敗' : 'アップロード失敗',
          description: `${finalStatus.failed_items}/${fileCount}枚の画像のアップロードが失敗しました`,
          variant: 'destructive',
        });
      }

      // Clear progress after delay
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
        setCurrentFileName('');
      }, 3000);
    } catch (error) {
      handleUploadError(error, setUploadStatus, toast);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
        setCurrentFileName('');
      }, 3000);
    }
  }, [selectedFiles, projectId, fetchProjectItems, toast]);

  // Upload files with progress tracking
  const uploadFiles = useCallback(async () => {
    if (!validateUploadConditions(selectedFiles, projectId, toast)) {
      return;
    }

    await handleFileUpload();
  }, [handleFileUpload, selectedFiles, projectId, toast]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && !loading) {
      void fetchProjectItems(newPage);
    }
  };

  const handlePageSizeChange = (newSize: string) => {
    const size = parseInt(newSize);
    setPageSize(size);
    setPage(1); // Reset to first page when changing page size
    void fetchProjectItems(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1); // Reset to first page when searching
  };

  // Helper functions for pagination
  const generateBeginningPages = (totalPages: number) => {
    const items = [];
    for (let i = 1; i <= 5; i++) {
      items.push(i);
    }
    items.push('ellipsis');
    items.push(totalPages);
    return items;
  };

  const generateEndPages = (totalPages: number) => {
    const items = [];
    items.push(1);
    items.push('ellipsis');
    for (let i = totalPages - 4; i <= totalPages; i++) {
      items.push(i);
    }
    return items;
  };

  const generateMiddlePages = (page: number, totalPages: number) => {
    const items = [];
    items.push(1);
    items.push('ellipsis');
    for (let i = page - 1; i <= page + 1; i++) {
      items.push(i);
    }
    items.push('ellipsis');
    items.push(totalPages);
    return items;
  };

  // Generate smart pagination items
  const generatePaginationItems = () => {
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      const items = [];
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
      return items;
    }

    if (page <= 4) {
      return generateBeginningPages(totalPages);
    }

    if (page >= totalPages - 3) {
      return generateEndPages(totalPages);
    }

    return generateMiddlePages(page, totalPages);
  };

  // Preview modal functions
  const openPreview = (index: number) => {
    if (index >= 0 && index < projectItems.length) {
      setSelectedImageIndex(index);
      setPreviewModalOpen(true);
    } else {
      console.error('Invalid preview index:', index, 'Valid range: 0 -', projectItems.length - 1);
    }
  };

  const closePreview = () => {
    setPreviewModalOpen(false);
  };

  const navigatePreview = useCallback(
    (direction: 'prev' | 'next') => {
      setSelectedImageIndex((prev) => {
        if (direction === 'prev') {
          return Math.max(0, prev - 1);
        }
        if (direction === 'next') {
          return Math.min(projectItems.length - 1, prev + 1);
        }
        return prev;
      });
    },
    [projectItems.length],
  );

  // Keyboard navigation for preview
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!previewModalOpen) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          navigatePreview('prev');
          break;
        case 'ArrowRight':
          event.preventDefault();
          navigatePreview('next');
          break;
        case 'Escape':
          event.preventDefault();
          closePreview();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [previewModalOpen, selectedImageIndex, projectItems.length, navigatePreview]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper function to check if file is TIFF
  const isTiffFile = (filename: string, contentType?: string): boolean => {
    const tiffExtensions = ['.tif', '.tiff'];
    const tiffMimeTypes = ['image/tiff', 'image/tif'];

    const hasExtension = tiffExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
    const hasMimeType = contentType ? tiffMimeTypes.includes(contentType.toLowerCase()) : false;

    return hasExtension || hasMimeType;
  };

  return (
    <div className="min-h-screen dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Compact Upload Section */}
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Upload className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">場面写や参考図鑑を登録</h2>
              </div>
              <UploadButton
                selectedFilesCount={selectedFiles.length}
                uploading={uploading}
                onUpload={() => void uploadFiles()}
              />
            </div>

            {/* Compact Drag and Drop Area */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-300 ${
                isDragActive
                  ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex items-center justify-center space-x-3">
                <Upload className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isDragActive ? 'ファイルをドロップ' : 'ドラッグ＆ドロップまたはクリック'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">全ての画像形式・AI・PSD・PDF　最大50MB</p>
                </div>
              </div>
            </div>

            {/* Compact File Preview */}
            <FilePreviewGrid selectedFiles={selectedFiles} onRemoveFile={removeFile} />
            <UploadProgress
              uploading={uploading}
              uploadStatus={uploadStatus}
              uploadProgress={uploadProgress}
              currentFileName={currentFileName}
            />
          </div>
        </Card>

        {/* Enhanced Project Reference Images */}
        <Card className="relative overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50/30 via-transparent to-gray-50/30"></div>
          <div className="relative p-8">
            <EmptyState show={projectItems.length === 0 && !loading} />
            {(projectItems.length > 0 || loading) && (
              <div className="space-y-8">
                {/* Clean Stats and Pagination Header */}
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 p-6 bg-gray-50 dark:bg-slate-700/50 rounded-2xl border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                        <ImageIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="absolute -top-1 -right-5 bg-blue-500 text-white text-xs font-bold rounded-full w-10 h-6 flex items-center justify-center border-2 border-white dark:border-slate-800">
                        {totalItems}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">参考画像一覧</h3>
                    </div>
                  </div>

                  {/* Search and Controls */}
                  <div className="flex flex-col sm:flex-row gap-4 lg:ml-auto items-center">
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="ファイル名で検索..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-48 h-8 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">表示件数:</span>
                      <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                        <SelectTrigger className="w-20 h-8 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="500">500</SelectItem>
                          <SelectItem value="1000">1000</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {totalPages > 1 && (
                      <div>
                        <Pagination>
                          <PaginationContent className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl p-2 shadow-sm border border-gray-200 dark:border-gray-600">
                            <PaginationItem>
                              <PaginationPrevious
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handlePageChange(page - 1);
                                }}
                                className={`rounded-lg transition-all duration-300 ${page <= 1 || loading ? 'pointer-events-none opacity-50' : 'hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105'}`}
                              />
                            </PaginationItem>

                            {renderPaginationItems(generatePaginationItems, page, loading, handlePageChange)}

                            <PaginationItem>
                              <PaginationNext
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handlePageChange(page + 1);
                                }}
                                className={`rounded-lg transition-all duration-300 ${page >= totalPages || loading ? 'pointer-events-none opacity-50' : 'hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105'}`}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </div>
                </div>

                {/* Clean Image Grid with Masonry Layout */}
                <div className="relative">
                  <div
                    ref={gridContainerRef}
                    className={`columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 2xl:columns-8 gap-6 space-y-6 transition-all duration-300 ${
                      loading && !isInitialLoad ? 'opacity-75' : 'opacity-100'
                    }`}
                    style={{
                      minHeight: preservedHeight ? `${preservedHeight}px` : undefined,
                    }}
                  >
                    {projectItems.map((item, index) => (
                      <ImageGridItem
                        key={item.id}
                        item={item}
                        index={index}
                        onOpenPreview={openPreview}
                        isTiffFile={isTiffFile}
                      />
                    ))}
                    {/* Gallery-level skeletons only for initial load to avoid distraction */}
                    {loading &&
                      isInitialLoad &&
                      Array.from({ length: Math.min(pageSize, 12) }).map((_, idx) => (
                        <div
                          key={`gallery-skeleton-${idx}`}
                          className="group break-inside-avoid mb-6 pointer-events-none"
                        >
                          <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 shadow-sm">
                            <Skeleton className="w-full aspect-square" />
                          </div>
                        </div>
                      ))}
                  </div>

                  <LoadingOverlay show={loading && isInitialLoad} />
                  <PageChangeLoadingIndicator show={loading && !isInitialLoad} />
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <ImagePreviewModal
        isOpen={previewModalOpen}
        onClose={closePreview}
        projectItems={projectItems}
        selectedImageIndex={selectedImageIndex}
        onNavigate={navigatePreview}
        isTiffFile={isTiffFile}
        formatFileSize={formatFileSize}
        formatDate={formatDate}
      />

      {/* PDF Confirmation Dialog */}
      <PDFConfirmationDialog
        isOpen={pdfConfirmationOpen}
        onClose={handlePdfCancel}
        onConfirm={handlePdfConfirm}
        pdfFile={pendingPdfFile}
        isProcessing={pdfProcessing}
      />

      {/* PDF Extraction Dialog */}
      <PDFExtractionDialog
        isOpen={pdfExtractionOpen}
        onClose={handlePdfExtractionClose}
        onSuccess={handlePdfExtractionSuccess}
        pdfFile={pendingPdfFile}
        projectId={projectId}
        pdfSession={pdfSession}
      />
    </div>
  );
}
