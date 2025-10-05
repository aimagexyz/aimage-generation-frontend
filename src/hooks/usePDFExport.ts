import { useCallback } from 'react';

import { useToast } from '@/components/ui/use-toast';

/**
 * PDF Export Hook
 * SOLID: Single responsibility for PDF export functionality
 * KISS: Simple export logic
 * DRY: Reusable across different PDF components
 */
interface UsePDFExportOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function usePDFExport({ onSuccess, onError }: UsePDFExportOptions = {}) {
  const { toast } = useToast();

  /**
   * Export PDF from preview blob
   * SOLID: Single responsibility for export
   */
  const exportPDF = useCallback(
    (blob: Blob, filename: string = 'export.pdf') => {
      try {
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;

        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up
        URL.revokeObjectURL(url);

        // Success feedback
        toast({
          title: 'エクスポート完了',
          description: 'PDFファイルのダウンロードが開始されました。',
        });

        onSuccess?.();
      } catch (error) {
        console.error('Export failed:', error);
        const exportError = error instanceof Error ? error : new Error('Export failed');

        toast({
          title: 'エクスポートエラー',
          description: 'PDFのエクスポートに失敗しました。',
          variant: 'destructive',
        });

        onError?.(exportError);
      }
    },
    [toast, onSuccess, onError],
  );

  /**
   * Export with validation
   * SOLID: Single responsibility for validated export
   */
  const exportWithValidation = useCallback(
    (blob: Blob | null, filename?: string) => {
      if (!blob) {
        const error = new Error('プレビューが生成されていません。');
        toast({
          title: 'エラー',
          description: error.message,
          variant: 'destructive',
        });
        onError?.(error);
        return;
      }

      exportPDF(blob, filename);
    },
    [exportPDF, toast, onError],
  );

  return {
    exportPDF,
    exportWithValidation,
  };
}
