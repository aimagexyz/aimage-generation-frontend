import { pdf } from '@react-pdf/renderer';
import { FileText, Image as ImageIcon, Loader2, Video } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { EnhancedVideoDocument } from '@/services/pdfExport/components/EnhancedVideoDocument';
import { ImageAnnotationService } from '@/services/pdfExport/imageAnnotationService';
import { VideoFrameService } from '@/services/pdfExport/videoFrameService';

import { type Annotation } from '../FrameAnnotation/useFrameAnnotation';

interface UnifiedPDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'video' | 'image';
  annotations: Annotation[];
  subtaskName?: string;
  onGenerationStart?: () => void;
  onGenerationComplete?: () => void;
}

interface ProcessedMedia {
  type: 'video' | 'image';
  data: string; // base64 data URL
  annotation?: Annotation;
  timestamp?: number; // for video frames
}

/**
 * Unified PDF Preview Modal - Supports both Video and Image subtasks
 * KISS: Detect media type → Process accordingly → Generate unified PDF
 */
export function UnifiedPDFPreviewModal({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  annotations,
  subtaskName = 'メディアレビュー',
  onGenerationStart,
  onGenerationComplete,
}: UnifiedPDFPreviewModalProps) {
  const [processedMedia, setProcessedMedia] = useState<ProcessedMedia[]>([]);
  const [pdfDataURL, setPdfDataURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  // Filter annotations based on media type
  const relevantAnnotations =
    mediaType === 'video'
      ? annotations.filter((ann) => ann.start_at !== undefined && ann.start_at !== null)
      : annotations.filter((ann) => ann.rect !== undefined); // Images need rect data

  /**
   * Step 1: Process media based on type
   */
  const processMedia = useCallback(async () => {
    /**
     * Process video media - extract frames with overlays
     */
    const processVideoMedia = async (): Promise<ProcessedMedia[]> => {
      if (!VideoFrameService.isVideoSupported(mediaUrl)) {
        throw new Error('ビデオフォーマットがサポートされていません');
      }

      // Debug annotation data
      VideoFrameService.debugAnnotationData(annotations);

      // Extract frames with overlays
      const frames = await VideoFrameService.extractAnnotationFrames(mediaUrl, relevantAnnotations);

      // Update progress
      setProcessingProgress({ current: frames.length, total: relevantAnnotations.length });

      // Convert to unified format
      return frames.map((frame) => ({
        type: 'video' as const,
        data: frame.frameData,
        annotation: frame.annotation,
        timestamp: frame.timestamp,
      }));
    };

    /**
     * Process image media - create annotated image
     */
    const processImageMedia = async (): Promise<ProcessedMedia[]> => {
      if (!ImageAnnotationService.isImageFormatSupported(mediaUrl)) {
        throw new Error('画像フォーマットがサポートされていません');
      }

      // Debug logging for annotations
      console.debug('Processing image annotations:', annotations.length);

      // First, run comprehensive diagnostics
      const diagnostics = await ImageAnnotationService.diagnoseImageUrl(mediaUrl);

      if (!diagnostics.isValid) {
        // If format is the only issue and it's actually supported, proceed anyway
        if (diagnostics.issues.length === 1 && diagnostics.issues[0].includes('Unsupported image format')) {
          console.log('⚠️ Only format issue detected, proceeding with image loading test...');
        } else {
          // For now, let's be more lenient and log the issues but continue processing
          console.warn('⚠️ Image validation issues detected:', diagnostics.issues);
          console.warn('⚠️ Suggestions:', diagnostics.suggestions);
          console.log('🔄 Proceeding with processing despite validation issues...');
        }
      }

      try {
        // Create annotated image
        const annotatedImageData = await ImageAnnotationService.createAnnotatedImage(mediaUrl, relevantAnnotations);

        // Update progress
        setProcessingProgress({ current: 1, total: 1 });

        // Return single annotated image
        return [
          {
            type: 'image' as const,
            data: annotatedImageData,
            annotation: relevantAnnotations[0], // Use first annotation for metadata
          },
        ];
      } catch (error) {
        console.error('❌ createAnnotatedImage failed:', error);
        throw error;
      }
    };

    try {
      setError(null);
      setIsProcessing(true);
      setProcessingProgress({ current: 0, total: relevantAnnotations.length });
      onGenerationStart?.();

      if (relevantAnnotations.length === 0) {
        throw new Error(`${mediaType === 'video' ? 'ビデオ' : '画像'}に有効なアノテーションが見つかりません`);
      }

      let results: ProcessedMedia[] = [];

      if (mediaType === 'video') {
        results = await processVideoMedia();
      } else if (mediaType === 'image') {
        results = await processImageMedia();
      } else {
        throw new Error('サポートされていないメディアタイプです');
      }

      // Sort frames by timestamp for videos
      if (mediaType === 'video' && results.length > 1) {
        results.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      }

      setProcessedMedia(results);
      setIsProcessing(false);
      onGenerationComplete?.();
    } catch (error) {
      const mediaTypeJapanese = mediaType === 'video' ? 'ビデオ' : '画像';
      setError(error instanceof Error ? error.message : `${mediaTypeJapanese}の処理に失敗しました`);
      setIsProcessing(false);
      onGenerationComplete?.();
    }
  }, [relevantAnnotations, mediaType, onGenerationStart, onGenerationComplete, mediaUrl, annotations]);

  /**
   * Step 2: Generate PDF from processed media
   */
  const generatePDFFromMedia = async () => {
    try {
      setError(null);
      setIsGeneratingPDF(true);

      // Convert processed media to frames format expected by EnhancedVideoDocument
      const frames = processedMedia.map((item) => ({
        timestamp: item.timestamp || 0,
        frameData: item.data,
        annotation: item.annotation || {
          id: 'default',
          text: `${mediaType} annotation`,
          type: 'annotation' as const,
          timestamp: new Date().toISOString(),
          version: 1,
        },
      }));

      const pdfDocument = React.createElement(EnhancedVideoDocument, {
        frames,
        videoUrl: mediaType === 'video' ? mediaUrl : undefined,
        taskInfo: { name: subtaskName, id: 'current-task' },
      });
      const pdfBlob = await pdf(pdfDocument as React.ReactElement).toBlob();
      const dataURL = URL.createObjectURL(pdfBlob);

      setPdfDataURL(dataURL);
      setIsGeneratingPDF(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'PDF生成に失敗しました');
      setIsGeneratingPDF(false);
    }
  };

  /**
   * Format timestamp for display (video only)
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Cleanup on close
   */
  const handleClose = () => {
    if (pdfDataURL) {
      URL.revokeObjectURL(pdfDataURL);
      setPdfDataURL(null);
    }
    setProcessedMedia([]);
    setError(null);
    setIsProcessing(false);
    setIsGeneratingPDF(false);
    setProcessingProgress({ current: 0, total: 0 });
    onClose();
  };

  // Auto-process when modal opens
  useEffect(() => {
    if (isOpen && processedMedia.length === 0 && !isProcessing && !error) {
      void processMedia();
    }
  }, [isOpen, processedMedia.length, isProcessing, error, processMedia]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pdfDataURL) {
        URL.revokeObjectURL(pdfDataURL);
      }
    };
  }, [pdfDataURL]);

  // Get media type icon and Japanese labels
  const MediaIcon = mediaType === 'video' ? Video : ImageIcon;
  const mediaTypeLabel = mediaType === 'video' ? 'ビデオ' : '画像';
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <div className="flex-1 p-6">
          {/* Step 1: Media Processing Loading */}
          {isProcessing && (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <div className="text-center">
                <h3 className="font-medium mb-2">{mediaTypeLabel}を処理中...</h3>
                <p className="text-sm text-gray-600">
                  {mediaType === 'video'
                    ? `フレーム ${processingProgress.current} / ${processingProgress.total} を抽出中`
                    : 'アノテーションオーバーレイを適用中...'}
                </p>
                <div className="mt-4 w-64">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${processingProgress.total > 0 ? (processingProgress.current / processingProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Show Processed Media */}
          {!isProcessing && processedMedia.length > 0 && !pdfDataURL && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{processedMedia.length}つのコメントをPDFにまとめる</h3>
                <Button
                  onClick={() => void generatePDFFromMedia()}
                  disabled={isGeneratingPDF}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isGeneratingPDF ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      レポート作成中...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      レポート作成
                    </>
                  )}
                </Button>
              </div>

              {/* Single Frame Layout */}
              {processedMedia.length === 1 ? (
                <div className="flex flex-col lg:flex-row gap-6 max-h-[60vh]">
                  {/* Main Image Area - 70% width on desktop */}
                  <div className="flex-1 lg:flex-[0_0_70%]">
                    <div className="relative bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                      <img
                        src={processedMedia[0].data}
                        alt={`${mediaTypeLabel} 1`}
                        className="w-full h-full max-h-[50vh] object-contain bg-gray-50"
                      />
                    </div>
                  </div>

                  {/* Information Panel - 30% width on desktop */}
                  <div className="lg:flex-[0_0_30%] space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      {/* Frame Info */}
                      <div className="flex items-center gap-2">
                        <MediaIcon className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-900">
                          {mediaType === 'video' ? 'フレーム 1' : '画像 1'}
                        </span>
                      </div>

                      {/* Timestamp for video */}
                      {mediaType === 'video' && (
                        <div className="space-y-2">
                          <div className="text-sm text-gray-600">タイムスタンプ</div>
                          <Badge variant="secondary" className="font-mono">
                            {formatTime(processedMedia[0].timestamp || 0)}
                          </Badge>
                        </div>
                      )}

                      {/* Annotation Text */}
                      {processedMedia[0].annotation?.text && (
                        <div className="space-y-2">
                          <div className="text-sm text-gray-600">アノテーション</div>
                          <div className="text-sm text-gray-900 bg-white p-3 rounded border">
                            {processedMedia[0].annotation.text}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Multi-Frame Grid Layout */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                  {processedMedia.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          <MediaIcon className="w-4 h-4 inline mr-2" />
                          {mediaType === 'video'
                            ? `フレーム ${index + 1} - ${formatTime(item.timestamp || 0)}`
                            : `画像 ${index + 1}`}
                        </span>
                        <div className="flex items-center gap-2">
                          {mediaType === 'video' && (
                            <Badge variant="secondary" className="text-xs">
                              {formatTime(item.timestamp || 0)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="relative">
                        <img
                          src={item.data}
                          alt={`${mediaTypeLabel} ${index + 1}`}
                          className="w-full h-52 object-contain bg-gray-100 rounded border"
                        />
                      </div>

                      {item.annotation?.text && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{item.annotation.text}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: PDF Preview */}
          {pdfDataURL && !isGeneratingPDF && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">PDFプレビュー</h3>
                <Button onClick={() => setPdfDataURL(null)} variant="outline" size="sm">
                  {mediaTypeLabel}に戻る
                </Button>
              </div>
              <div className="w-full h-[calc(90vh-250px)] border rounded-lg overflow-hidden">
                <iframe
                  src={pdfDataURL}
                  className="w-full h-full"
                  title={`${mediaTypeLabel} PDFプレビュー`}
                  style={{ border: 'none' }}
                />
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isProcessing && !isGeneratingPDF && (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
              <Alert className="max-w-md">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button onClick={() => void processMedia()} variant="outline">
                再試行
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isProcessing && processedMedia.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
              <MediaIcon className="w-12 h-12 text-gray-400" />
              <div className="text-center">
                <h3 className="font-medium mb-2">処理された{mediaTypeLabel}がありません</h3>
                <p className="text-sm text-gray-600">
                  「再試行」をクリックして{mediaTypeLabel}のアノテーションを処理してください。
                </p>
              </div>
              <Button onClick={() => void processMedia()} variant="default">
                {mediaTypeLabel}を処理
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
