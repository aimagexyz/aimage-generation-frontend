import { Skeleton } from '@/components/ui/Skeleton';
import type { AiDetectedElements, DetectedElement, DetectedElementType } from '@/types/aiReview';

import { DetectedElementItem } from './DetectedElementItem';

interface DetectedElementsDisplayProps {
  detectedElements?: AiDetectedElements;
  isLoading?: boolean;
  onAddElementToReview: (element: DetectedElement) => void;
  onIgnoreElement: (elementId: string, elementType: DetectedElementType) => void;
  // Props to manage individual item's loading/disabled state, passed down from parent
  addingElementId?: string | null; // ID of the element currently being added
  ignoringElementId?: string | null; // ID of the element currently being ignored
}

export function DetectedElementsDisplay({
  detectedElements,
  isLoading,
  onAddElementToReview,
  onIgnoreElement,
  addingElementId,
  ignoringElementId,
}: DetectedElementsDisplayProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="w-1/3 h-8" />
        <Skeleton className="w-full h-16" />
        <Skeleton className="w-1/4 h-8 mt-3" />
        <Skeleton className="w-full h-16" />
        <Skeleton className="w-full h-16" />
      </div>
    );
  }

  if (
    !detectedElements ||
    (detectedElements.characters.length === 0 &&
      detectedElements.objects.length === 0 &&
      detectedElements.texts.length === 0)
  ) {
    return <p className="py-4 text-sm text-center text-muted-foreground">特定の要素は検出されませんでした。</p>;
  }

  const renderElementList = (elements: DetectedElement[], title: string) => {
    if (elements.length === 0) {
      return null;
    }
    return (
      <div className="mb-3 last:mb-0">
        <h5 className="mb-1 text-sm font-semibold text-foreground/90">{title}</h5>
        <div className="flex flex-row gap-2 py-2 overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {elements.map((element) => (
            <DetectedElementItem
              key={element.id}
              element={element}
              onAddToReview={onAddElementToReview}
              onIgnoreElement={onIgnoreElement}
              isAddingToReview={addingElementId === element.id}
              isIgnoringElement={ignoringElementId === element.id}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderElementList(detectedElements.characters, '人物')}
      {renderElementList(detectedElements.objects, '物体')}
      {renderElementList(detectedElements.texts, '文字')}
    </div>
  );
}
