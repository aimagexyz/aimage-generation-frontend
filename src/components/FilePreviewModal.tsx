import { FileText, Image, Play, Presentation } from 'lucide-react';
import { useCallback, useState } from 'react';
import { LuCheck, LuEye, LuTrash2, LuUpload, LuX } from 'react-icons/lu';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useToast } from '@/components/ui/use-toast';
import type { FilePreviewGroup, PreviewFile, UploadConfirmationResult } from '@/types/filePreview';
import { calculateUploadSummary, groupFilesByType } from '@/utils/filePreviewUtils';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: PreviewFile[];
  onConfirm: (result: UploadConfirmationResult) => void;
  onRemoveFile?: (fileId: string) => void;
  title?: string;
}

interface FileTypeIconProps {
  type: PreviewFile['type'];
  className?: string;
}

function FileTypeIcon({ type, className = 'w-5 h-5' }: FileTypeIconProps) {
  switch (type) {
    case 'image':
      return <Image className={className} />;
    case 'video':
      return <Play className={className} />;
    case 'pptx':
      return <Presentation className={className} />;
    case 'document':
      return <FileText className={className} />;
    default:
      return <FileText className={className} />;
  }
}

interface FilePreviewItemProps {
  file: PreviewFile;
  onRemove: (fileId: string) => void;
  onPreview?: (file: PreviewFile) => void;
}

