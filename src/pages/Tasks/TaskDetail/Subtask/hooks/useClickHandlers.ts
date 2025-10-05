import { useCallback } from 'react';

interface UseClickHandlersProps {
  findingId: string;
  isEditable: boolean;
  isEditing: boolean;
  onClick?: (findingId: string) => void;
  onDoubleClick?: (findingId: string) => void;
  onStartEditing?: (findingId: string) => void;
}

export function useClickHandlers({
  findingId,
  isEditable,
  isEditing,
  onClick,
  onDoubleClick,
  onStartEditing,
}: UseClickHandlersProps) {
  // 处理双击事件
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isEditable && !isEditing && onDoubleClick) {
        onDoubleClick(findingId);
      }
      if (isEditable && !isEditing && onStartEditing) {
        onStartEditing(findingId);
      }
    },
    [isEditable, isEditing, findingId, onDoubleClick, onStartEditing],
  );

  // 处理单击事件
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (onClick) {
        onClick(findingId);
      }
    },
    [onClick, findingId],
  );

  return {
    handleClick,
    handleDoubleClick,
  };
}
