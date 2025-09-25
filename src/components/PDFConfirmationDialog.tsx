import { AlertTriangle, CheckCircle2, FileText, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

interface PDFConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pdfFile: File | null;
  isProcessing: boolean;
}

export function PDFConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  pdfFile,
  isProcessing,
}: PDFConfirmationDialogProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <span>PDFファイルが検出されました</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* PDF情報表示 */}
          {pdfFile && (
            <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">ファイル名</span>
                  <span className="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">{pdfFile.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">ファイルサイズ</span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">{formatFileSize(pdfFile.size)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">ファイル形式</span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">PDF</span>
                </div>
              </div>
            </div>
          )}

          {/* 警告メッセージ */}
          <div className="flex items-start space-x-3 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">PDFから画像を抽出します</p>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                このPDFファイルに含まれるすべての画像を抽出し、参考画像として登録します。
                抽出された画像は個別のアイテムとして管理され、元のPDFファイルも保存されます。
              </p>
            </div>
          </div>

          {/* 処理内容の説明 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">実行される処理：</h4>
            <div className="space-y-2">
              {[
                'PDFファイルから画像を抽出',
                '抽出した画像の圧縮と最適化',
                'ベクターデータベースへの登録',
                'AI検索可能な状態にする',
                '元のPDFファイルも保存',
              ].map((step, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
            <Button variant="outline" onClick={onClose} disabled={isProcessing} className="flex items-center space-x-2">
              <X className="h-4 w-4" />
              <span>キャンセル</span>
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isProcessing}
              className="bg-orange-600 hover:bg-orange-700 text-white flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>処理中...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>画像を抽出</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