function FilePreviewItem({ file, onRemove, onPreview }: FilePreviewItemProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const canPreview = file.type === 'image' || file.type === 'video';
  const hasPreviewUrl = Boolean(file.previewUrl);

  const renderPreview = () => {
    if (file.type === 'image' && hasPreviewUrl && !imageError) {
      return (
        <div className="relative w-full h-full">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <img
            src={file.previewUrl}
            alt={file.file.name}
            className="w-full h-full object-cover rounded border"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      );
    }

    if (file.type === 'video' && hasPreviewUrl) {
      return (
        <div className="relative w-full h-full bg-gray-100 rounded border flex items-center justify-center">
          <Play className="w-6 h-6 text-gray-400" />
          <video
            src={file.previewUrl}
            className="absolute inset-0 w-full h-full object-cover rounded opacity-0"
            muted
            onLoadedData={() => {
              // Video thumbnail generation could be implemented here if needed
            }}
          />
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-gray-100 rounded border flex items-center justify-center">
        <FileTypeIcon type={file.type} className="w-6 h-6 text-gray-400" />
      </div>
    );
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
      {/* File Preview/Icon */}
      <div className="relative w-12 h-12 flex-shrink-0">
        {renderPreview()}

        {/* Status indicator */}
        {file.status === 'error' && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <LuX className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-gray-900 truncate">{file.file.name}</h4>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{file.metadata?.extension}</span>
        </div>
        <p className="text-xs text-gray-500">{file.metadata?.formattedSize}</p>

        {file.error && <p className="text-xs text-red-600 mt-1">{file.error}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {canPreview && hasPreviewUrl && !file.error && onPreview && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onPreview(file)}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <LuEye className="w-4 h-4" />
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onRemove(file.id)}
          className="text-red-600 hover:bg-red-50"
        >
          <LuTrash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

interface FileGroupSectionProps {
  group: FilePreviewGroup;
  onRemoveFile: (fileId: string) => void;
  onPreviewFile?: (file: PreviewFile) => void;
}

function FileGroupSection({ group, onRemoveFile, onPreviewFile }: FileGroupSectionProps) {
  const errorFiles = group.files.filter((f) => f.status === 'error');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileTypeIcon type={group.type} className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-800">{group.displayName}</h3>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{group.files.length}件</span>
        {errorFiles.length > 0 && (
          <span className="text-sm text-red-600 bg-red-100 px-2 py-1 rounded">{errorFiles.length}件エラー</span>
        )}
      </div>

      <div className="space-y-2">
        {group.files.map((file) => (
          <FilePreviewItem key={file.id} file={file} onRemove={onRemoveFile} onPreview={onPreviewFile} />
        ))}
      </div>
    </div>
  );
}

export function FilePreviewModal({
  isOpen,
  onClose,
  files,
  onConfirm,
  onRemoveFile,
  title = 'ファイルアップロード確認',
}: FilePreviewModalProps) {
  const { toast } = useToast();
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<PreviewFile | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Use files directly from props - no local state duplication
  const previewFiles = files;

  const handleRemoveFile = useCallback(
    (fileId: string) => {
      // Delegate to parent component - no local state management
      if (onRemoveFile) {
        onRemoveFile(fileId);
      }
    },
    [onRemoveFile],
  );

  const handlePreviewFile = useCallback((file: PreviewFile) => {
    setSelectedPreviewFile(file);
    setIsPreviewModalOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    const validFilesCount = previewFiles.filter((f) => f.status !== 'error').length;

    if (validFilesCount === 0) {
      toast({
        title: 'エラー',
        description: 'アップロード可能なファイルがありません。',
        variant: 'destructive',
      });
      return;
    }

    const summary = calculateUploadSummary(previewFiles);

    const confirmedFiles = previewFiles
      .filter((f) => f.status !== 'error')
      .map((f) => ({ ...f, status: 'confirmed' as const }));

    onConfirm({
      confirmedFiles,
      totalSize: summary.totalSize,
      totalCount: summary.totalCount,
    });
  }, [previewFiles, onConfirm, toast]);

  const handleClose = useCallback(() => {
    // No cleanup here - parent component manages blob URLs
    onClose();
  }, [onClose]);

  const fileGroups = groupFilesByType(previewFiles);
  const summary = calculateUploadSummary(previewFiles);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {previewFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <LuUpload className="w-12 h-12 mb-4" />
                <p>アップロードするファイルがありません</p>
              </div>
            ) : (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  {fileGroups.map((group) => (
                    <FileGroupSection
                      key={group.type}
                      group={group}
                      onRemoveFile={handleRemoveFile}
                      onPreviewFile={handlePreviewFile}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {previewFiles.length > 0 && (
            <DialogFooter className="border-t pt-4">
              <div className="flex items-center justify-between w-full">
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <span>
                      合計: <strong>{summary.totalCount}件</strong>
                    </span>
                    <span>
                      サイズ: <strong>{summary.formattedTotalSize}</strong>
                    </span>
                    {summary.hasErrors && (
                      <span className="text-red-600">{summary.errorCount}件のエラーがあります</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={summary.totalCount === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <LuCheck className="w-4 h-4 mr-2" />
                    アップロード ({summary.totalCount}件)
                  </Button>
                </div>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Large Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl font-semibold">{selectedPreviewFile?.file.name}</DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-6 flex-1 overflow-hidden">
            {selectedPreviewFile && (
              <div className="flex items-center justify-center h-[75vh] bg-gray-50 rounded-lg">
                {(() => {
                  if (selectedPreviewFile.type === 'image' && selectedPreviewFile.previewUrl) {
                    return (
                      <img
                        src={selectedPreviewFile.previewUrl}
                        alt={selectedPreviewFile.file.name}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                      />
                    );
                  }

                  if (selectedPreviewFile.type === 'video' && selectedPreviewFile.previewUrl) {
                    return (
                      <video
                        src={selectedPreviewFile.previewUrl}
                        controls
                        className="max-w-full max-h-full rounded-lg shadow-lg"
                      >
                        <track kind="captions" srcLang="ja" label="Japanese" />
                      </video>
                    );
                  }

                  return (
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <FileTypeIcon type={selectedPreviewFile.type} className="w-16 h-16 mb-4" />
                      <p className="text-lg font-medium">{selectedPreviewFile.file.name}</p>
                      <p className="text-sm">{selectedPreviewFile.metadata?.formattedSize}</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
