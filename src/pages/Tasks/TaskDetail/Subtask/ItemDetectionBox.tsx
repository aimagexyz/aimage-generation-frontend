import React from 'react';

import type { ImageDisplayMetrics } from './ImageAnnotation';

interface ItemDetectionBoxProps {
  label: string;
  bbox: [number, number, number, number]; // [y1, x1, y2, x2] normalized coordinates (0-1000)
  imageNaturalDimensions: { width: number; height: number };
  imageDisplayMetrics: ImageDisplayMetrics;
  isActive?: boolean;
}

function getBoxStyle(
  bbox: [number, number, number, number],
  naturalDimensions: { width: number; height: number },
  displayMetrics: ImageDisplayMetrics,
  isActive: boolean,
): React.CSSProperties {
  // bbox格式: [y1, x1, y2, x2] normalized coordinates (0-1000)
  // 需要转换为像素坐标，然后使用与AiAnnotationBox相同的显示坐标计算
  const [y1, x1, y2, x2] = bbox;

  // Convert normalized coordinates (0-1000) to 0-1 range first
  const normalizedX1 = x1 / 1000;
  const normalizedY1 = y1 / 1000;
  const normalizedX2 = x2 / 1000;
  const normalizedY2 = y2 / 1000;

  // Then convert to pixel coordinates relative to natural image size
  const pixelX1 = normalizedX1 * naturalDimensions.width;
  const pixelY1 = normalizedY1 * naturalDimensions.height;
  const pixelX2 = normalizedX2 * naturalDimensions.width;
  const pixelY2 = normalizedY2 * naturalDimensions.height;

  // Ensure correct order
  const pixelX = Math.min(pixelX1, pixelX2);
  const pixelY = Math.min(pixelY1, pixelY2);
  const pixelWidth = Math.abs(pixelX2 - pixelX1);
  const pixelHeight = Math.abs(pixelY2 - pixelY1);

  // 现在使用与AiAnnotationBox相同的坐标转换公式
  // displayMetrics.paddingX + pixelCoordinate * displayMetrics.scale
  const finalLeft = displayMetrics.paddingX + pixelX * displayMetrics.scale;
  const finalTop = displayMetrics.paddingY + pixelY * displayMetrics.scale;
  const finalWidth = Math.max(1, pixelWidth * displayMetrics.scale);
  const finalHeight = Math.max(1, pixelHeight * displayMetrics.scale);

  return {
    position: 'absolute',
    left: `${finalLeft}px`,
    top: `${finalTop}px`,
    width: `${finalWidth}px`,
    height: `${finalHeight}px`,
    borderWidth: isActive ? '3px' : '2px',
    borderStyle: 'solid',
    borderColor: isActive ? '#ea580c' : '#fb923c', // orange-600 : orange-400
    backgroundColor: isActive ? 'rgba(234, 88, 12, 0.1)' : 'rgba(251, 146, 60, 0.05)', // orange with opacity
    boxSizing: 'border-box',
    cursor: 'pointer',
    // 去除transition来让变化更即时，跟上图片缩放
    transition: 'border-color 0.15s ease-in-out, opacity 0.15s ease-in-out',
    opacity: isActive ? 1 : 0.8,
    zIndex: isActive ? 15 : 10,
    pointerEvents: 'auto',
  };
}

function getLabelStyle(
  bbox: [number, number, number, number],
  naturalDimensions: { width: number; height: number },
  displayMetrics: ImageDisplayMetrics,
): React.CSSProperties {
  // 与getBoxStyle保持完全一致的坐标转换逻辑
  const [y1, x1] = bbox;

  // Convert normalized coordinates (0-1000) to 0-1 range, then to pixel coordinates
  const normalizedX = x1 / 1000;
  const normalizedY = y1 / 1000;

  const pixelX = normalizedX * naturalDimensions.width;
  const pixelY = normalizedY * naturalDimensions.height;

  return {
    position: 'absolute',
    left: `${displayMetrics.paddingX + pixelX * displayMetrics.scale}px`,
    top: `${displayMetrics.paddingY + pixelY * displayMetrics.scale - 24}px`, // 24px above the box
    backgroundColor: '#ea580c', // orange-600
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
    zIndex: 20,
    pointerEvents: 'none',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
  };
}

export function ItemDetectionBox({
  label,
  bbox,
  imageNaturalDimensions,
  imageDisplayMetrics,
  isActive = false,
}: ItemDetectionBoxProps): React.ReactElement {
  const boxStyle = React.useMemo(
    () => getBoxStyle(bbox, imageNaturalDimensions, imageDisplayMetrics, isActive),
    [bbox, imageNaturalDimensions, imageDisplayMetrics, isActive],
  );

  const labelStyle = React.useMemo(
    () => getLabelStyle(bbox, imageNaturalDimensions, imageDisplayMetrics),
    [bbox, imageNaturalDimensions, imageDisplayMetrics],
  );

  return (
    <>
      {/* Bounding box */}
      <div style={boxStyle} />

      {/* Label */}
      {isActive && <div style={labelStyle}>{label}</div>}
    </>
  );
}
