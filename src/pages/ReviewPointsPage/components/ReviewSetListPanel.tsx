import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

import type { ReviewSetOut } from '@/api/reviewSetsService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { cn } from '@/utils/utils';

import ReviewSetCreateModal from './ReviewSetCreateModal';
import ReviewSetListItem from './ReviewSetListItem';

interface ReviewSetListPanelProps {
  reviewSets: ReviewSetOut[];
  selectedReviewSet: ReviewSetOut | null;
  onSelectReviewSet: (reviewSet: ReviewSetOut) => void;
  projectId: string;
  onRefresh: () => void;
}

export default function ReviewSetListPanel({
  reviewSets,
  selectedReviewSet,
  onSelectReviewSet,
  projectId,
  onRefresh,
}: ReviewSetListPanelProps): JSX.Element {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Memoize filtered review sets to prevent unnecessary recalculations
  const filteredReviewSets = useMemo(() => {
    if (!searchQuery) {
      return reviewSets;
    }

    const searchLower = searchQuery.toLowerCase();
    return reviewSets.filter((reviewSet) => {
      const nameMatch = reviewSet.name.toLowerCase().includes(searchLower);
      const descriptionMatch = reviewSet.description?.toLowerCase().includes(searchLower);
      return nameMatch || descriptionMatch;
    });
  }, [reviewSets, searchQuery]);

  // Memoize callbacks to prevent child re-renders
  const handleCreateClick = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Memoize header content
  const headerContent = useMemo(
    () => (
      <div className="flex flex-col flex-shrink-0 gap-3 p-4 border-b border-border/50">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="レビューセットを検索..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9 bg-background/50 backdrop-blur-sm"
            aria-label="レビューセットを検索"
          />
        </div>

        {/* Header with count and create button */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="font-semibold text-foreground">
            レビューセット ({filteredReviewSets.length}
            {reviewSets.length !== filteredReviewSets.length && ` / ${reviewSets.length}`})
          </h2>
          <Button onClick={handleCreateClick} size="sm">
            新規作成
          </Button>
        </div>
      </div>
    ),
    [searchQuery, handleSearchChange, filteredReviewSets.length, reviewSets.length, handleCreateClick],
  );

  // Memoize empty state
  const emptyState = useMemo(() => {
    if (filteredReviewSets.length === 0 && searchQuery === '') {
      return (
        <>
          {headerContent}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-muted-foreground">
                <p className="text-lg font-medium">レビューセットがありません</p>
                <p className="text-sm">最初のレビューセットを作成してみましょう</p>
              </div>
              <Button onClick={handleCreateClick}>レビューセットを作成</Button>
            </div>
          </div>
        </>
      );
    }
    return null;
  }, [filteredReviewSets.length, searchQuery, headerContent, handleCreateClick]);

  // Memoize list content with reduced animation complexity
  const listContent = useMemo(
    () => (
      <>
        {headerContent}
        <ScrollArea className="flex-1">
          {filteredReviewSets.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">検索結果がありません</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {filteredReviewSets.map((reviewSet) => (
                <ReviewSetListItem
                  key={reviewSet.id}
                  reviewSet={reviewSet}
                  isSelected={selectedReviewSet?.id === reviewSet.id}
                  onSelect={() => onSelectReviewSet(reviewSet)}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </>
    ),
    [headerContent, filteredReviewSets, selectedReviewSet?.id, onSelectReviewSet, onRefresh],
  );

  return (
    <motion.div
      className={cn('flex flex-col border-r bg-background/50 backdrop-blur-sm border-border/50', 'w-[480px] min-w-0')}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {emptyState || listContent}

      <AnimatePresence>
        {isCreateModalOpen && (
          <ReviewSetCreateModal
            isOpen={isCreateModalOpen}
            onClose={handleCloseCreateModal}
            projectId={projectId}
            onSuccess={onRefresh}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
