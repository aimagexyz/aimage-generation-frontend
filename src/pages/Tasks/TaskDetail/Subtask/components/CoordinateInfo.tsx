import React from 'react';

import type { BoundingBox } from '@/hooks/useBoundingBoxEditor';

interface CoordinateInfoProps {
  isEditing: boolean;
  area: BoundingBox;
}

export function CoordinateInfo({ isEditing, area }: CoordinateInfoProps): React.ReactElement | null {
  if (!isEditing) {
    return null;
  }

  return (
    <div
      className="absolute -top-8 left-0 px-2 py-1 text-xs text-white bg-black bg-opacity-80 rounded shadow-sm whitespace-nowrap"
      style={{ pointerEvents: 'none' }}
    >
      x: {Math.round(area.x)}, y: {Math.round(area.y)}, w: {Math.round(area.width)}, h: {Math.round(area.height)}
    </div>
  );
}
