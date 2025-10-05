import { AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Progress } from '@/components/ui/Progress';
import { useToast } from '@/components/ui/use-toast';
import { PDFImageInfo, usePDFSession, UsePDFSessionReturn } from '@/hooks/usePDFSession';

interface PDFExtractionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (extractedCount: number) => void;
  pdfFile: File | null;
  projectId?: string;
  pdfSession?: UsePDFSessionReturn; // 可选的外部PDF session
}

// 生成图片的唯一标识符
const getImageUniqueId = (image: PDFImageInfo): string => {
  return `${image.page}-${image.index}-${image.hash}`;
};

export function PDFExtractionDialog({
  isOpen,
  onClose,
  onSuccess,
  pdfFile,
  projectId,
  pdfSession,
}: PDFExtractionDialogProps) {
  const { toast } = useToast();

  // 使用外部传入的session或创建内部session
  const internalSession = usePDFSession();
  const session = pdfSession || internalSession;
  const { sessionId, extractPreview, confirmExtraction, cleanupSession, extractionState } = session;

  const { isExtracting, error: sessionError } = extractionState;

  const [extractedImages, setExtractedImages] = useState<PDFImageInfo[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]); // 现在存储的是唯一ID而不是文件名
  const [currentStep, setCurrentStep] = useState<'extracting' | 'selecting' | 'confirming' | 'completed'>('extracting');
  const [statistics, setStatistics] = useState<{
    total_pages: number;
    total_images: number;
    duplicates_removed: number;
    small_images_skipped: number;
  } | null>(null);

  // PDF提取
  const handleExtractPDF = useCallback(async () => {
    if (!pdfFile) {
      return;
    }

    try {
      setCurrentStep('extracting');
      const result = await extractPreview(pdfFile, {
        skip_duplicates: true,
        min_size: 1000,
        thumbnail_size: 300,
      });

      setExtractedImages(result.extracted_images);
      setStatistics({
        total_pages: result.total_pages,
        total_images: result.total_images_found,
        duplicates_removed: result.duplicates_skipped,
        small_images_skipped: result.small_images_skipped,
      });
      // 默认选择所有图片
      setSelectedImages(result.extracted_images.map((img) => getImageUniqueId(img)));
      setCurrentStep('selecting');
    } catch (error) {
      console.error('PDF extraction failed:', error);
      toast({
        title: 'PDF抽出エラー',
        description: error instanceof Error ? error.message : 'PDF抽出に失敗しました',
        variant: 'destructive',
      });
    }
  }, [pdfFile, extractPreview, toast]);

  // 图片选择切换
  const toggleImageSelection = useCallback((imageId: string) => {
    setSelectedImages((prev) => (prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId]));
  }, []);

  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    if (selectedImages.length === extractedImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(extractedImages.map((img) => getImageUniqueId(img)));
    }
  }, [selectedImages.length, extractedImages]);

  // 确认提取
  const handleConfirmExtraction = useCallback(async () => {
    if (!sessionId || selectedImages.length === 0) {
      return;
    }

    try {
      setCurrentStep('confirming');
      // 将选中的唯一ID转换为文件名列表
      const selectedFilenames = extractedImages
        .filter((img) => selectedImages.includes(getImageUniqueId(img)))
        .map((img) => img.filename);

      const result = await confirmExtraction(selectedFilenames, projectId);

      if (result.moved_files && result.moved_files.length > 0) {
        setCurrentStep('completed');
        toast({
          title: 'PDF抽出完了',
          description: `${result.moved_files.length}枚の画像を正常に登録しました`,
        });

        // 延迟后关闭对话框并通知成功
        setTimeout(() => {
          onSuccess(result.moved_files.length);
          onClose();
        }, 2000);
      } else {
        // 即使没有moved_files，也应该设置为completed状态
        setCurrentStep('completed');
        toast({
          title: 'PDF抽出完了',
          description: '処理が完了しました',
        });
        setTimeout(() => {
          onSuccess(0);
          onClose();
        }, 2000);
      }

      if (result.errors && result.errors.length > 0) {
        toast({
          title: '一部の画像で問題が発生',
          description: `${result.errors.length}枚の画像で問題が発生しました`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Confirm extraction failed:', error);
      toast({
        title: '登録エラー',
        description: error instanceof Error ? error.message : '画像登録に失敗しました',
        variant: 'destructive',
      });
      setCurrentStep('selecting');
    }
  }, [sessionId, selectedImages, extractedImages, projectId, confirmExtraction, toast, onSuccess, onClose]);

  // 取消操作处理（清理session）
  const handleCancel = useCallback(() => {
    if (sessionId && currentStep !== 'completed') {
      void cleanupSession();
    }
    setCurrentStep('extracting');
    setExtractedImages([]);
    setSelectedImages([]);
    setStatistics(null);
    onClose();
  }, [sessionId, currentStep, cleanupSession, onClose]);

  // 关闭处理（不清理session，用于完成状态）
  const handleClose = useCallback(() => {
    setCurrentStep('extracting');
    setExtractedImages([]);
    setSelectedImages([]);
    setStatistics(null);
    onClose();
  }, [onClose]);

  // 自动开始提取
  useEffect(() => {
    if (isOpen && pdfFile && currentStep === 'extracting') {
      void handleExtractPDF();
    }
  }, [isOpen, pdfFile, currentStep, handleExtractPDF]);

  const renderProgressStep = () => {
    const steps = [
      { key: 'extracting', label: 'PDF解析中', active: currentStep === 'extracting' },
      { key: 'selecting', label: '画像選択', active: currentStep === 'selecting' },
      { key: 'confirming', label: '登録中', active: currentStep === 'confirming' },
      { key: 'completed', label: '完了', active: currentStep === 'completed' },
    ];

    return (
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div
              className={`flex items-center space-x-2 ${step.active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step.active
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                {index + 1}
              </div>
              <span className="text-sm font-medium">{step.label}</span>
            </div>
            {index < steps.length - 1 && <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-600 mx-4"></div>}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // 当用户点击关闭按钮时
        if (!open) {
          // 根据当前状态选择合适的关闭处理方式
          if (currentStep === 'completed' || sessionError) {
            // 已完成或出错：直接关闭，不清理session
            handleClose();
          } else if (currentStep === 'confirming') {
            // 确认处理中：不允许关闭，防止中断处理过程
            // 什么都不做，保持Dialog打开
            return;
          } else if (currentStep === 'extracting') {
            // 提取中：不允许关闭，防止中断提取过程
            return;
          } else {
            // 选择状态：允许取消并清理session
            handleCancel();
          }
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span>PDF画像抽出</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {renderProgressStep()}

          {/* 提取中 */}
          {currentStep === 'extracting' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">PDFから画像を抽出中...</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{pdfFile?.name}</p>
              </div>
              {isExtracting && (
                <div className="w-full max-w-md">
                  <Progress value={undefined} className="h-2" />
                </div>
              )}
            </div>
          )}

          {/* 图片选择 */}
          {currentStep === 'selecting' && (
            <div className="space-y-4">
              {/* 统计信息 */}
              {statistics && (
                <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-800 dark:text-green-200">
                      抽出完了: {statistics.total_images}枚の画像が見つかりました
                    </span>
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    ページ数: {statistics.total_pages} | 重複除外: {statistics.duplicates_removed}枚 | 小さい画像除外:{' '}
                    {statistics.small_images_skipped}枚
                  </div>
                </div>
              )}

              {/* 选择控制 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                    {selectedImages.length === extractedImages.length ? '全て解除' : '全て選択'}
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedImages.length} / {extractedImages.length} 枚選択
                  </span>
                </div>
              </div>

              {/* 图片网格 */}
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 max-h-96 overflow-y-auto">
                {extractedImages.map((image) => (
                  <div
                    key={`${image.page}-${image.index}-${image.hash}`}
                    className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImages.includes(getImageUniqueId(image))
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    onClick={() => toggleImageSelection(getImageUniqueId(image))}
                  >
                    <div className="aspect-square">
                      <img
                        src={image.thumbnail_url}
                        alt={`Page ${image.page} - ${image.index}`}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* 选择指示器 */}
                    <div
                      className={`absolute top-1 right-1 w-5 h-5 rounded-full border-2 border-white ${
                        selectedImages.includes(getImageUniqueId(image))
                          ? 'bg-blue-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      {selectedImages.includes(getImageUniqueId(image)) && (
                        <CheckCircle2 className="w-3 h-3 text-white absolute top-0.5 left-0.5" />
                      )}
                    </div>

                    {/* 页码标签 */}
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                      P{image.page}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 确认中 */}
          {currentStep === 'confirming' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600"></div>
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">画像を登録中...</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedImages.length}枚の画像を処理しています
                </p>
              </div>
            </div>
          )}

          {/* 完了 */}
          {currentStep === 'completed' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">登録完了！</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">画像が正常に登録されました</p>
              </div>
            </div>
          )}

          {/* 错误显示 */}
          {sessionError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="font-medium text-red-800 dark:text-red-200">エラーが発生しました</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{sessionError}</p>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
            {currentStep === 'selecting' && (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  キャンセル
                </Button>
                <Button
                  onClick={() => void handleConfirmExtraction()}
                  disabled={selectedImages.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {selectedImages.length}枚を登録
                </Button>
              </>
            )}

            {(currentStep === 'completed' || sessionError) && <Button onClick={handleClose}>閉じる</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
