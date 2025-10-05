import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { QuickAddSection } from '@/components/ui/UnifiedReviewModal/QuickAddSection';
import { SelectionBar } from '@/components/ui/UnifiedReviewModal/SelectionBar';
import { useBatchReviewWithSets } from '@/hooks/aiReview/useBatchReviewWithSets';
import { useReviewSets } from '@/hooks/reviewSets/useReviewSets';
import { useReviewPointDefinitions } from '@/hooks/rpd/useReviewPointDefinitions';
import type { AiReviewMode } from '@/types/aiReview';
import type { BatchReviewConfig, BatchReviewModalProps } from '@/types/BatchReview';
import type { ReviewItem } from '@/types/UnifiedReview';

/**
 * BatchReviewModal Component
 *
 * SOLID Principles:
 * - Single Responsibility: Handles batch review modal UI and state only
 * - Open/Closed: Extends existing modal patterns without modification
 * - Dependency Inversion: Uses UnifiedReviewModal components
 *
 * DRY Principles:
 * - Reuses existing modal components (Dialog, Button, etc.)
 * - Reuses UnifiedReviewModal components (SelectionBar, QuickAddSection)
 * - Follows established state management patterns
 */
export function BatchReviewModal({ isOpen, onClose, selectedTaskIds, projectId }: BatchReviewModalProps) {
  // 使用新的统一选择组件的状态管理
  const [selectedItems, setSelectedItems] = useState<ReviewItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewMode, setReviewMode] = useState<AiReviewMode>(() => {
    try {
      const savedMode = localStorage.getItem('ai-review-mode');
      return (savedMode as AiReviewMode) || 'quality';
    } catch {
      return 'quality';
    }
  });

  // 数据获取
  const { data: reviewSets = [], isLoading: isLoadingReviewSets } = useReviewSets(projectId);
  const { data: rpds = [], isLoading: isLoadingRpds } = useReviewPointDefinitions(projectId);

  // DRY: Use real batch processing hook
  const {
    error: batchError,
    startBatchReview,
    // 新增：简化的批处理状态
    simpleBatch,
    navigateToBatchResults,
    resetBatchState,
  } = useBatchReviewWithSets();

  // 过滤搜索结果
  const filteredReviewSets = useMemo(() => {
    if (!searchQuery) {
      return reviewSets;
    }
    const query = searchQuery.toLowerCase();
    return reviewSets.filter(
      (set) =>
        set.name.toLowerCase().includes(query) ||
        set.description?.toLowerCase().includes(query) ||
        set.rpds?.some((rpd) => (rpd.current_version_title || rpd.key).toLowerCase().includes(query)),
    );
  }, [reviewSets, searchQuery]);

  const filteredRpds = useMemo(() => {
    if (!searchQuery) {
      return rpds;
    }
    const query = searchQuery.toLowerCase();
    return rpds.filter(
      (rpd) => (rpd.title || rpd.key).toLowerCase().includes(query) || rpd.key.toLowerCase().includes(query),
    );
  }, [rpds, searchQuery]);

  // 处理选择
  const handleSelectItem = useCallback((item: ReviewItem) => {
    setSelectedItems((prev) => {
      const exists = prev.some((selected) => selected.id === item.id && selected.type === item.type);
      if (exists) {
        return prev;
      } // 防重复选择
      return [...prev, item];
    });
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedItems([]);
  }, []);

  // 处理模式变更
  const handleModeChange = useCallback((newMode: AiReviewMode) => {
    setReviewMode(newMode);
    try {
      localStorage.setItem('ai-review-mode', newMode);
    } catch (error) {
      console.warn('Failed to save AI review mode to localStorage:', error);
    }
  }, []);

  // 注意：不再自动显示结果modal，因为现在是提交确认模式

  // SOLID: Single responsibility - handle batch start action
  const handleBatchStart = useCallback(async () => {
    if (simpleBatch.isSubmitting) {
      return;
    }

    // Validate selection - must have at least one RPD or ReviewSet
    if (selectedItems.length === 0) {
      // Button is already disabled, so this should not happen in normal flow
      return;
    }

    try {
      const config: BatchReviewConfig = {
        rpdIds: selectedItems.filter((item) => item.type === 'rpd').map((item) => item.id),
        reviewSetIds: selectedItems.filter((item) => item.type === 'review_set').map((item) => item.id),
        selectedTaskIds,
        projectId,
      };

      // Use the real batch processing hook
      await startBatchReview(config);

      // Note: Modal will show submission confirmation and then can be closed
    } catch (error) {
      // Only log actual unexpected errors, not normal operation flow
      if (error instanceof Error && error.message !== 'Processing was cancelled by user') {
        console.error('Batch submission failed:', error);
      }
      // Keep modal open on error so user can retry
    }
  }, [selectedItems, selectedTaskIds, projectId, startBatchReview, simpleBatch.isSubmitting]);

  // SOLID: Single responsibility - handle modal close with state cleanup
  const handleClose = useCallback(() => {
    // Prevent closing during active submitting
    if (simpleBatch.isSubmitting) {
      return;
    }

    // KISS: Reset state when closing
    setSelectedItems([]);
    setSearchQuery('');
    // 重置批处理状态，确保重新打开时是全新的状态
    resetBatchState();
    onClose();
  }, [onClose, simpleBatch.isSubmitting, resetBatchState]);

  return (
    <>
      {/* Main Batch Configuration Modal */}
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>バッチレビュー - {selectedTaskIds.length} タスク</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* Task Selection Summary */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">選択されたタスク:</h4>
              <p className="text-sm text-gray-600">
                {selectedTaskIds.length} タスクが選択されたレビュー条件で処理されます。
              </p>
            </div>

            {/* 已选择栏 */}
            <SelectionBar
              selectedItems={selectedItems}
              onRemove={handleRemoveItem}
              onClear={handleClearAll}
              onStartReview={() => void handleBatchStart()}
              isProcessing={simpleBatch.isSubmitting}
              mode={reviewMode}
              onModeChange={handleModeChange}
            />

            {/* DRY: 使用新的统一选择组件 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">レビューポイントまたはレビューセット:</h4>
              <QuickAddSection
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                reviewSets={filteredReviewSets}
                rpds={filteredRpds}
                selectedItems={selectedItems}
                onSelect={handleSelectItem}
                isLoading={isLoadingReviewSets || isLoadingRpds}
              />
            </div>

            {/* 提交状态显示 */}
            {simpleBatch.isSubmitting && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <p className="text-sm text-blue-700">処理依頼を送信中...</p>
                </div>
              </div>
            )}

            {/* 提交成功显示 */}
            {simpleBatch.isSubmitted && simpleBatch.batchInfo && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-green-800 mb-2">✅ バッチ処理依頼完了</h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>
                        <strong>処理ID:</strong> {simpleBatch.batchInfo.batchId}
                      </p>
                      <p>
                        <strong>サブタスク数:</strong> {simpleBatch.batchInfo.submittedTaskCount}件
                      </p>
                      <p>
                        <strong>処理モード:</strong> {simpleBatch.batchInfo.mode}
                      </p>
                      <p>
                        <strong>送信時刻:</strong> {simpleBatch.batchInfo.submittedAt.toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => navigateToBatchResults(simpleBatch.batchInfo!.batchId, projectId)}
                        className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                      >
                        📊 処理結果ページへ
                      </button>
                      <button
                        onClick={handleClose}
                        className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                      >
                        閉じる
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error display */}
            {(batchError || simpleBatch.error) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{batchError || simpleBatch.error}</p>
              </div>
            )}
          </div>

          {/* Fixed Action buttons at bottom */}
          <div className="flex-shrink-0 border-t pt-4 mt-4">
            <div className="flex justify-end gap-2">
              {(() => {
                if (simpleBatch.isSubmitting) {
                  return (
                    <Button variant="outline" disabled className="h-9 px-4">
                      送信中...
                    </Button>
                  );
                }

                if (simpleBatch.isSubmitted) {
                  // 提交成功后按钮在上面的成功区域显示
                  return null;
                }

                // 默认状态：显示关闭和开始按钮
                return (
                  <>
                    <Button variant="outline" onClick={handleClose} className="h-9 px-4">
                      閉じる
                    </Button>
                    <Button
                      onClick={() => void handleBatchStart()}
                      disabled={selectedItems.length === 0}
                      className="h-9 px-4"
                    >
                      バッチレビューを開始
                    </Button>
                  </>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
