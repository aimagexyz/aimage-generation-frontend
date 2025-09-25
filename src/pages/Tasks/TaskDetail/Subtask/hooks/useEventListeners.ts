import { useEffect } from 'react';

interface UseEventListenersProps {
  isEditing: boolean;
  isDragging: boolean;
  handleKeyDown: (e: KeyboardEvent) => void;
  handleClickOutside: (e: MouseEvent) => void;
  handleMouseMove: (e: MouseEvent) => void;
  handleMouseUp: () => void;
}

export function useEventListeners({
  isEditing,
  isDragging,
  handleKeyDown,
  handleClickOutside,
  handleMouseMove,
  handleMouseUp,
}: UseEventListenersProps) {
  useEffect(() => {
    if (isEditing) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('click', handleClickOutside);
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isEditing, isDragging, handleKeyDown, handleClickOutside, handleMouseMove, handleMouseUp]);
}
