// import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Edit, FileText, RefreshCw, Tag, Users, X } from 'lucide-react';
import { useState } from 'react';

import type { ReviewSetOut } from '@/api/reviewSetsService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Separator } from '@/components/ui/Separator';
import { useUpdateReviewSet } from '@/hooks/useReviewSets';

import { CharacterPickerModal } from './CharacterPickerModal';
import { DetailPanelPlaceholder } from './DetailPanelPlaceholder';
import ReviewSetEditModal from './ReviewSetEditModal';
import { RPDPickerModal } from './RPDPickerModal';
import { TaskTagPickerModal } from './TaskTagPickerModal';

interface ReviewSetDetailPanelProps {
  reviewSet: ReviewSetOut | null;
  onRefresh: () => void;
  onReviewSetUpdate?: (updatedReviewSet: ReviewSetOut) => void;
}

export default function ReviewSetDetailPanel({ reviewSet, onRefresh, onReviewSetUpdate }: ReviewSetDetailPanelProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRPDPickerModalOpen, setIsRPDPickerModalOpen] = useState(false);
  const [isTaskTagPickerModalOpen, setIsTaskTagPickerModalOpen] = useState(false);
  const [isCharacterPickerModalOpen, setIsCharacterPickerModalOpen] = useState(false);

  // Hook for updating review set
  const updateReviewSetMutation = useUpdateReviewSet();
  // const queryClient = useQueryClient();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleManageRpds = () => {
    setIsRPDPickerModalOpen(true);
  };

  const handleManageTags = () => {
    setIsTaskTagPickerModalOpen(true);
  };

  const handleManageCharacters = () => {
    setIsCharacterPickerModalOpen(true);
  };

  const handleRPDSelectionConfirm = (selectedRpdIds: string[]) => {
    if (!reviewSet) {
      return;
    }

    updateReviewSetMutation.mutate(
      {
        reviewSetId: reviewSet.id,
        data: {
          rpd_ids: selectedRpdIds,
        },
      },
      {
        onSuccess: (updatedReviewSet) => {
          // 首先更新缓存
          onRefresh();

          // 然后通过回调更新父组件的selectedReviewSet状态
          if (onReviewSetUpdate) {
            onReviewSetUpdate(updatedReviewSet);
          }

          setIsRPDPickerModalOpen(false);
        },
      },
    );
  };

  const handleTaskTagSelectionConfirm = (selectedTagIds: string[]) => {
    if (!reviewSet) {
      return;
    }

    updateReviewSetMutation.mutate(
      {
        reviewSetId: reviewSet.id,
        data: {
          task_tag_ids: selectedTagIds,
        },
      },
      {
        onSuccess: (updatedReviewSet) => {
          // 首先更新缓存
          onRefresh();

          // 然后通过回调更新父组件的selectedReviewSet状态
          if (onReviewSetUpdate) {
            onReviewSetUpdate(updatedReviewSet);
          }

          setIsTaskTagPickerModalOpen(false);
        },
      },
    );
  };

  const handleCharacterSelectionConfirm = (selectedCharacterIds: string[]) => {
    if (!reviewSet) {
      return;
    }

    updateReviewSetMutation.mutate(
      {
        reviewSetId: reviewSet.id,
        data: {
          character_ids: selectedCharacterIds,
        },
      },
      {
        onSuccess: (updatedReviewSet) => {
          // 首先更新缓存
          onRefresh();

          // 然后通过回调更新父组件的selectedReviewSet状态
          if (onReviewSetUpdate) {
            onReviewSetUpdate(updatedReviewSet);
          }

          setIsCharacterPickerModalOpen(false);
        },
      },
    );
  };

  const handleRemoveCharacter = (characterId: string) => {
    if (!reviewSet) {
      return;
    }

    // 获取当前关联的角色ID列表，移除指定的角色
    const currentCharacterIds = reviewSet.characters?.map((char) => char.id) || [];
    const updatedCharacterIds = currentCharacterIds.filter((id) => id !== characterId);

    updateReviewSetMutation.mutate(
      {
        reviewSetId: reviewSet.id,
        data: {
          character_ids: updatedCharacterIds,
        },
      },
      {
        onSuccess: (updatedReviewSet) => {
          // 首先更新缓存
          onRefresh();

          // 然后通过回调更新父组件的selectedReviewSet状态
          if (onReviewSetUpdate) {
            onReviewSetUpdate(updatedReviewSet);
          }
        },
      },
    );
  };

  if (!reviewSet) {
    return <DetailPanelPlaceholder text="レビューセットを選択してください" />;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b bg-card">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-foreground truncate mb-2">{reviewSet.name}</h1>

            {reviewSet.description && <p className="text-sm text-muted-foreground mb-3">{reviewSet.description}</p>}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>作成: {formatDate(reviewSet.created_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>更新: {formatDate(reviewSet.updated_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              更新
            </Button>
            <Button variant="default" size="sm" onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-2" />
              編集
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="max-w-4xl space-y-4">
          {/* 関連RPDセクション */}
          <Collapsible defaultOpen>
            <Card>
              <CollapsibleTrigger className="w-full p-4 text-left hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">関連RPD</h3>
                    <span className="text-sm text-muted-foreground">({reviewSet.rpds?.length || 0}件)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleManageRpds();
                    }}
                    disabled={updateReviewSetMutation.isPending}
                  >
                    管理
                  </Button>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Separator />
                <div className="p-4">
                  {reviewSet.rpds && reviewSet.rpds.length > 0 ? (
                    <div className="space-y-2">
                      {reviewSet.rpds.map((rpd) => (
                        <motion.div
                          key={rpd.id}
                          className="p-3 rounded-lg border bg-card hover:bg-muted/50"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <h4 className="font-medium text-sm">{rpd.current_version_title || rpd.key}</h4>
                          <p className="text-xs text-muted-foreground mt-1">キー: {rpd.key}</p>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      関連するRPDがありません。「管理」ボタンから追加してください。
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* 関連キャラクターセクション */}
          <Collapsible defaultOpen>
            <Card>
              <CollapsibleTrigger className="w-full p-4 text-left hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">関連キャラクター</h3>
                    <span className="text-sm text-muted-foreground">({reviewSet.characters?.length || 0}件)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleManageCharacters();
                    }}
                    disabled={updateReviewSetMutation.isPending}
                  >
                    管理
                  </Button>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Separator />
                <div className="p-4">
                  {reviewSet.characters && reviewSet.characters.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {reviewSet.characters.map((character) => (
                        <motion.div
                          key={character.id}
                          className="group inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 shadow-sm"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          whileHover={{ scale: 1.02 }}
                          layout
                        >
                          <span className="truncate max-w-[100px]" title={character.name}>
                            {character.name}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all duration-200 ml-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCharacter(character.id);
                            }}
                            disabled={updateReviewSetMutation.isPending}
                            title={`${character.name}を削除`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      関連するキャラクターがいません。「管理」ボタンから追加してください。
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* 関連タスクタグセクション */}
          <Collapsible defaultOpen>
            <Card>
              <CollapsibleTrigger className="w-full p-4 text-left hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">関連タスクタグ</h3>
                    <span className="text-sm text-muted-foreground">({reviewSet.task_tags?.length || 0}件)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleManageTags();
                    }}
                    disabled={updateReviewSetMutation.isPending}
                  >
                    管理
                  </Button>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Separator />
                <div className="p-4">
                  {reviewSet.task_tags && reviewSet.task_tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {reviewSet.task_tags.map((tag) => (
                        <motion.div
                          key={tag.id}
                          className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {tag.name}
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">関連するタスクタグがありません。</p>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Modals */}
      <AnimatePresence>
        {isEditModalOpen && (
          <ReviewSetEditModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            reviewSet={reviewSet}
            onSuccess={() => {
              setIsEditModalOpen(false);
              onRefresh();
            }}
          />
        )}

        {isRPDPickerModalOpen && (
          <RPDPickerModal
            isOpen={isRPDPickerModalOpen}
            onClose={() => setIsRPDPickerModalOpen(false)}
            onConfirm={handleRPDSelectionConfirm}
            projectId={reviewSet.project_id}
            initialSelectedIds={reviewSet.rpds?.map((rpd) => rpd.id) || []}
          />
        )}

        {isTaskTagPickerModalOpen && (
          <TaskTagPickerModal
            isOpen={isTaskTagPickerModalOpen}
            onClose={() => setIsTaskTagPickerModalOpen(false)}
            onConfirm={handleTaskTagSelectionConfirm}
            projectId={reviewSet.project_id}
            initialSelectedIds={reviewSet.task_tags?.map((tag) => tag.id) || []}
          />
        )}

        {isCharacterPickerModalOpen && (
          <CharacterPickerModal
            isOpen={isCharacterPickerModalOpen}
            onClose={() => setIsCharacterPickerModalOpen(false)}
            onConfirm={handleCharacterSelectionConfirm}
            projectId={reviewSet.project_id}
            initialSelectedIds={reviewSet.characters?.map((character) => character.id) || []}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
