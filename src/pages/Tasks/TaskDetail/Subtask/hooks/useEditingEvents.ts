import { useCallback } from 'react';

interface UseEditingEventsProps {
  isEditing: boolean;
  findingId: string;
  containerRef: React.RefObject<HTMLDivElement>;
  onCancelEditing?: (findingId: string) => void;
  onFinishEditing?: (findingId: string) => void;
}

export function useEditingEvents({
  isEditing,
  findingId,
  containerRef,
  onCancelEditing,
  onFinishEditing,
}: UseEditingEventsProps) {
  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isEditing) {
        return;
      }

      if (e.key === 'Escape' && onCancelEditing) {
        e.preventDefault();
        onCancelEditing(findingId);
      } else if (e.key === 'Enter' && onFinishEditing) {
        e.preventDefault();
        onFinishEditing(findingId);
      }
    },
    [isEditing, findingId, onCancelEditing, onFinishEditing],
  );

  // 处理点击外部
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (!isEditing || !containerRef.current) {
        return;
      }

      const target = e.target as Node;
      if (!containerRef.current.contains(target) && onFinishEditing) {
        onFinishEditing(findingId);
      }
    },
    [isEditing, findingId, containerRef, onFinishEditing],
  );

  return {
    handleKeyDown,
    handleClickOutside,
  };
}
