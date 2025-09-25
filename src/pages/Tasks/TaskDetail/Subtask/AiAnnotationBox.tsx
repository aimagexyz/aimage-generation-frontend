import clsx from 'clsx';
import React from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';

import type { ImageDisplayMetrics } from './ImageAnnotation'; // Import the metrics type
// 确保 AiReviewFinding 类型可以从一个共享的位置导入，或者如果它在父组件中定义并通过 prop 传递，则使用该类型。
// 假设我们有一个共享的类型定义，例如: import type { AiReviewFinding } from '@/types/aiReview';
// 为了独立性，我们先在这里定义它，与 SubtaskContent.tsx 中的定义保持一致。

interface AiReviewFindingArea {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface AiReviewCitation {
  reference_image?: string;
  reference_source?: string;
}
interface AiReviewFinding {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
  area?: AiReviewFindingArea;
  citation?: AiReviewCitation; // 虽然此组件不直接使用 citation，但保持类型完整性
}

interface AiAnnotationBoxProps {
  finding: AiReviewFinding;
  imageNaturalDimensions: { width: number; height: number };
  imageDisplayMetrics: ImageDisplayMetrics; // Changed prop
  isActive?: boolean;
  onMouseEnter?: (findingId: string) => void;
  onMouseLeave?: (findingId: string) => void;
  onClick?: (findingId: string) => void;
}

/**
 * Determines the Tailwind CSS border color class based on finding severity.
 * @param severity The severity of the AI review finding.
 * @returns Tailwind CSS class string for border color.
 */
const getSeverityBorderColorClass = (severity: AiReviewFinding['severity']): string => {
  switch (severity) {
    case 'high':
      return 'border-red-500 hover:border-red-400';
    case 'medium':
      return 'border-yellow-500 hover:border-yellow-400';
    case 'low':
    default:
      return 'border-blue-500 hover:border-blue-400';
  }
};

function validateRenderPrerequisites(
  finding: AiReviewFinding,
  imageNaturalDimensions: { width: number; height: number },
  imageDisplayMetrics: ImageDisplayMetrics | null, // Updated type
  isInDevelopment: boolean,
): boolean {
  const isValid = !!(
    finding.area &&
    imageNaturalDimensions.width > 0 &&
    imageNaturalDimensions.height > 0 &&
    imageDisplayMetrics && // Check if metrics object exists
    imageDisplayMetrics.scale > 0 // Add a check for valid scale
  );
  if (!isValid && isInDevelopment) {
    console.warn('AiAnnotationBox: Skipping render due to missing prerequisites.', {
      findingId: finding.id,
      area: finding.area,
      naturalDims: imageNaturalDimensions,
      displayMetrics: imageDisplayMetrics,
    });
  }
  return isValid;
}

function getAnnotationStyle(
  area: AiReviewFindingArea,
  metrics: ImageDisplayMetrics, // Use ImageDisplayMetrics directly
  isActive?: boolean,
): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${metrics.paddingX + area.x * metrics.scale}px`, // Use metrics.scale, metrics.paddingX
    top: `${metrics.paddingY + area.y * metrics.scale}px`, // Use metrics.scale, metrics.paddingY
    width: `${Math.max(1, area.width * metrics.scale)}px`, // Use metrics.scale
    height: `${Math.max(1, area.height * metrics.scale)}px`, // Use metrics.scale
    borderWidth: isActive ? '3px' : '2px',
    borderStyle: 'solid',
    boxSizing: 'border-box',
    cursor: 'pointer',
    transition: 'all 0.15s ease-in-out',
    opacity: isActive ? 1 : 0.7,
    zIndex: isActive ? 20 : 10,
    // AI annotation始终保持可点击，通过z-index和事件处理来协调重叠
    pointerEvents: 'auto',
  };
}

function AiAnnotationBoxComponent({
  finding,
  imageNaturalDimensions,
  imageDisplayMetrics, // Changed prop
  isActive,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: AiAnnotationBoxProps): React.ReactElement | null {
  const isInDevelopment = import.meta.env.DEV;

  if (!validateRenderPrerequisites(finding, imageNaturalDimensions, imageDisplayMetrics, isInDevelopment)) {
    return null;
  }

  const area = finding.area as AiReviewFindingArea;

  const style = getAnnotationStyle(area, imageDisplayMetrics, isActive);
  const severityClass = getSeverityBorderColorClass(finding.severity);

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            style={style}
            className={clsx(
              'shadow-md hover:opacity-100',
              severityClass,
              isActive && 'ring-2 ring-offset-2 ring-offset-background ring-current',
            )}
            onMouseEnter={onMouseEnter ? () => onMouseEnter(finding.id) : undefined}
            onMouseLeave={onMouseLeave ? () => onMouseLeave(finding.id) : undefined}
            onClick={onClick ? () => onClick(finding.id) : undefined}
            role="button"
            tabIndex={0}
            aria-label={`AI finding: ${finding.description.substring(0, 50)}... Severity: ${finding.severity}${isActive ? '. Active.' : ''}`}
            aria-pressed={isActive}
          />
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="z-50 max-w-xs p-3 rounded-md shadow-xl bg-popover text-popover-foreground"
        >
          <p className="text-xs font-semibold mb-0.5">
            {`Severity: ${finding.severity.charAt(0).toUpperCase() + finding.severity.slice(1)}`}
          </p>
          <p className="mb-1 text-xs">{finding.description}</p>
          {finding.suggestion && (
            <p className="text-xs italic text-muted-foreground">Suggestion: {finding.suggestion}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const AiAnnotationBox = React.memo(AiAnnotationBoxComponent);
AiAnnotationBox.displayName = 'AiAnnotationBox';
