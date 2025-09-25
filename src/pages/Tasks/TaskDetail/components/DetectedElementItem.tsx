import clsx from 'clsx';
import { BanIcon, EyeOffIcon, PlusCircleIcon } from 'lucide-react'; // Sorted imports

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { DetectedElement, DetectedElementType } from '@/types/aiReview';

interface DetectedElementItemProps {
  element: DetectedElement;
  onAddToReview: (element: DetectedElement) => void;
  onIgnoreElement: (elementId: string, elementType: DetectedElementType) => void;
  // Optional states for visual feedback, can be managed by parent
  isAddingToReview?: boolean;
  isIgnoringElement?: boolean;
}

export function DetectedElementItem({
  element,
  onAddToReview,
  onIgnoreElement,
  isAddingToReview,
  isIgnoringElement,
}: DetectedElementItemProps) {
  // Access properties directly from element
  // const id = (element as any).id as string; // Reverted
  // const type = (element as any).type as DetectedElementType; // Reverted
  // const label = (element as any).label as string; // Reverted
  // const confidence = (element as any).confidence as number | undefined; // Reverted
  // const ui_status = (element as any).ui_status as string | undefined; // Reverted

  const handleAddToReview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!element.uiStatus || element.uiStatus === 'pending') {
      onAddToReview(element);
    }
  };

  const handleIgnoreElement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!element.uiStatus || element.uiStatus === 'pending') {
      if (typeof element.id === 'string' && typeof element.type === 'string') {
        onIgnoreElement(element.id, element.type);
      } else {
        console.error('Element ID or Type is not a string', { id: element.id, type: element.type });
      }
    }
  };

  const isPending = !element.uiStatus || element.uiStatus === 'pending';
  const isAdded = element.uiStatus === 'adding_to_review';
  const isIgnored = element.uiStatus === 'ignored';

  return (
    <div
      className={clsx(
        'w-48 flex-shrink-0 p-2 border rounded-md bg-background hover:border-primary/50',
        isAdded && 'border-green-500 bg-green-500/10 text-green-700',
        isIgnored && 'opacity-60 bg-muted/50 hover:border-transparent',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={element.label}>
            {element.label}
          </p>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            {typeof element.type === 'string' && element.type.length > 0 ? (
              <span>{element.type.charAt(0).toUpperCase() + element.type.slice(1)}</span>
            ) : (
              <span className="italic">Unknown type</span>
            )}
          </div>
        </div>

        {isPending && (
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            <Button
              variant="outline"
              size="icon" // Changed to "icon"
              onClick={handleAddToReview}
              disabled={isAddingToReview || isIgnoringElement}
              aria-label="Add to review"
              className="h-6 w-6" // Keep custom size if needed with size="icon"
            >
              {isAddingToReview ? (
                <PlusCircleIcon className="size-3 animate-pulse" />
              ) : (
                <PlusCircleIcon className="size-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon" // Changed to "icon"
              onClick={handleIgnoreElement}
              disabled={isAddingToReview || isIgnoringElement}
              aria-label="Ignore element"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
            >
              {isIgnoringElement ? <BanIcon className="size-3 animate-pulse" /> : <BanIcon className="size-3" />}
            </Button>
          </div>
        )}
        {isAdded && (
          // Use default/secondary and add custom classes for success styling
          <Badge variant="default" className="ml-2 text-xs bg-green-100 text-green-800 border-green-300">
            Added
          </Badge>
        )}
        {isIgnored && (
          // Use outline and add custom classes for muted/ignored styling
          <Badge variant="outline" className="ml-2 text-xs text-muted-foreground flex items-center gap-1">
            <EyeOffIcon className="size-3" /> Ignored
          </Badge>
        )}
      </div>
      {/* Future: Could display bounding box info or a small thumbnail if available */}
    </div>
  );
}
