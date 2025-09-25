import { useEffect, useRef } from 'react';

import { type components } from '@/api/schemas';

// Removed ScrollArea import as it will be handled by the dropdown component
// import { ScrollArea } from '@/components/ui/ScrollArea';
import { SubtaskItem } from './SubtaskItem';

type SubtaskOut = components['schemas']['SubtaskOut'];

type Props = {
  currentSubtaskId?: string;
  subtasks: SubtaskOut[];
  isError?: boolean;
  onSelectAndClose: (subtaskId: string) => void; // New prop to handle selection and closing
};

export function SubtaskList(props: Props) {
  const { currentSubtaskId, subtasks, isError, onSelectAndClose } = props;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) {
      return;
    }

    const activeItem = scrollContainer.querySelector<HTMLLIElement>('[data-active="true"]');

    if (activeItem) {
      activeItem.scrollIntoView({
        behavior: 'auto',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [currentSubtaskId]);
  // const [, setSearchParams] = useSearchParams(); // setSearchParams will be handled by onSelectAndClose via TaskDetailPage

  // handleSubtaskSelect is now effectively onSelectAndClose passed from parent
  // const handleSubtaskSelect = (subtaskId: string) => {
  //   setSearchParams((prev) => ({ ...prev, subtaskId }));
  //   // We'll also need to close the dropdown here
  // };

  if (isError) {
    return (
      <div className="flex items-center justify-center p-6 text-center">
        <div className="text-red-500 text-sm bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="font-medium mb-1">エラーが発生しました</div>
          <div className="text-xs text-red-600">サブタスクの読み込みに失敗しました</div>
        </div>
      </div>
    );
  }

  if (subtasks.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 text-center">
        <div className="text-muted-foreground text-sm bg-muted/30 rounded-lg p-4 border border-border/50">
          <div className="font-medium mb-1">サブタスクがありません</div>
          <div className="text-xs">表示できるサブタスクがありません</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-r from-muted/20 via-muted/10 to-muted/20 rounded-lg border border-border/30">
      {/* Subtle header indicator */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Enhanced scrollable list */}
      <div ref={scrollContainerRef} className="relative overflow-x-auto overflow-y-hidden scrollbar-thin">
        <ul className="flex flex-row flex-nowrap items-center gap-3 p-3">
          {subtasks.map((subtask) => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              isActive={currentSubtaskId === subtask.id}
              onSelect={onSelectAndClose}
            />
          ))}
        </ul>

        {/* Scroll indicators */}
        <div className="absolute top-0 left-0 w-4 h-full bg-gradient-to-r from-background/80 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-4 h-full bg-gradient-to-l from-background/80 to-transparent pointer-events-none" />
      </div>

      {/* Subtle footer indicator */}
      <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      {/* Task count indicator */}
      <div className="absolute -top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full shadow-sm">
        {subtasks.length}
      </div>
    </div>
  );
}
