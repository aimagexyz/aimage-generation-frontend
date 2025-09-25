import React, { useCallback, useState } from 'react';

import { pdfService } from '../api/pdfService';
import { PDFExtractionResult, PDFImageInfo, usePDFSession } from '../hooks/usePDFSession';

interface ImageCardProps {
  image: PDFImageInfo;
  isSelected: boolean;
  isRecommended: boolean;
  reasons?: string[];
  onToggle: (filename: string) => void;
}

function ImageCard({ image, isSelected, isRecommended, reasons, onToggle }: ImageCardProps) {
  return (
    <div
      className={`border-2 rounded-lg p-2 cursor-pointer transition-colors ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onToggle(image.filename)}
    >
      <div className="relative">
        <img
          src={image.thumbnail_url}
          alt={image.filename}
          className="w-full h-32 object-contain bg-gray-100 rounded"
          loading="lazy"
        />
        {isRecommended && (
          <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1 rounded">推荐</div>
        )}
        {isSelected && <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">✓</div>}
      </div>

      <div className="mt-2 text-xs space-y-1">
        <div className="font-semibold truncate" title={image.filename}>
          {image.filename}
        </div>
        <div className="text-gray-600">
          {image.dimensions} • {pdfService.formatFileSize(image.size_bytes)}
        </div>
        {isRecommended && reasons && <div className="text-green-600">{reasons.join(', ')}</div>}
      </div>
    </div>
  );
}

interface PDFImageExtractorProps {
  /**
   * 目标项目ID（可选）
   */
  projectId?: string;
  /**
   * 确认提取完成的回调
   */
  onExtractionComplete?: (finalUrls: string[]) => void;
  /**
   * 取消操作的回调
   */
  onCancel?: () => void;
}

export function PDFImageExtractor({ projectId, onExtractionComplete, onCancel }: PDFImageExtractorProps) {
  const { isSessionActive, extractPreview, confirmExtraction, cleanupSession, extractionState } = usePDFSession();

  const [extractionResult, setExtractionResult] = useState<PDFExtractionResult | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // 提取选项
  const [extractionOptions, setExtractionOptions] = useState({
    thumbnail_size: 300,
    min_size: 1000,
    skip_duplicates: true,
  });

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      if (file.type !== 'application/pdf') {
        alert('请选择PDF文件');
        return;
      }

      try {
        const result = await extractPreview(file, extractionOptions);
        setExtractionResult(result);

        // 自动选择推荐的图片
        const { recommended } = pdfService.getDownloadSuggestions(result.extracted_images);
        setSelectedImages(new Set(recommended));
      } catch (error) {
        console.error('PDF提取失败:', error);
        alert(`PDF提取失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    },
    [extractPreview, extractionOptions],
  );

  const handleImageToggle = useCallback((filename: string) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(filename)) {
        newSet.delete(filename);
      } else {
        newSet.add(filename);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!extractionResult) {
      return;
    }
    setSelectedImages(new Set(extractionResult.extracted_images.map((img) => img.filename)));
  }, [extractionResult]);

  const handleSelectNone = useCallback(() => {
    setSelectedImages(new Set());
  }, []);

  const handleSelectRecommended = useCallback(() => {
    if (!extractionResult) {
      return;
    }
    const { recommended } = pdfService.getDownloadSuggestions(extractionResult.extracted_images);
    setSelectedImages(new Set(recommended));
  }, [extractionResult]);

  const handleConfirm = useCallback(async () => {
    if (selectedImages.size === 0) {
      alert('请至少选择一张图片');
      return;
    }

    try {
      const result = await confirmExtraction(Array.from(selectedImages), projectId);

      if (result.errors.length > 0) {
        console.warn('部分文件处理失败:', result.errors);
        alert(`部分文件处理失败:\n${result.errors.join('\n')}`);
      }

      onExtractionComplete?.(result.final_urls);
    } catch (error) {
      console.error('确认提取失败:', error);
      alert(`确认提取失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [selectedImages, confirmExtraction, projectId, onExtractionComplete]);

  const handleCancel = useCallback(async () => {
    try {
      await cleanupSession();
      onCancel?.();
    } catch (error) {
      console.error('清理会话失败:', error);
    }
  }, [cleanupSession, onCancel]);

  const renderImageGrid = () => {
    if (!extractionResult) {
      return null;
    }

    const groupedByPage = pdfService.groupImagesByPage(extractionResult.extracted_images);
    const stats = pdfService.getImageStats(extractionResult.extracted_images);
    const { recommended, reasons } = pdfService.getDownloadSuggestions(extractionResult.extracted_images);

    return (
      <div className="space-y-6">
        {/* 统计信息 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">提取统计</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">总页数:</span>
              <span className="ml-1 font-semibold">{extractionResult.total_pages}</span>
            </div>
            <div>
              <span className="text-gray-600">发现图片:</span>
              <span className="ml-1 font-semibold">{extractionResult.total_images_found}</span>
            </div>
            <div>
              <span className="text-gray-600">提取图片:</span>
              <span className="ml-1 font-semibold">{extractionResult.images_extracted}</span>
            </div>
            <div>
              <span className="text-gray-600">总大小:</span>
              <span className="ml-1 font-semibold">{pdfService.formatFileSize(stats.totalSize)}</span>
            </div>
          </div>

          {extractionResult.errors.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <h4 className="text-red-800 font-semibold">处理错误:</h4>
              <ul className="text-red-700 text-sm mt-1">
                {extractionResult.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 选择操作 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            全选 ({extractionResult.images_extracted})
          </button>
          <button
            onClick={handleSelectNone}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            全不选
          </button>
          <button
            onClick={handleSelectRecommended}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            选择推荐 ({recommended.length})
          </button>
          <div className="text-sm text-gray-600 flex items-center">
            已选择: {selectedImages.size} / {extractionResult.images_extracted}
          </div>
        </div>

        {/* 按页面分组显示图片 */}
        {Object.entries(groupedByPage)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([pageNum, images]) => (
            <div key={pageNum} className="border rounded-lg p-4">
              <h4 className="text-md font-semibold mb-3">
                第 {pageNum} 页 ({images.length} 张图片)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((image) => (
                  <ImageCard
                    key={`${image.page}-${image.index}-${image.hash}`}
                    image={image}
                    isSelected={selectedImages.has(image.filename)}
                    isRecommended={recommended.includes(image.filename)}
                    reasons={reasons[image.filename]}
                    onToggle={handleImageToggle}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>
    );
  };

  if (!isSessionActive) {
    return (
      <div className="text-center p-8">
        <div className="text-gray-600">会话已结束</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-2xl font-bold mb-6">PDF图片提取工具</h2>

        {!extractionResult ? (
          <div className="space-y-6">
            {/* 文件选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">选择PDF文件</label>
              <input
                type="file"
                accept=".pdf"
                onChange={(event) => {
                  void handleFileSelect(event);
                }}
                disabled={extractionState.isExtracting}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {/* 高级选项 */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showAdvancedOptions ? '隐藏' : '显示'}高级选项
              </button>

              {showAdvancedOptions && (
                <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">缩略图尺寸 (px)</label>
                    <input
                      type="number"
                      min="100"
                      max="800"
                      value={extractionOptions.thumbnail_size}
                      onChange={(e) =>
                        setExtractionOptions((prev) => ({
                          ...prev,
                          thumbnail_size: parseInt(e.target.value) || 300,
                        }))
                      }
                      className="mt-1 block w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">最小文件大小 (bytes)</label>
                    <input
                      type="number"
                      min="0"
                      value={extractionOptions.min_size}
                      onChange={(e) =>
                        setExtractionOptions((prev) => ({
                          ...prev,
                          min_size: parseInt(e.target.value) || 1000,
                        }))
                      }
                      className="mt-1 block w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={extractionOptions.skip_duplicates}
                        onChange={(e) =>
                          setExtractionOptions((prev) => ({
                            ...prev,
                            skip_duplicates: e.target.checked,
                          }))
                        }
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">跳过重复图片</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* 提取状态 */}
            {extractionState.isExtracting && (
              <div className="text-center py-8">
                <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-blue-700">正在提取PDF图片...</span>
                </div>
              </div>
            )}

            {extractionState.error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-red-800 font-semibold">提取失败</div>
                <div className="text-red-700 text-sm mt-1">{extractionState.error}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {renderImageGrid()}

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => {
                  void handleCancel();
                }}
                disabled={extractionState.isConfirming}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={() => {
                  void handleConfirm();
                }}
                disabled={selectedImages.size === 0 || extractionState.isConfirming}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {extractionState.isConfirming ? '处理中...' : `确认提取 (${selectedImages.size})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
