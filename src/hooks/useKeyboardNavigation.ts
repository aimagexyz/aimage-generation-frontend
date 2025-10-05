import { useCallback, useEffect, useRef } from 'react';

interface UseKeyboardNavigationProps {
  items: unknown[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose?: () => void;
  enabled?: boolean;
}

export function useKeyboardNavigation({
  items,
  selectedIndex,
  onSelect,
  onClose,
  enabled = true,
}: UseKeyboardNavigationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || items.length === 0) {
        return;
      }

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown': {
          event.preventDefault();
          const nextIndex = (selectedIndex + 1) % items.length;
          onSelect(nextIndex);
          break;
        }

        case 'ArrowLeft':
        case 'ArrowUp': {
          event.preventDefault();
          const prevIndex = (selectedIndex - 1 + items.length) % items.length;
          onSelect(prevIndex);
          break;
        }

        case 'Home':
          event.preventDefault();
          onSelect(0);
          break;

        case 'End':
          event.preventDefault();
          onSelect(items.length - 1);
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          // Trigger click on selected item
          if (selectedIndex >= 0 && selectedIndex < items.length) {
            const selectedElement = containerRef.current?.children[selectedIndex] as HTMLElement;
            selectedElement?.click();
          }
          break;

        case 'Escape':
          event.preventDefault();
          onClose?.();
          break;

        default:
          break;
      }
    },
    [enabled, items.length, selectedIndex, onSelect, onClose],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  // Focus management
  const focusItem = useCallback(
    (index: number) => {
      if (containerRef.current && index >= 0 && index < items.length) {
        const item = containerRef.current.children[index] as HTMLElement;
        item?.focus();
      }
    },
    [items.length],
  );

  return {
    containerRef,
    focusItem,
  };
}
