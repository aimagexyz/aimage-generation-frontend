import { motion } from 'framer-motion';
import { Calendar, Edit, FileText, MoreHorizontal, Tag, Trash2, Users } from 'lucide-react';
import React, { useCallback, useState } from 'react';

import type { ReviewSetOut } from '@/api/reviewSetsService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { useDeleteReviewSet } from '@/hooks/useReviewSets';
import { cn } from '@/utils/utils';

interface ReviewSetListItemProps {
  reviewSet: ReviewSetOut;
  isSelected: boolean;
  isBulkSelected?: boolean;
  onSelect: () => void;
  onBulkSelect?: (selected: boolean) => void;
  onRefresh: () => void;
  showBulkSelect?: boolean;
}

interface ActionsMenuProps {
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isDeleting: boolean;
}

interface MetadataIndicatorProps {
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  label: string;
  tooltip: string;
}

/**
 * Actions dropdown menu component
 */
function ActionsMenu({ onEdit, onDelete, isDeleting }: ActionsMenuProps): JSX.Element {
  return (
    <div className="flex-shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-accent hover:text-accent-foreground"
            aria-label="More actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="font-medium cursor-pointer"
          >
            <Edit className="w-4 h-4 mr-2 text-blue-600" />
            レビューセット編集
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            disabled={isDeleting}
            className="font-medium cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? '削除中...' : 'レビューセット削除'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * Metadata indicator with tooltip
 */
function MetadataIndicator({ icon: Icon, count, label, tooltip }: MetadataIndicatorProps): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Icon className="w-3 h-3" />
          <span className="font-medium">{count}</span>
          <span className="hidden sm:inline">{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Memoize the component to prevent unnecessary re-renders
function ReviewSetListItemComponent({
  reviewSet,
  isSelected,
  isBulkSelected,
  onSelect,
  onBulkSelect,
  onRefresh,
  showBulkSelect,
}: ReviewSetListItemProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const deleteReviewSetMutation = useDeleteReviewSet();

  // Memoize event handlers
  const handleEdit = useCallback(() => {
    // Edit functionality would be implemented here
    console.log('Edit review set:', reviewSet.id);
  }, [reviewSet.id]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteConfirmOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    void deleteReviewSetMutation
      .mutateAsync(reviewSet.id)
      .then(() => {
        onRefresh();
        setIsDeleteConfirmOpen(false);
      })
      .catch((error) => {
        console.error('Failed to delete review set:', error);
      });
  }, [deleteReviewSetMutation, reviewSet.id, onRefresh]);

  const handleCloseDeleteConfirm = useCallback(() => {
    setIsDeleteConfirmOpen(false);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Calculate metadata
  const rpdCount = reviewSet.rpds?.length || 0;
  const characterCount = reviewSet.characters?.length || 0;
  const taskTagCount = reviewSet.task_tags?.length || 0;

  return (
    <>
      {/* Enhanced card with animations and improved design */}
      <motion.div
        className="group"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <Card
          className={cn(
            'p-4 cursor-pointer transition-all duration-300 hover:shadow-lg',
            'border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden',
            'hover:border-border focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
            isSelected &&
              'ring-2 ring-primary border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5 shadow-lg',
          )}
          onClick={onSelect}
          role="button"
          aria-pressed={isSelected}
          tabIndex={0}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect();
            }
          }}
        >
          <div className="flex items-start justify-between">
            {/* Bulk Selection Checkbox */}
            {showBulkSelect && (
              <div className="flex-shrink-0 mr-3 mt-1">
                <Checkbox
                  checked={isBulkSelected || false}
                  onCheckedChange={(checked) => {
                    if (onBulkSelect) {
                      onBulkSelect(checked === true);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`${reviewSet.name}を選択`}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              {/* Review Set Name */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {reviewSet.name}
                </h3>
              </div>

              {/* Description */}
              {reviewSet.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                  {reviewSet.description}
                </p>
              )}

              {/* Enhanced Metadata */}
              <div className="flex items-center gap-4 flex-wrap">
                <MetadataIndicator
                  icon={FileText}
                  count={rpdCount}
                  label="RPD"
                  tooltip={`${rpdCount}個のレビューポイント定義`}
                />
                <MetadataIndicator
                  icon={Users}
                  count={characterCount}
                  label="キャラクター"
                  tooltip={`${characterCount}個のキャラクター`}
                />
                {taskTagCount > 0 && (
                  <MetadataIndicator
                    icon={Tag}
                    count={taskTagCount}
                    label="タグ"
                    tooltip={`${taskTagCount}個のタスクタグ`}
                  />
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(reviewSet.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Enhanced Actions */}
            <ActionsMenu onEdit={handleEdit} onDelete={handleDelete} isDeleting={deleteReviewSetMutation.isPending} />
          </div>
        </Card>
      </motion.div>

      {/* Enhanced Delete Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <Card className="p-6 max-w-md mx-4 shadow-xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">レビューセットを削除</h3>
                  <p className="text-sm text-muted-foreground">
                    「{reviewSet.name}」を削除しますか？この操作は取り消せません。
                  </p>
                </div>
              </div>

              {/* Warning info */}
              {(rpdCount > 0 || characterCount > 0) && (
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    このレビューセットには{rpdCount}個のRPDと{characterCount}個のキャラクターが関連付けられています。
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={handleCloseDeleteConfirm}>
                  キャンセル
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={confirmDelete}
                  disabled={deleteReviewSetMutation.isPending}
                  className="min-w-[80px]"
                >
                  {deleteReviewSetMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      削除中...
                    </div>
                  ) : (
                    '削除'
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

const ReviewSetListItem = React.memo(ReviewSetListItemComponent);

export default ReviewSetListItem;
