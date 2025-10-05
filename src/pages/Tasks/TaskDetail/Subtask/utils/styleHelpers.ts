import type { BoundingBox } from '@/hooks/useBoundingBoxEditor';

import type { ImageDisplayMetrics } from '../ImageAnnotation';

/**
 * 获取severity对应的边框颜色类
 */
export const getSeverityBorderColorClass = (
  severity: 'low' | 'medium' | 'high' | 'risk' | 'alert' | 'safe',
): string => {
  switch (severity) {
    case 'high':
    case 'risk':
      return 'border-red-500 hover:border-red-400';
    case 'medium':
    case 'alert':
      return 'border-yellow-500 hover:border-yellow-400';
    case 'low':
    case 'safe':
    default:
      return 'border-blue-500 hover:border-blue-400';
  }
};

/**
 * 坐标转换：自然坐标转显示坐标
 */
export function naturalToDisplay(naturalArea: BoundingBox, metrics: ImageDisplayMetrics): BoundingBox {
  return {
    x: metrics.paddingX + naturalArea.x * metrics.scale,
    y: metrics.paddingY + naturalArea.y * metrics.scale,
    width: naturalArea.width * metrics.scale,
    height: naturalArea.height * metrics.scale,
  };
}

/**
 * 计算组件样式
 */
export function calculateBoxStyle(
  displayArea: BoundingBox,
  isEditing: boolean,
  isActive?: boolean,
  isEditable?: boolean,
): React.CSSProperties {
  const getZIndex = () => {
    if (isEditing) {
      return 30;
    }
    if (isActive) {
      return 20;
    }
    return 10;
  };

  return {
    position: 'absolute',
    left: `${displayArea.x}px`,
    top: `${displayArea.y}px`,
    width: `${Math.max(1, displayArea.width)}px`,
    height: `${Math.max(1, displayArea.height)}px`,
    boxSizing: 'border-box',
    transition: isEditing ? 'none' : 'all 0.15s ease-in-out',
    zIndex: getZIndex(),
    // AI annotation始终保持可点击，通过z-index层级和事件处理来协调重叠
    pointerEvents: 'auto',
    ...(isEditing
      ? {
          borderWidth: '2px',
          borderStyle: 'dashed',
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          cursor: 'move',
        }
      : {
          borderWidth: isActive ? '3px' : '2px',
          borderStyle: 'solid',
          cursor: isEditable ? 'pointer' : 'default',
          opacity: isActive ? 1 : 0.7,
        }),
  };
}

/**
 * 计算容器的className
 */
export function calculateContainerClassName(isEditing: boolean, isActive?: boolean, severityClass?: string): string {
  const classes = ['shadow-md hover:opacity-100'];

  if (!isEditing && severityClass) {
    classes.push(severityClass);
  }

  if (isActive && !isEditing) {
    classes.push('ring-2 ring-offset-2 ring-offset-background ring-current');
  }

  return classes.join(' ');
}
