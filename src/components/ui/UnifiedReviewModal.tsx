import { Loader2, Settings } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useTaskRecommendations } from '@/hooks/recommendations/useTaskRecommendations';
import { useReviewSets } from '@/hooks/reviewSets/useReviewSets';
import { useReviewPointDefinitions } from '@/hooks/rpd/useReviewPointDefinitions';
import type { AiReviewMode } from '@/types/aiReview';
import type {
  EnhancedRecommendation,
  ReviewItem,
  ReviewSelection,
  UnifiedReviewModalProps,
} from '@/types/UnifiedReview';

import { QuickAddSection } from './UnifiedReviewModal/QuickAddSection';
import { RecommendationSection } from './UnifiedReviewModal/RecommendationSection';
import { SelectionBar } from './UnifiedReviewModal/SelectionBar';

export function UnifiedReviewModal({
  isOpen,
  onClose,
  onConfirm,
  taskId,
  projectId,
  isProcessing = false,
  // selectedCharacter, // TODO: 未来可能需要用于角色过滤
  mode,
  defaultMode = 'quality',
}: UnifiedReviewModalProps) {
  // 状态管理
  const [selectedItems, setSelectedItems] = useState<ReviewItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [reviewMode, setReviewMode] = useState<AiReviewMode>(() => {
    try {
      const savedMode = localStorage.getItem('ai-review-mode');
      return (savedMode as AiReviewMode) || defaultMode;
    } catch {
      return defaultMode;
    }
  });

  // 数据获取
  const { data: recommendationsData, isLoading: isLoadingRecommendations } = useTaskRecommendations(
    taskId,
    projectId,
    0.0,
    isOpen && mode === 'initial', // 只在初期监修时获取推荐
  );

  const { data: reviewSets = [], isLoading: isLoadingReviewSets } = useReviewSets(projectId);
  const { data: rpds = [], isLoading: isLoadingRpds } = useReviewPointDefinitions(projectId);

  // 处理推荐数据
  const enhancedRecommendations = useMemo<EnhancedRecommendation[]>(() => {
    if (!recommendationsData?.recommendations) {
      return [];
    }

    return recommendationsData.recommendations
      .map((rec) => {
        const reviewSet = reviewSets.find((rs) => rs.id === rec.review_set_id);
        return {
          ...rec,
          review_set: reviewSet!,
        };
      })
      .filter((rec) => rec.review_set); // 过滤掉找不到review set的推荐
  }, [recommendationsData, reviewSets]);

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

  // 处理确认
  const handleStartReview = useCallback(async () => {
    if (isConfirming || isProcessing) {
      return;
    }

    try {
      setIsConfirming(true);

      const selection: ReviewSelection = {
        rpdIds: selectedItems.filter((item) => item.type === 'rpd').map((item) => item.id),
        reviewSetIds: selectedItems.filter((item) => item.type === 'review_set').map((item) => item.id),
        mode: reviewMode,
      };

      await onConfirm(selection);
      // Modal will be closed by parent component after successful confirmation
    } catch (error) {
      console.error('Review confirmation failed:', error);
      // Keep modal open on error so user can retry
    } finally {
      setIsConfirming(false);
    }
  }, [selectedItems, reviewMode, onConfirm, isConfirming, isProcessing]);

  // 处理关闭
  const handleClose = useCallback(() => {
    if (isConfirming || isProcessing) {
      return;
    }
    setSelectedItems([]);
    setSearchQuery('');
    onClose();
  }, [onClose, isConfirming, isProcessing]);

  // 处理键盘快捷键
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey && !isConfirming && !isProcessing && selectedItems.length > 0) {
        event.preventDefault();
        void handleStartReview();
      }
    },
    [handleStartReview, isConfirming, isProcessing, selectedItems.length],
  );

  const isDisabled = isConfirming || isProcessing;
  // const canStartReview = selectedItems.length > 0 && !isDisabled;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
        aria-describedby="unified-review-description"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {mode === 'initial' ? '監修設定' : '再監修設定'}
          </DialogTitle>
          <DialogDescription id="unified-review-description">
            {mode === 'initial'
              ? 'レビューセットまたは個別のレビューポイントを選択して監修を開始できます。'
              : 'レビューセットまたは個別のレビューポイントを選択して再監修を実行できます。'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* 已选择栏 */}
          <SelectionBar
            selectedItems={selectedItems}
            onRemove={handleRemoveItem}
            onClear={handleClearAll}
            onStartReview={() => void handleStartReview()}
            isProcessing={isDisabled}
            mode={reviewMode}
            onModeChange={handleModeChange}
          />

          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* 智能推荐区域 - 只在初期监修且有推荐数据时显示 */}
            {mode === 'initial' && (isLoadingRecommendations || enhancedRecommendations.length > 0) && (
              <RecommendationSection
                recommendations={enhancedRecommendations}
                selectedItems={selectedItems}
                onSelect={handleSelectItem}
                isLoading={isLoadingRecommendations}
              />
            )}

            {/* 快速添加区域 */}
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
        </div>

        {/* Footer Actions - 如果没有已选择的项目，显示提示 */}
        {selectedItems.length === 0 && (
          <div className="flex-shrink-0 py-1 px-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground text-center mb-0.5">
              {mode === 'initial'
                ? 'レビューセットまたは個別のレビューポイントを選択してください'
                : '選択なし：全てのレビューポイントで再監修を実行'}
            </p>
            {mode === 'rerun' && (
              <div className="flex justify-center">
                <Button onClick={() => void handleStartReview()} disabled={isDisabled} className="min-w-[120px]">
                  {isConfirming || isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      実行中...
                    </>
                  ) : (
                    '全RPDで再監修実行'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
