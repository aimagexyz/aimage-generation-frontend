import React from 'react';

import type { DragType, ResizeHandle } from '../hooks/useDragHandling';

interface ResizeHandlesProps {
  isEditing: boolean;
  onMouseDown: (e: React.MouseEvent, dragType: DragType, resizeHandle?: ResizeHandle) => void;
}

export function ResizeHandles({ isEditing, onMouseDown }: ResizeHandlesProps): React.ReactElement | null {
  if (!isEditing) {
    return null;
  }

  const handleSize = 8;
  const handles: { handle: ResizeHandle; style: React.CSSProperties; cursor: string }[] = [
    {
      handle: 'nw',
      style: { top: -handleSize / 2, left: -handleSize / 2 },
      cursor: 'nw-resize',
    },
    {
      handle: 'ne',
      style: { top: -handleSize / 2, right: -handleSize / 2 },
      cursor: 'ne-resize',
    },
    {
      handle: 'sw',
      style: { bottom: -handleSize / 2, left: -handleSize / 2 },
      cursor: 'sw-resize',
    },
    {
      handle: 'se',
      style: { bottom: -handleSize / 2, right: -handleSize / 2 },
      cursor: 'se-resize',
    },
  ];

  return (
    <>
      {handles.map(({ handle, style, cursor }) => (
        <div
          key={handle}
          className="absolute bg-blue-500 border border-white rounded-sm shadow-sm hover:bg-blue-600"
          style={{
            ...style,
            width: handleSize,
            height: handleSize,
            cursor,
          }}
          onMouseDown={(e) => onMouseDown(e, 'resize', handle)}
        />
      ))}
    </>
  );
}
