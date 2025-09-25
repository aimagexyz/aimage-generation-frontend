import { memo, useState } from 'react';
import {
  LuChevronLeft,
  LuChevronRight,
  LuCircle,
  LuCopy,
  LuLoader,
  LuPencil,
  LuRedo2,
  LuStar,
  LuX,
} from 'react-icons/lu';

import type { CharacterDetail } from '@/api/charactersService';
import type { ItemSearchByImageResponse } from '@/api/itemsService';
import type { components } from '@/api/schemas';
import { updateSubtaskDetails } from '@/api/tasks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { AiReviewResult } from '@/types/aiReview';
import {
  SUBTASK_TYPE_LABELS,
  type SubtaskData,
  type SubtaskStatus,
  type SubtaskUpdateStatusValue,
  type TaskType,
} from '@/types/tasks';

import { SubtaskContent } from '../Subtask/SubtaskContent';
import { SubtaskList } from '../Subtask/SubtaskList';
import type { FindingInteractionType } from './AiReviewPanel';
import { CopySubtaskDialog } from './CopySubtaskDialog';
import { EditSubtaskModal } from './EditSubtaskModal';

type SubtaskOut = components['schemas']['SubtaskOut'];

function getSubtaskTypeLabel(taskType?: TaskType) {
  if (!taskType) {
    return 'Unknown';
  }
  return SUBTASK_TYPE_LABELS[taskType] || 'Unknown';
}

interface SubtaskContentWrapperProps {
  subtask: SubtaskData;
  subtasks: SubtaskOut[];
  currentSubtaskId: string | undefined;
  onSubtaskSelect: (subtaskId: string) => void;
  onVersionChange: (version: number) => void;
  aiReviewResult: AiReviewResult | null;
  activeFindingId: string | null;
  onFindingInteraction: (action: FindingInteractionType, findingId: string) => void;
  canUpdateAsset?: boolean;
  isAiReviewing?: boolean;
  onAssetFileUpdate?: (file: File) => Promise<void>;
  isUpdatingAsset?: boolean;
  onUpdateSubtaskStatus: (newStatus: SubtaskUpdateStatusValue) => void;
  isUpdatingStatus: boolean;
  onNavigateToSubtask: (direction: 'next' | 'prev') => void;
  hasPreviousSubtask: boolean;
  hasNextSubtask: boolean;
  projectId: string;
  selectedCharacter: CharacterDetail | null;
  onCharacterSelect: (character: CharacterDetail | null) => void;
  onSearchResults?: (
    results: ItemSearchByImageResponse,
    cropInfo: { x: number; y: number; width: number; height: number },
  ) => void;
  onSwitchToSearchPanel?: () => void;
  onSubtaskUpdate?: (updatedSubtask: components['schemas']['SubtaskDetail']) => void;
  initialComment?: string;
  onInitialCommentUsed?: () => void;
  // 物品边界框相关
  selectedItemBbox?: [number, number, number, number] | null;
  selectedItemLabel?: string | null;
}

// Compact Status Update Buttons with improved design
function StatusUpdateButtons({
  subtaskStatus,
  isUpdatingStatus,
  onUpdate,
}: {
  subtaskStatus: SubtaskStatus | undefined;
  isUpdatingStatus: boolean;
  onUpdate: (newStatus: SubtaskUpdateStatusValue) => void;
}) {
  if (!subtaskStatus || subtaskStatus === 'pending') {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          variant="destructive"
          size="xs"
          onClick={() => onUpdate('denied')}
          disabled={isUpdatingStatus}
          className="h-7 px-2.5 text-xs font-medium transition-all duration-200 hover:scale-105"
        >
          {isUpdatingStatus ? <LuLoader className="w-3 h-3 mr-1 animate-spin" /> : <LuX className="w-3 h-3 mr-1" />}
          却下
        </Button>
        <Button
          variant="success"
          size="xs"
          onClick={() => onUpdate('accepted')}
          disabled={isUpdatingStatus}
          className="h-7 px-2.5 text-xs font-medium transition-all duration-200 hover:scale-105"
        >
          {isUpdatingStatus ? (
            <LuLoader className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <LuCircle className="w-3 h-3 mr-1" />
          )}
          承認
        </Button>
      </div>
    );
  }

  if (['denied', 'accepted'].includes(subtaskStatus)) {
    return (
      <Button
        variant={subtaskStatus === 'denied' ? 'destructive' : 'success'}
        size="xs"
        onClick={() => onUpdate('pending')}
        disabled={isUpdatingStatus}
        className="h-7 px-2.5 text-xs font-medium transition-all duration-200 hover:scale-105"
      >
        {isUpdatingStatus ? <LuLoader className="w-3 h-3 mr-1 animate-spin" /> : <LuRedo2 className="w-3 h-3 mr-1" />}
        {subtaskStatus === 'denied' ? '却下済み' : '承認済み'} (↩️)
      </Button>
    );
  }
  return null;
}

