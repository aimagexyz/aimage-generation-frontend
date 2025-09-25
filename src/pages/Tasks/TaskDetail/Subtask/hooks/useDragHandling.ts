import { useCallback, useState } from 'react';

import type { BoundingBox } from '@/hooks/useBoundingBoxEditor';

import type { ImageDisplayMetrics } from '../ImageAnnotation';

type DragType = 'move' | 'resize';
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

interface DragState {
  isDragging: boolean;
  dragType: DragType;
  resizeHandle?: ResizeHandle;
  startPos: { x: number; y: number };
  startArea: BoundingBox;
}

interface UseDragHandlingProps {
  isEditing: boolean;
  isEditable: boolean;
  area: BoundingBox;
  imageDisplayMetrics: ImageDisplayMetrics;
  imageNaturalDimensions: { width: number; height: number };
  findingId: string;
  onUpdateWhileEditing?: (findingId: string, newArea: BoundingBox) => void;
}

/**
 * 验证边界约束
 */
function constrainArea(area: BoundingBox, imageNaturalDimensions: { width: number; height: number }): BoundingBox {
  const minSize = 10; // 最小尺寸（自然坐标）

  return {
    x: Math.max(0, Math.min(area.x, imageNaturalDimensions.width - minSize)),
    y: Math.max(0, Math.min(area.y, imageNaturalDimensions.height - minSize)),
    width: Math.max(minSize, Math.min(area.width, imageNaturalDimensions.width - area.x)),
    height: Math.max(minSize, Math.min(area.height, imageNaturalDimensions.height - area.y)),
  };
}

export function useDragHandling({
  isEditing,
  isEditable,
  area,
  imageDisplayMetrics,
  imageNaturalDimensions,
  findingId,
  onUpdateWhileEditing,
}: UseDragHandlingProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragType: 'move',
    startPos: { x: 0, y: 0 },
    startArea: { x: 0, y: 0, width: 0, height: 0 },
  });

  // 处理鼠标按下（开始拖拽）
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, dragType: DragType, resizeHandle?: ResizeHandle) => {
      if (!isEditing || !isEditable) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      setDragState({
        isDragging: true,
        dragType,
        resizeHandle,
        startPos: { x: e.clientX, y: e.clientY },
        startArea: { ...area },
      });
    },
    [isEditing, isEditable, area],
  );

  // 处理鼠标移动（拖拽中）
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState.isDragging || !onUpdateWhileEditing) {
        return;
      }

      const deltaX = (e.clientX - dragState.startPos.x) / imageDisplayMetrics.scale;
      const deltaY = (e.clientY - dragState.startPos.y) / imageDisplayMetrics.scale;

      let newArea: BoundingBox;

      if (dragState.dragType === 'move') {
        // 移动整个区域
        newArea = {
          x: dragState.startArea.x + deltaX,
          y: dragState.startArea.y + deltaY,
          width: dragState.startArea.width,
          height: dragState.startArea.height,
        };
      } else {
        // 调整大小
        const { resizeHandle } = dragState;
        newArea = { ...dragState.startArea };

        switch (resizeHandle) {
          case 'nw':
            newArea.x += deltaX;
            newArea.y += deltaY;
            newArea.width -= deltaX;
            newArea.height -= deltaY;
            break;
          case 'ne':
            newArea.y += deltaY;
            newArea.width += deltaX;
            newArea.height -= deltaY;
            break;
          case 'sw':
            newArea.x += deltaX;
            newArea.width -= deltaX;
            newArea.height += deltaY;
            break;
          case 'se':
            newArea.width += deltaX;
            newArea.height += deltaY;
            break;
        }
      }

      // 应用边界约束
      const constrainedArea = constrainArea(newArea, imageNaturalDimensions);
      onUpdateWhileEditing(findingId, constrainedArea);
    },
    [dragState, imageDisplayMetrics.scale, imageNaturalDimensions, findingId, onUpdateWhileEditing],
  );

  // 处理鼠标松开（结束拖拽）
  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging) {
      setDragState((prev) => ({ ...prev, isDragging: false }));
    }
  }, [dragState.isDragging]);

  return {
    dragState,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}

export type { DragType, ResizeHandle };
