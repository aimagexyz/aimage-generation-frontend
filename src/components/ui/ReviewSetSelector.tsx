import { Check, Loader2, Package, Settings } from 'lucide-react';
import { forwardRef, useMemo, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { useReviewSets } from '@/hooks/reviewSets/useReviewSets';
import { useReviewPointDefinitions } from '@/hooks/rpd/useReviewPointDefinitions';
import type { ReviewSetCardProps, ReviewSetSelectorProps } from '@/types/ReviewSet';

import { Badge } from './Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card';
import { MultiSelectCombobox } from './MultiSelectCombobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';

/**
 * Individual ReviewSet Card Component
 * SOLID: Single responsibility for displaying and handling ReviewSet selection
 */
const ReviewSetCard = forwardRef<HTMLDivElement, ReviewSetCardProps>(
  ({ reviewSet, isSelected, onToggle, disabled = false, className }, ref) => {
    const rpdTitles = reviewSet.rpds?.map((rpd) => rpd.current_version_title || rpd.key) || [];
    const rpdCount = reviewSet.rpds?.length || 0;
    const characterCount = reviewSet.characters?.length || 0;
    const tagCount = reviewSet.task_tags?.length || 0;

    return (
      <Card
        ref={ref}
        className={twMerge(
          'cursor-pointer transition-all hover:bg-accent/50',
          isSelected && 'border-primary bg-primary/5',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
        onClick={() => !disabled && onToggle(reviewSet.id)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-medium truncate">{reviewSet.name}</CardTitle>
              {reviewSet.description && (
                <CardDescription className="text-sm text-muted-foreground mt-1">
                  {reviewSet.description}
                </CardDescription>
              )}
            </div>
            <div
              className={twMerge(
                'flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary ml-3 flex-shrink-0',
                isSelected ? 'bg-primary text-primary-foreground' : 'bg-background',
              )}
            >
              {isSelected && <Check className="h-3 w-3" />}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {/* RPD Count and Preview */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>{rpdCount} レビューポイント</span>
              {(characterCount > 0 || tagCount > 0) && (
                <span className="text-xs">
                  + {characterCount} キャラクター, {tagCount} タグ
                </span>
              )}
            </div>

            {/* RPD Badge Preview */}
            {rpdTitles.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {rpdTitles.slice(0, 3).map((title, index) => (
                  <Badge key={index} variant="outline" className="text-xs px-2 py-1">
                    {title}
                  </Badge>
                ))}
                {rpdTitles.length > 3 && (
                  <Badge variant="outline" className="text-xs px-2 py-1">
                    +{rpdTitles.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  },
);

ReviewSetCard.displayName = 'ReviewSetCard';

/**
 * Main ReviewSetSelector Component
 * KISS: Simple tabbed interface
 * SOLID: Single component responsibility
 * DRY: Reuses MultiSelectCombobox for individual RPDs
 */
const ReviewSetSelector = forwardRef<HTMLDivElement, ReviewSetSelectorProps>(
  (
    {
      projectId,
      selectedRpdIds,
      onRpdSelectionChange,
      selectedReviewSetIds,
      onReviewSetSelectionChange,
      className,
      disabled = false,
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState<string>('review-sets');

    // Fetch data using hooks
    const { data: reviewSets = [], isLoading: isLoadingReviewSets, error: reviewSetsError } = useReviewSets(projectId);

    const { data: rpds = [], isLoading: isLoadingRpds, error: rpdsError } = useReviewPointDefinitions(projectId);

    // Transform RPDs for MultiSelectCombobox
    const rpdOptions = useMemo(() => {
      const sortedRpds = [...rpds].sort((a, b) => a.title.localeCompare(b.title));
      return sortedRpds.map((rpd) => ({
        value: rpd.id,
        label: rpd.title,
        isRecommended: false,
      }));
    }, [rpds]);

    // Handle ReviewSet selection
    const handleReviewSetToggle = (reviewSetId: string) => {
      if (selectedReviewSetIds.includes(reviewSetId)) {
        // Remove from selection
        onReviewSetSelectionChange(selectedReviewSetIds.filter((id) => id !== reviewSetId));
      } else {
        // Add to selection
        onReviewSetSelectionChange([...selectedReviewSetIds, reviewSetId]);
      }
    };

    // Calculate total selections for display
    const totalSelections = selectedReviewSetIds.length + selectedRpdIds.length;
    const hasSelections = totalSelections > 0;

    return (
      <div ref={ref} className={twMerge('w-full', className)}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="review-sets" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span>レビューセット</span>
              {selectedReviewSetIds.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-2 py-0.5 text-xs">
                  {selectedReviewSetIds.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>個別選択</span>
              {selectedRpdIds.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-2 py-0.5 text-xs">
                  {selectedRpdIds.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="review-sets" className="space-y-4 max-h-[500px] overflow-y-auto">
            {/* Loading state */}
            {isLoadingReviewSets && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">レビューセットを読み込み中...</span>
              </div>
            )}

            {/* Error state */}
            {reviewSetsError && (
              <div className="py-8 text-center">
                <p className="text-sm text-destructive">レビューセットの読み込みに失敗しました</p>
              </div>
            )}

            {/* Empty state */}
            {!isLoadingReviewSets && !reviewSetsError && reviewSets.length === 0 && (
              <div className="py-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">このプロジェクトにはレビューセットがありません</p>
                <p className="text-xs text-muted-foreground mt-1">
                  個別選択タブで個別のレビューポイントを選択してください
                </p>
              </div>
            )}

            {/* ReviewSet Cards */}
            {!isLoadingReviewSets && reviewSets.length > 0 && (
              <div className="max-h-[350px] overflow-y-auto pr-2">
                <div className="space-y-3">
                  {reviewSets.map((reviewSet) => (
                    <ReviewSetCard
                      key={reviewSet.id}
                      reviewSet={reviewSet}
                      isSelected={selectedReviewSetIds.includes(reviewSet.id)}
                      onToggle={handleReviewSetToggle}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="individual" className="space-y-4 max-h-[500px] overflow-y-auto">
            {/* Loading state */}
            {isLoadingRpds && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">レビューポイントを読み込み中...</span>
              </div>
            )}

            {/* Error state */}
            {rpdsError && (
              <div className="py-8 text-center">
                <p className="text-sm text-destructive">レビューポイントの読み込みに失敗しました</p>
              </div>
            )}

            {/* Individual RPD Selection */}
            {!isLoadingRpds && !rpdsError && (
              <MultiSelectCombobox
                options={rpdOptions}
                selectedValues={selectedRpdIds}
                onChange={onRpdSelectionChange}
                placeholder="レビューポイントを選択..."
                searchPlaceholder="レビューポイントを検索..."
                emptyMessage="レビューポイントが見つかりません"
                disabled={disabled}
                maxDisplayedItems={3}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Selection Summary */}
        {hasSelections && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                選択中: {selectedReviewSetIds.length} セット + {selectedRpdIds.length} 個別
              </span>
              <button
                type="button"
                onClick={() => {
                  onReviewSetSelectionChange([]);
                  onRpdSelectionChange([]);
                }}
                className="text-destructive hover:text-destructive/80 text-xs"
                disabled={disabled}
              >
                すべてクリア
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
);

ReviewSetSelector.displayName = 'ReviewSetSelector';

export { ReviewSetCard, ReviewSetSelector };
export type { ReviewSetCardProps, ReviewSetSelectorProps };
