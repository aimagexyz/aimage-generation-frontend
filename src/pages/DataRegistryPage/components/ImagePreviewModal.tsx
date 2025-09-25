import { Calendar, ChevronLeft, ChevronRight, Download, FileImage, FileText, HardDrive } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

interface ProjectItem {
  id: string;
  filename: string;
  image_url: string;
  content_type: string;
  file_size: number;
  created_at: string;
  source_type?: string;
  description?: string;
  pdf_page_number?: number;
  pdf_image_index?: number;
}

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectItems: ProjectItem[];
  selectedImageIndex: number;
  onNavigate: (direction: 'prev' | 'next') => void;
  isTiffFile: (filename: string, contentType?: string) => boolean;
  formatFileSize: (bytes: number) => string;
  formatDate: (dateString: string) => string;
}

function TiffFileDisplay() {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 p-12 bg-white dark:bg-slate-800 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="relative">
        <div className="p-6 bg-gray-100 dark:bg-gray-700 rounded-2xl">
          <FileImage className="h-20 w-20 text-gray-600 dark:text-gray-400" />
        </div>
        <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full p-1 text-xs font-bold min-w-[20px] h-5 flex items-center justify-center">
          T
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">TIFF ファイル</h3>
        <div className="space-y-2">
          <p className="text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
            TIFFファイルはブラウザで直接表示できません。
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">ファイル情報は右側のパネルでご確認ください。</p>
        </div>
      </div>
    </div>
  );
}

function PDFSourceInfo({ item }: { item: ProjectItem }) {
  if (item.source_type !== 'pdf_extracted') {
    return null;
  }

  const extractPdfFilename = (description?: string) => {
    if (description) {
      const match = /PDF「(.+?)」から抽出/.exec(description);
      return match ? match[1] : 'PDFファイル';
    }
    return 'PDFファイル';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">PDF抽出情報</h3>
      </div>

      <div className="space-y-3">
        {/* PDF Source File */}
        <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-white dark:bg-slate-700 rounded-md shadow-sm">
              <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">抽出元ファイル</span>
          </div>
          <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 break-all leading-relaxed">
            {extractPdfFilename(item.description)}
          </div>
        </div>

        {/* PDF Page */}
        <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-white dark:bg-slate-700 rounded-md shadow-sm">
              <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PDFページ情報</span>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.pdf_page_number}ページ</div>
            {item.pdf_image_index !== undefined && (
              <div className="text-xs text-gray-600 dark:text-gray-400">{item.pdf_image_index + 1}番目の画像</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImagePreviewModal({
  isOpen,
  onClose,
  projectItems,
  selectedImageIndex,
  onNavigate,
  isTiffFile,
  formatFileSize,
  formatDate,
}: ImagePreviewModalProps) {
  const currentItem = projectItems[selectedImageIndex];

  if (!currentItem) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0 overflow-hidden bg-white dark:bg-slate-900 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-xl">
        <DialogHeader className="relative p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="text-xl font-semibold flex items-center space-x-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <FileImage className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <span className="text-gray-900 dark:text-white">画像プレビュー</span>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({selectedImageIndex + 1} / {projectItems.length})
                </span>
              </div>
            </div>
          </DialogTitle>
          <Button
            variant="outline"
            size="sm"
            className="absolute right-12 top-6"
            onClick={() => {
              const link = document.createElement('a');
              link.href = currentItem.image_url;
              link.download = currentItem.filename || 'image';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            ダウンロード
          </Button>
        </DialogHeader>

        <div className="relative flex flex-col lg:flex-row h-full">
          {/* Clean Image Display */}
          <div className="flex-1 relative bg-gray-50 dark:bg-gray-900 flex items-center justify-center min-h-[500px] p-8">
            {isTiffFile(currentItem.image_url, currentItem.content_type) ? (
              <TiffFileDisplay />
            ) : (
              <div className="relative max-w-full max-h-full">
                <img
                  src={currentItem.image_url}
                  alt={currentItem.filename}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg"
                />
              </div>
            )}

            {/* Clean Navigation Arrows */}
            {projectItems.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-600 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-lg p-3"
                  onClick={() => onNavigate('prev')}
                  disabled={selectedImageIndex === 0}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-600 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-lg p-3"
                  onClick={() => onNavigate('next')}
                  disabled={selectedImageIndex === projectItems.length - 1}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>

          {/* Clean Information Panel */}
          <div className="lg:w-80 p-6 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-gray-700">
            <div className="space-y-6">
              {/* File Name Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <FileImage className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    ファイル名
                  </h3>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-sm text-gray-900 dark:text-gray-100 break-all font-mono">{currentItem.filename}</p>
                </div>
              </div>

              {/* File Details Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    ファイル詳細
                  </h3>
                </div>

                <div className="space-y-3">
                  {/* File Size */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white dark:bg-slate-700 rounded-md shadow-sm">
                        <HardDrive className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">ファイルサイズ</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formatFileSize(currentItem.file_size)}
                    </span>
                  </div>

                  {/* File Type */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white dark:bg-slate-700 rounded-md shadow-sm">
                        <FileImage className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">ファイル形式</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {currentItem.content_type}
                    </span>
                  </div>

                  {/* Upload Date */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white dark:bg-slate-700 rounded-md shadow-sm">
                        <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">アップロード日時</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatDate(currentItem.created_at)}
                      </div>
                    </div>
                  </div>
                </div>

                <PDFSourceInfo item={currentItem} />
              </div>

              {/* Navigation for Mobile */}
              {projectItems.length > 1 && (
                <div className="lg:hidden pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate('prev')}
                      disabled={selectedImageIndex === 0}
                      className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      前の画像
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate('next')}
                      disabled={selectedImageIndex === projectItems.length - 1}
                      className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      次の画像
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
