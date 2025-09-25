import { memo } from 'react';

import type { CharacterDetail } from '@/api/charactersService';
import type { ItemSearchByImageResponse } from '@/api/itemsService';
import type { components } from '@/api/schemas'; // For SubtaskOut type
import { Button } from '@/components/ui/Button'; // Added Button import
import type { AiReviewResult } from '@/types/aiReview'; // Import AiReviewResult from the correct path
import type { SubtaskData, SubtaskUpdateStatusValue } from '@/types/tasks';

import type { FindingInteractionType } from './AiReviewPanel'; // Assuming types co-located or imported
import { SubtaskContentWrapper } from './SubtaskContentWrapper';

// Basic definitions for LoadingContent, EmptyContent, SelectionHint
const LoadingContent = memo(() => (
  <div className="flex items-center justify-center h-full">
    <p className="text-muted-foreground">Loading...</p>
  </div>
));
LoadingContent.displayName = 'LoadingContent';

interface EmptyContentProps {
  onOpenCreateSubtaskDialog: () => void; // Prop to open the dialog
}
const EmptyContent = memo(({ onOpenCreateSubtaskDialog }: EmptyContentProps) => (
  <div className="flex flex-col items-center justify-center h-full gap-4">
    <p className="text-muted-foreground">このタスクにはまだサブタスクがありません</p>
    <Button onClick={onOpenCreateSubtaskDialog} variant="outline">
      サブタスクを新規作成
    </Button>
  </div>
));
EmptyContent.displayName = 'EmptyContent';

const SelectionHint = memo(() => (
  <div className="py-8 text-center text-muted-foreground">サブタスクを選択してください</div>
));
SelectionHint.displayName = 'SelectionHint';

type SubtaskOut = components['schemas']['SubtaskOut']; // Define SubtaskOut here

// Type alias for MainContent props
interface MainContentProps {
  isSubtasksLoading: boolean;
  hasSubtasks: boolean;
  subtask: SubtaskData | undefined;
  subtasks: SubtaskOut[]; // Added: list of all subtasks for the dropdown
  currentSubtaskId: string | undefined; // Added: current subtask ID for the dropdown
  onSubtaskSelect: (subtaskId: string) => void; // Added: callback for subtask selection
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
  onOpenCreateSubtaskDialog: () => void; // Added prop for MainContent
  selectedCharacter: CharacterDetail | null;
  onCharacterSelect: (character: CharacterDetail | null) => void;
  // 搜索结果回调
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

export const MainContent = memo(
  ({
    isSubtasksLoading,
    hasSubtasks,
    subtask,
    subtasks, // Added
    currentSubtaskId, // Added
    onSubtaskSelect, // Added
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
    onOpenCreateSubtaskDialog, // Destructure the new prop
    selectedCharacter,
    onCharacterSelect,
    onSearchResults,
    onSwitchToSearchPanel,
    onSubtaskUpdate,
    initialComment,
    onInitialCommentUsed,
    selectedItemBbox,
    selectedItemLabel,
  }: MainContentProps) => {
    // Removed: const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    if (isSubtasksLoading) {
      return <LoadingContent />;
    }

    // Removed: const currentSubtaskName = subtask?.name || 'Select Subtask';
    // Removed: const handleSelectAndClose = (subtaskId: string) => { ... };

    let contentDisplay;
    if (!hasSubtasks) {
      contentDisplay = <EmptyContent onOpenCreateSubtaskDialog={onOpenCreateSubtaskDialog} />;
    } else if (!subtask?.content) {
      // If there are subtasks but none is selected (no subtask.content), show selection hint.
      // The dropdown to select one will be inside SubtaskContentWrapper if we force it to render,
      // but SubtaskContentWrapper expects a subtask. So, we show a general hint here.
      // OR, we could pass a placeholder subtask to SubtaskContentWrapper to show the dropdown.
      // For now, keeping SelectionHint if no specific subtask is loaded.
      contentDisplay = <SelectionHint />;
    } else {
      contentDisplay = (
        <SubtaskContentWrapper
          subtask={subtask} // This is the currently selected subtask
          subtasks={subtasks} // Pass the full list of subtasks for the dropdown
          currentSubtaskId={currentSubtaskId} // Pass the current subtask ID for highlighting in dropdown
          onSubtaskSelect={onSubtaskSelect} // Pass the selection handler
          onVersionChange={onVersionChange}
          aiReviewResult={aiReviewResult}
          activeFindingId={activeFindingId}
          onFindingInteraction={onFindingInteraction}
          canUpdateAsset={canUpdateAsset}
          isAiReviewing={isAiReviewing}
          onAssetFileUpdate={onAssetFileUpdate}
          isUpdatingAsset={isUpdatingAsset}
          onUpdateSubtaskStatus={onUpdateSubtaskStatus}
          isUpdatingStatus={isUpdatingStatus}
          onNavigateToSubtask={onNavigateToSubtask}
          hasPreviousSubtask={hasPreviousSubtask}
          hasNextSubtask={hasNextSubtask}
          projectId={projectId}
          selectedCharacter={selectedCharacter}
          onCharacterSelect={onCharacterSelect}
          onSearchResults={onSearchResults}
          onSwitchToSearchPanel={onSwitchToSearchPanel}
          onSubtaskUpdate={onSubtaskUpdate}
          initialComment={initialComment}
          onInitialCommentUsed={onInitialCommentUsed}
          selectedItemBbox={selectedItemBbox}
          selectedItemLabel={selectedItemLabel}
        />
      );
    }

    return (
      // The main div structure. The pt-2 was for the dropdown that was here.
      // SubtaskContentWrapper will now handle its own top padding/margin if needed via its internal TaskNavigationBar or header div.
      <div className="flex flex-col flex-1 min-h-0">{contentDisplay}</div>
    );
  },
);
MainContent.displayName = 'MainContent';
