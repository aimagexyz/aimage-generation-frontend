import React, { useRef } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import type { BoundingBox } from '@/hooks/useBoundingBoxEditor';

import { CoordinateInfo } from './components/CoordinateInfo';
import { FindingTooltip } from './components/FindingTooltip';
import { ResizeHandles } from './components/ResizeHandles';
import { SaveStatusIcon } from './components/SaveStatusIcon';
import { useClickHandlers } from './hooks/useClickHandlers';
import { useDragHandling } from './hooks/useDragHandling';
import { useEditingEvents } from './hooks/useEditingEvents';
import { useEventListeners } from './hooks/useEventListeners';
import type { ImageDisplayMetrics } from './ImageAnnotation';
import {
  calculateBoxStyle,
  calculateContainerClassName,
  getSeverityBorderColorClass,
  naturalToDisplay,
} from './utils/styleHelpers';
import { isValidForRendering } from './utils/validationHelpers';

interface AiReviewFindingArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AiReviewFinding {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'risk' | 'alert' | 'safe';
  suggestion?: string;
  area?: AiReviewFindingArea;
}

export interface EditableAiAnnotationBoxProps {
  finding: AiReviewFinding;
  imageNaturalDimensions: { width: number; height: number };
  imageDisplayMetrics: ImageDisplayMetrics;
  isActive?: boolean;
  isEditable?: boolean;
  currentArea?: BoundingBox | null;
  isEditing?: boolean;
  isDirty?: boolean;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  onMouseEnter?: (findingId: string) => void;
  onMouseLeave?: (findingId: string) => void;
  onClick?: (findingId: string) => void;
  onDoubleClick?: (findingId: string) => void;
  onStartEditing?: (findingId: string) => void;
  onUpdateWhileEditing?: (findingId: string, newArea: BoundingBox) => void;
  onFinishEditing?: (findingId: string) => void;
  onCancelEditing?: (findingId: string) => void;
}

function EditableAiAnnotationBoxComponent({
  finding,
  imageNaturalDimensions,
  imageDisplayMetrics,
  isActive,
  isEditable = true,
  currentArea,
  isEditing = false,
  isDirty = false,
  saveStatus = 'idle',
  onMouseEnter,
  onMouseLeave,
  onClick,
  onDoubleClick,
  onStartEditing,
  onUpdateWhileEditing,
  onFinishEditing,
  onCancelEditing,
}: EditableAiAnnotationBoxProps): React.ReactElement | null {
  const containerRef = useRef<HTMLDivElement>(null);

  // 使用当前区域或原始区域
  const area = currentArea || (finding.area as BoundingBox | undefined);

  // 所有 hooks 必须在条件检查之前调用
  const { dragState, handleMouseDown, handleMouseMove, handleMouseUp } = useDragHandling({
    isEditing,
    isEditable,
    area: area || { x: 0, y: 0, width: 0, height: 0 }, // 提供默认值避免 null
    imageDisplayMetrics,
    imageNaturalDimensions,
    findingId: finding.id,
    onUpdateWhileEditing,
  });

  const { handleKeyDown, handleClickOutside } = useEditingEvents({
    isEditing,
    findingId: finding.id,
    containerRef,
    onCancelEditing,
    onFinishEditing,
  });

  const { handleClick, handleDoubleClick } = useClickHandlers({
    findingId: finding.id,
    isEditable,
    isEditing,
    onClick,
    onDoubleClick,
    onStartEditing,
  });

  // 绑定全局事件监听器
  useEventListeners({
    isEditing,
    isDragging: dragState.isDragging,
    handleKeyDown,
    handleClickOutside,
    handleMouseMove,
    handleMouseUp,
  });

  // 验证渲染前提条件（在所有 hooks 之后）
  if (!isValidForRendering(area, imageNaturalDimensions, imageDisplayMetrics)) {
    return null;
  }

  // 计算显示位置和样式
  const validArea = area;
  const displayArea = naturalToDisplay(validArea, imageDisplayMetrics);
  const severityClass: string = getSeverityBorderColorClass(finding.severity);
  const combinedStyle = calculateBoxStyle(displayArea, isEditing, isActive, isEditable);
  const containerClassName: string = calculateContainerClassName(isEditing, isActive, severityClass);

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={containerRef}
            style={combinedStyle}
            className={containerClassName}
            onMouseEnter={onMouseEnter ? () => onMouseEnter(finding.id) : undefined}
            onMouseLeave={onMouseLeave ? () => onMouseLeave(finding.id) : undefined}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onMouseDown={isEditing ? (e) => handleMouseDown(e, 'move') : undefined}
            role="button"
            tabIndex={0}
            aria-label={`AI finding: ${finding.description.substring(0, 50)}... Severity: ${finding.severity}${isActive ? '. Active.' : ''}${isEditing ? '. Editing mode.' : ''}`}
            aria-pressed={isActive}
          >
            <ResizeHandles isEditing={isEditing} onMouseDown={handleMouseDown} />
            <CoordinateInfo isEditing={isEditing} area={validArea} />
            <SaveStatusIcon saveStatus={saveStatus} isDirty={isDirty} />
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="z-50 max-w-xs p-3 rounded-md shadow-xl bg-popover text-popover-foreground"
        >
          <FindingTooltip finding={finding} isEditable={isEditable} isEditing={isEditing} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const EditableAiAnnotationBox = React.memo(EditableAiAnnotationBoxComponent);
EditableAiAnnotationBox.displayName = 'EditableAiAnnotationBox';