export const SubtaskContentWrapper = memo(
  ({
    subtask,
    subtasks,
    currentSubtaskId,
    onSubtaskSelect,
    onVersionChange,
    aiReviewResult,
    activeFindingId,
    onFindingInteraction,
    canUpdateAsset,
    isAiReviewing,
    onAssetFileUpdate,
    isUpdatingAsset,
    onUpdateSubtaskStatus,
    isUpdatingStatus,
    onNavigateToSubtask,
    hasPreviousSubtask,
    hasNextSubtask,
    projectId,
    onSearchResults,
    onSwitchToSearchPanel,
    onSubtaskUpdate,
    initialComment,
    onInitialCommentUsed,
    selectedItemBbox,
    selectedItemLabel,
  }: SubtaskContentWrapperProps) => {
    const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const handleOpenEditModal = () => setIsEditModalOpen(true);
    const handleCloseEditModal = () => setIsEditModalOpen(false);

    const handleSaveSubtask = (payload: components['schemas']['SubtaskUpdate']) => {
      void (async () => {
        try {
          console.log('Saving subtask:', payload);

          // Call the actual API
          const updatedSubtask = await updateSubtaskDetails(subtask.id, payload);
          console.log('Subtask updated successfully:', updatedSubtask);

          // Close the modal and notify parent component
          setIsEditModalOpen(false);
          if (onSubtaskUpdate) {
            onSubtaskUpdate(updatedSubtask);
          }
        } catch (error) {
          console.error('Failed to update subtask:', error);
          // TODO: Show error message to user
        }
      })();
    };

    if (!subtask.content) {
      return null;
    }

    return (
      <>
        {/* Compact subtask list section */}
        <div className="px-3 py-2 border-b bg-muted/5 border-border/20">
          <SubtaskList subtasks={subtasks} currentSubtaskId={currentSubtaskId} onSelectAndClose={onSubtaskSelect} />
        </div>

        {/* Compact header with improved layout */}
        <div className="relative border-b bg-gradient-to-r from-background via-muted/3 to-background border-border/40">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5">
            {/* Left section - Title and badge */}
            <div className="flex items-center flex-1 min-w-0 gap-2">
              <Badge
                variant="outline"
                className="flex-shrink-0 bg-primary/8 border-primary/25 text-primary font-medium px-2 py-0.5 text-xs"
              >
                <LuStar className="w-3 h-3 mr-1" />
                {getSubtaskTypeLabel(subtask.content.task_type)}
              </Badge>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold leading-tight truncate text-foreground" title={subtask.name}>
                  {subtask.name}
                </h2>
                {subtask.task_type !== 'text' && subtask.description && (
                  <p
                    className="text-xs text-muted-foreground leading-relaxed line-clamp-1 mt-0.5"
                    title={subtask.description}
                  >
                    {subtask.description}
                  </p>
                )}
              </div>

              {/* Edit button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleOpenEditModal}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-primary transition-opacity flex-shrink-0"
                title="サブタスク名を編集"
              >
                <LuPencil className="h-4 w-4" />
              </Button>
            </div>

            {/* Right section - Navigation and status */}
            <div className="flex items-center flex-shrink-0 gap-2">
              {/* Compact navigation */}
              <div className="flex items-center bg-muted/20 rounded-md p-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="transition-all duration-150 rounded-sm w-7 h-7 hover:bg-background/60"
                  onClick={() => onNavigateToSubtask('prev')}
                  disabled={!hasPreviousSubtask || isUpdatingStatus}
                  aria-label="Previous Subtask"
                >
                  <LuChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="transition-all duration-150 rounded-sm w-7 h-7 hover:bg-background/60"
                  onClick={() => onNavigateToSubtask('next')}
                  disabled={!hasNextSubtask || isUpdatingStatus}
                  aria-label="Next Subtask"
                >
                  <LuChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              <Button variant="outline" size="xs" className="h-7 px-2.5" onClick={() => setIsCopyDialogOpen(true)}>
                <LuCopy className="w-3 h-3 mr-1" />
                コピー
              </Button>

              <StatusUpdateButtons
                subtaskStatus={subtask.status}
                isUpdatingStatus={isUpdatingStatus}
                onUpdate={onUpdateSubtaskStatus}
              />
            </div>
          </div>

          {/* Subtle bottom accent */}
          <div className="h-0.5 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-teal-500/10" />
        </div>

        {/* Main content area */}
        <div className="flex flex-row flex-1 min-h-0 gap-3 p-3 bg-muted/10">
          <SubtaskContent
            subtaskId={subtask.id}
            description={subtask.description || ''}
            content={subtask.content}
            history={subtask.history || []}
            version={subtask.version}
            onVersionChange={onVersionChange}
            aiReviewResult={aiReviewResult}
            activeFindingId={activeFindingId}
            onFindingInteraction={onFindingInteraction}
            canUpdateAsset={canUpdateAsset}
            isAiReviewing={isAiReviewing}
            onAssetFileUpdate={onAssetFileUpdate}
            isUpdatingAsset={isUpdatingAsset}
            projectId={projectId}
            onSearchResults={onSearchResults}
            onSwitchToSearchPanel={onSwitchToSearchPanel}
            initialComment={initialComment}
            onInitialCommentUsed={onInitialCommentUsed}
            selectedItemBbox={selectedItemBbox}
            selectedItemLabel={selectedItemLabel}
          />
        </div>
        <CopySubtaskDialog
          isOpen={isCopyDialogOpen}
          onOpenChange={setIsCopyDialogOpen}
          projectId={projectId}
          subtaskId={subtask.id}
        />
        <EditSubtaskModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          subtask={subtask as components['schemas']['SubtaskDetail']}
          onSave={handleSaveSubtask}
        />
      </>
    );
  },
);
SubtaskContentWrapper.displayName = 'SubtaskContentWrapper';
