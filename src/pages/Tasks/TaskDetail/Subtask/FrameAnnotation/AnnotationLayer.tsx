import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { twMerge } from 'tailwind-merge';

import { type components } from '@/api/schemas';
import { useAsset } from '@/hooks/useAsset';
import { useLayoutStore } from '@/hooks/useLayoutStore';
import { blinkElement } from '@/utils/blinkElement';

import { type Annotation, useFrameAnnotation } from './useFrameAnnotation';

// Helper function props
type AnnotationElementProps = {
  id: string;
  baseStyle: React.CSSProperties;
  className?: string;
  isInteractive: boolean;
  eventHandlers: Record<string, (e: React.MouseEvent) => void>;
};

type TextAnnotationElementProps = AnnotationElementProps & {
  text: string | null | undefined;
};

type ArrowAnnotationElementProps = AnnotationElementProps & {
  // width and height here are scaled dx and dy
  width: number;
  height: number;
};

// --- Helper functions for rendering specific annotation tool elements ---

function renderRectAnnotation({ id, baseStyle, isInteractive, eventHandlers, className }: AnnotationElementProps) {
  return (
    <div
      key={id}
      className={twMerge(
        'absolute border-2 border-[currentColor] bg-black/20',
        isInteractive && 'cursor-pointer',
        className,
      )}
      style={baseStyle}
      {...eventHandlers}
    />
  );
}

function renderCircleAnnotation({ id, baseStyle, isInteractive, eventHandlers, className }: AnnotationElementProps) {
  return (
    <div
      key={id}
      className={twMerge(
        'absolute rounded-[50%] border-2 border-[currentColor] bg-black/20',
        isInteractive && 'cursor-pointer',
        className,
      )}
      style={baseStyle}
      {...eventHandlers}
    />
  );
}

function renderArrowAnnotation({
  id,
  baseStyle,
  isInteractive,
  eventHandlers,
  width,
  height,
  className,
}: ArrowAnnotationElementProps) {
  const [dx, dy] = [width, height]; // dx, dy are already scaled

  // Debug logging for development
  if (import.meta.env.DEV) {
    console.log(`[Arrow Debug] ID: ${id}, dx: ${dx}, dy: ${dy}, startPos: (${baseStyle.left}, ${baseStyle.top})`);
  }

  // Handle edge case where arrow has zero length
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
    return (
      <div
        key={id}
        className={twMerge(
          'absolute size-2 bg-[currentColor] rounded-full',
          isInteractive && 'cursor-pointer',
          className,
        )}
        style={{
          left: (baseStyle.left as number) - 1,
          top: (baseStyle.top as number) - 1,
          color: baseStyle.color,
        }}
        {...eventHandlers}
      />
    );
  }

  // Calculate the angle and length
  const angleRad = Math.atan2(dy, dx);
  const angle = (angleRad * 180) / Math.PI;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Ensure minimum visible length for very small arrows
  const minLength = 5;

  // Radius of the number marker (Tailwind size-5 -> 1.25rem -> 20px, radius ≈ 10px)
  const markerRadius = 10;

  // Offset the arrow start so it originates outside the marker circle
  const offsetX = Math.cos(angleRad) * markerRadius;
  const offsetY = Math.sin(angleRad) * markerRadius;

  const displayLength = Math.max(length - markerRadius, minLength);

  // Calculate arrow thickness based on length
  const arrowThickness = Math.max(2, Math.min(4, length / 20));

  // The actual start position for the arrow shaft (after offset)
  const startX = (baseStyle.left as number) + offsetX;
  const startY = (baseStyle.top as number) + offsetY;

  if (import.meta.env.DEV) {
    console.log(
      `[Arrow Debug] Angle: ${angle.toFixed(2)}°, Length: ${length.toFixed(2)}, Display Length: ${displayLength.toFixed(2)}`,
    );
  }

  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    left: startX,
    top: startY,
    width: displayLength,
    height: `${arrowThickness}px`,
    backgroundColor: baseStyle.color,
    transform: `rotate(${angle}deg)`,
    transformOrigin: '0 50%', // Transform from the start point (left center)
    zIndex: 10,
  };

  return (
    <div
      key={id}
      className={twMerge('absolute', isInteractive && 'cursor-pointer', className)}
      style={arrowStyle}
      {...eventHandlers}
    >
      {/* Arrow shaft */}
      <div className="w-full h-full bg-[currentColor]" style={{ color: baseStyle.color }} />

      {/* Arrow head */}
      <div
        className="absolute top-1/2 -translate-y-1/2"
        style={{
          right: `-${Math.max(6, arrowThickness * 1.5)}px`, // Scale arrowhead with thickness
          width: 0,
          height: 0,
          borderLeft: `${Math.max(8, arrowThickness * 2)}px solid currentColor`,
          borderTop: `${Math.max(4, arrowThickness)}px solid transparent`,
          borderBottom: `${Math.max(4, arrowThickness)}px solid transparent`,
          color: baseStyle.color,
        }}
      />
    </div>
  );
}

function renderTextAnnotation({
  id,
  baseStyle,
  isInteractive,
  eventHandlers,
  text,
  className,
}: TextAnnotationElementProps) {
  // For text, width and height from baseStyle might not be desired, or represent a background box.
  // Here, we assume baseStyle.left and baseStyle.top are for positioning the text block.
  // Actual width/height will be determined by content or a fixed style if needed.
  const textStyle: React.CSSProperties = {
    left: baseStyle.left,
    top: baseStyle.top,
    color: baseStyle.color,
  };

  return (
    <div
      key={id}
      className={twMerge(
        'absolute p-2 bg-black/20 rounded-md text-sm border-2 border-[currentColor]',
        isInteractive && 'cursor-pointer',
        className,
      )}
      style={textStyle}
      {...eventHandlers}
    >
      {text}
    </div>
  );
}

/**
 * Props for AnnotationLayer.
 * Note: When passing down `attachment_image_url` from parent components like
 * `ImageAnnotation.tsx` or `VideoAnnotation.tsx`, ensure it is correctly destructured
 * from the annotation object and passed as a prop to this component.
 * This was a key lesson from a previous bug where the URL was not passed, leading to
 * thumbnails not appearing in the hover tooltip.
 */
type Props = Annotation & {
  order?: number;
  scale: number;
  offset: { x: number; y: number };
  currentTime?: number;
  // attachment_image_url is part of Annotation type (components['schemas']['SubtaskAnnotation'])

  // 编辑相关props
  isEditable?: boolean;
  isEditing?: boolean;
  currentRect?: components['schemas']['Rect'] | null;
  isDirty?: boolean;
  saveStatus?: 'idle' | 'saving' | 'success' | 'error';
  onStartEditing?: (annotationId: string, rect: components['schemas']['Rect']) => void;
  onUpdateWhileEditing?: (annotationId: string, newRect: components['schemas']['Rect']) => void;
  onFinishEditing?: (annotationId: string) => void;
  onCancelEditing?: (annotationId: string) => void;
};

// Helper function to check if annotation should be rendered
function shouldRenderAnnotation(
  currentTime: number | undefined,
  startAt: number | null | undefined,
  endAt: number | null | undefined,
  solved: boolean | null | undefined,
  isShowSolvedAnnotations: boolean,
): boolean {
  if (currentTime !== undefined && startAt !== undefined && startAt !== null && endAt !== undefined && endAt !== null) {
    if (currentTime < startAt || currentTime > endAt) {
      return false;
    }
  }

  return !(solved && !isShowSolvedAnnotations);
}

// Helper function to render annotation element based on tool type
function renderAnnotationElement(
  tool: string | null | undefined,
  commonElementProps: Omit<AnnotationElementProps, 'baseStyle'>,
  baseStyle: React.CSSProperties,
  text: string | null | undefined,
  rect: components['schemas']['Rect'],
  offset: { x: number; y: number },
  scale: number,
  color: string | null | undefined,
): JSX.Element | null {
  switch (tool) {
    case 'circle':
      return renderCircleAnnotation({ ...commonElementProps, baseStyle });
    case 'arrow': {
      const arrowStartX = offset.x + rect.x * scale;
      const arrowStartY = offset.y + rect.y * scale;
      return renderArrowAnnotation({
        ...commonElementProps,
        baseStyle: {
          left: arrowStartX,
          top: arrowStartY,
          color: color || undefined,
        },
        width: rect.width * scale,
        height: rect.height * scale,
      });
    }
    case 'text':
      return renderTextAnnotation({ ...commonElementProps, baseStyle, text });
    case 'rect':
      return renderRectAnnotation({ ...commonElementProps, baseStyle });
    default:
      return null;
  }
}

/**
 * AnnotationLayer component renders a single annotation on the image or video.
 * It handles display mãechanics for different annotation tools and shows a tooltip
 * with comments and attachment thumbnails on hover.
 *
 */
export function AnnotationLayer(props: Props) {
  // Ensure `attachment_image_url` is correctly received from props.
  // This value originates from the `annotations` array in parent components.
  const {
    id,
    text,
    rect,
    color,
    tool,
    order,
    scale,
    offset,
    currentTime,
    solved,
    start_at: startAt,
    end_at: endAt,
    attachment_image_url: attachmentImageUrlFromProps, // Renamed for clarity

    // 编辑相关props
    isEditable = false,
    isEditing = false,
    currentRect,
    saveStatus = 'idle',
    onStartEditing,
    onUpdateWhileEditing,
    onFinishEditing,
    onCancelEditing,
  } = props;
  const [isHovering, setIsHovering] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const annotationRef = useRef<HTMLDivElement>(null);

  // `useAsset` hook is crucial for processing the raw attachment URL (e.g., an S3 URI)
  // into a directly usable HTTPS URL, often a presigned URL for secure access.
  // If thumbnails are not appearing, first verify `attachmentImageUrlFromProps` is being passed correctly,
  // then check if `useAsset` is functioning as expected.
  const { assetUrl: processedAttachmentImageUrl } = useAsset(attachmentImageUrlFromProps || '');

  const { startPos, currentTool } = useFrameAnnotation();
  const { isShowSolvedAnnotations } = useLayoutStore();

  // 双击处理：进入编辑模式
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (startPos || !isEditable || !rect || !onStartEditing) {
        return;
      }
      e.stopPropagation();
      onStartEditing(id, rect);
    },
    [startPos, isEditable, rect, onStartEditing, id],
  );

  // 拖拽处理（支持移动和调整大小）
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (startPos) {
        return;
      }

      if (isEditing && onUpdateWhileEditing && rect) {
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startRect = currentRect || rect;

        const handleMouseMove = (moveEvent: MouseEvent) => {
          const deltaX = (moveEvent.clientX - startX) / scale;
          const deltaY = (moveEvent.clientY - startY) / scale;

          const newRect = {
            ...startRect,
            x: startRect.x + deltaX,
            y: startRect.y + deltaY,
          };

          onUpdateWhileEditing(id, newRect);
        };

        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return;
      }

      // 只有在非cursor模式下才阻止事件传播，允许AI annotation交互
      const shouldStopPropagation = startPos || currentTool !== 'cursor';
      if (shouldStopPropagation) {
        e.stopPropagation();
      }
    },
    [startPos, isEditing, onUpdateWhileEditing, rect, currentRect, scale, id, currentTool],
  );

  // 调整大小的处理函数
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, direction: string) => {
      if (!isEditing || !onUpdateWhileEditing || !rect) {
        return;
      }

      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startRect = currentRect || rect;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = (moveEvent.clientX - startX) / scale;
        const deltaY = (moveEvent.clientY - startY) / scale;

        const calculateNewRect = () => {
          const newRect = { ...startRect };

          switch (direction) {
            case 'nw': // 左上角
              newRect.x = startRect.x + deltaX;
              newRect.y = startRect.y + deltaY;
              newRect.width = startRect.width - deltaX;
              newRect.height = startRect.height - deltaY;
              break;
            case 'n': // 上边
              newRect.y = startRect.y + deltaY;
              newRect.height = startRect.height - deltaY;
              break;
            case 'ne': // 右上角
              newRect.y = startRect.y + deltaY;
              newRect.width = startRect.width + deltaX;
              newRect.height = startRect.height - deltaY;
              break;
            case 'e': // 右边
              newRect.width = startRect.width + deltaX;
              break;
            case 'se': // 右下角
              newRect.width = startRect.width + deltaX;
              newRect.height = startRect.height + deltaY;
              break;
            case 's': // 下边
              newRect.height = startRect.height + deltaY;
              break;
            case 'sw': // 左下角
              newRect.x = startRect.x + deltaX;
              newRect.width = startRect.width - deltaX;
              newRect.height = startRect.height + deltaY;
              break;
            case 'w': // 左边
              newRect.x = startRect.x + deltaX;
              newRect.width = startRect.width - deltaX;
              break;
          }

          // 确保最小尺寸
          const minSize = 10;
          if (newRect.width < minSize) {
            if (direction.includes('w')) {
              newRect.x = startRect.x + startRect.width - minSize;
            }
            newRect.width = minSize;
          }
          if (newRect.height < minSize) {
            if (direction.includes('n')) {
              newRect.y = startRect.y + startRect.height - minSize;
            }
            newRect.height = minSize;
          }

          return newRect;
        };

        const newRect = calculateNewRect();

        onUpdateWhileEditing(id, newRect);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [isEditing, onUpdateWhileEditing, rect, currentRect, scale, id],
  );

  // 键盘事件处理
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isEditing) {
        return;
      }

      if (e.key === 'Escape' && onCancelEditing) {
        onCancelEditing(id);
      }
    },
    [isEditing, onCancelEditing, id],
  );

  // 点击外部区域处理
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (!isEditing || !annotationRef.current) {
        return;
      }

      const target = e.target as Node;
      if (!annotationRef.current.contains(target) && onFinishEditing) {
        onFinishEditing(id);
      }
    },
    [isEditing, id, onFinishEditing],
  );

  // 绑定事件监听器
  useEffect(() => {
    if (isEditing) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isEditing, handleKeyDown, handleClickOutside]);

  if (!shouldRenderAnnotation(currentTime, startAt, endAt, solved, isShowSolvedAnnotations)) {
    return null;
  }

  // 判断是否应该阻止事件传播
  // 只有在用户正在进行annotation绘制时才阻止，这样AI annotation可以正常交互
  const shouldStopPropagation = startPos || currentTool !== 'cursor';

  const handleMouseEvent = {
    onMouseDown: handleMouseDown,
    onMouseMove: (e: React.MouseEvent) => {
      if (startPos) {
        return;
      }
      if (shouldStopPropagation && !isEditing) {
        e.stopPropagation();
      }
    },
    onMouseUp: (e: React.MouseEvent) => {
      if (startPos) {
        return;
      }
      if (shouldStopPropagation && !isEditing) {
        e.stopPropagation();
      }
    },
    onClick: (e: React.MouseEvent) => {
      if (startPos) {
        return;
      }
      // 点击手工annotation时总是阻止传播，并跳转到对应的annotation
      e.stopPropagation();

      const annotationDOMElement = document.getElementById('annotation-' + id);
      if (annotationDOMElement) {
        annotationDOMElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        annotationDOMElement.focus();
        blinkElement(annotationDOMElement);
      }
    },
    onDoubleClick: handleDoubleClick,
    onMouseEnter: () => setIsHovering(true),
    onMouseLeave: () => setIsHovering(false),
  };

  if (!rect || !color) {
    return;
  }

  // 使用编辑中的rect或原始rect
  const activeRect = currentRect || rect;

  const displayProps = {
    left: offset.x + activeRect.x * scale,
    top: offset.y + activeRect.y * scale,
    width: activeRect.width * scale,
    height: activeRect.height * scale,
  };

  const getZIndex = () => {
    if (isEditing) {
      return 30;
    } // 最高优先级
    if (isHovering) {
      return 25;
    } // hover时高于AI annotation激活状态
    return 15; // 默认高于AI annotation默认状态
  };

  // Calculate mark position based on annotation type
  const markPosition =
    tool === 'arrow'
      ? {
          left: offset.x + rect.x * scale - 9,
          top: offset.y + rect.y * scale - 9,
        }
      : {
          left: displayProps.left - 9,
          top: displayProps.top - 9,
        };

  const markOrder = (
    <div
      className="absolute text-xs text-white rounded-full size-5 text-center leading-5 cursor-pointer"
      style={{
        left: markPosition.left,
        top: markPosition.top,
        backgroundColor: isEditing ? '#3b82f6' : color,
        // 确保标记与annotation本体使用相同的z-index
        zIndex: getZIndex(),
      }}
      id={'annotation-mark-' + id}
      {...handleMouseEvent}
    >
      {order}
    </div>
  );

  const isInteractive = !startPos;
  const commonElementProps = {
    id,
    isInteractive,
    eventHandlers: handleMouseEvent,
    className: 'group', // Added group class for consistency, though not actively used by parent hover
  };

  const baseStyle: React.CSSProperties = {
    left: displayProps.left,
    top: displayProps.top,
    width: displayProps.width,
    height: displayProps.height,
    color: isEditing ? '#3b82f6' : color, // 编辑时使用蓝色
    // 手工annotation的z-index层级管理
    zIndex: getZIndex(),
    // 编辑状态的视觉反馈
    ...(isEditing && {
      borderStyle: 'dashed',
      borderWidth: '2px',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      cursor: 'move',
    }),
    // 非编辑状态的样式
    ...(!isEditing && {
      borderStyle: 'solid',
      borderWidth: '2px',
      cursor: isEditable ? 'pointer' : 'default',
    }),
  };

  const annotationElement = renderAnnotationElement(
    tool,
    commonElementProps,
    baseStyle,
    text,
    rect,
    offset,
    scale,
    color,
  );

  // 调整大小控制点
  const renderResizeHandles = () => {
    if (!isEditing || (tool !== 'rect' && tool !== 'circle')) {
      return null;
    }

    const handleSize = 8;
    const handleOffset = handleSize / 2;
    const handles = [
      // 四个角
      {
        direction: 'nw',
        style: {
          left: displayProps.left - handleOffset,
          top: displayProps.top - handleOffset,
          cursor: 'nw-resize',
        },
      },
      {
        direction: 'ne',
        style: {
          left: displayProps.left + displayProps.width - handleOffset,
          top: displayProps.top - handleOffset,
          cursor: 'ne-resize',
        },
      },
      {
        direction: 'se',
        style: {
          left: displayProps.left + displayProps.width - handleOffset,
          top: displayProps.top + displayProps.height - handleOffset,
          cursor: 'se-resize',
        },
      },
      {
        direction: 'sw',
        style: {
          left: displayProps.left - handleOffset,
          top: displayProps.top + displayProps.height - handleOffset,
          cursor: 'sw-resize',
        },
      },
      // 四个边的中点
      {
        direction: 'n',
        style: {
          left: displayProps.left + displayProps.width / 2 - handleOffset,
          top: displayProps.top - handleOffset,
          cursor: 'n-resize',
        },
      },
      {
        direction: 'e',
        style: {
          left: displayProps.left + displayProps.width - handleOffset,
          top: displayProps.top + displayProps.height / 2 - handleOffset,
          cursor: 'e-resize',
        },
      },
      {
        direction: 's',
        style: {
          left: displayProps.left + displayProps.width / 2 - handleOffset,
          top: displayProps.top + displayProps.height - handleOffset,
          cursor: 's-resize',
        },
      },
      {
        direction: 'w',
        style: {
          left: displayProps.left - handleOffset,
          top: displayProps.top + displayProps.height / 2 - handleOffset,
          cursor: 'w-resize',
        },
      },
    ];

    return handles.map((handle) => (
      <div
        key={handle.direction}
        className="absolute bg-blue-600 border border-white rounded-sm hover:bg-blue-700 transition-colors"
        style={{
          ...handle.style,
          width: handleSize,
          height: handleSize,
          zIndex: getZIndex() + 2,
          cursor: handle.style.cursor,
        }}
        onMouseDown={(e) => handleResizeMouseDown(e, handle.direction)}
      />
    ));
  };

  // Default cursor
  return (
    <div ref={annotationRef}>
      {annotationElement}
      {!!order && markOrder}

      {/* 调整大小控制点 */}
      {renderResizeHandles()}

      {/* 编辑状态指示器 */}
      {isEditing && (
        <div
          className="absolute bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
          style={{
            left: displayProps.left,
            top: displayProps.top - 25,
            zIndex: getZIndex() + 1,
          }}
        >
          編集中 (側にクリックで保存, Escでキャンセル, ドラッグでサイズ変更)
        </div>
      )}

      {/* 保存状态指示器 */}
      {saveStatus === 'saving' && (
        <div
          className="absolute bg-yellow-600 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
          style={{
            left: displayProps.left,
            top: displayProps.top - 25,
            zIndex: getZIndex() + 1,
          }}
        >
          保存中...
        </div>
      )}

      {saveStatus === 'success' && (
        <div
          className="absolute bg-green-600 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
          style={{
            left: displayProps.left,
            top: displayProps.top - 25,
            zIndex: getZIndex() + 1,
          }}
        >
          保存完了
        </div>
      )}

      {saveStatus === 'error' && (
        <div
          className="absolute bg-red-600 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
          style={{
            left: displayProps.left,
            top: displayProps.top - 25,
            zIndex: getZIndex() + 1,
          }}
        >
          保存失败
        </div>
      )}
      {isHovering && (text || processedAttachmentImageUrl) && tool !== 'text' && (
        <div
          className="absolute p-2 text-xs text-white bg-black rounded-md shadow-lg z-10 flex flex-col gap-1 items-start"
          style={{
            left:
              tool === 'arrow'
                ? offset.x + rect.x * scale + Math.max(0, rect.width * scale) + 5
                : displayProps.left + displayProps.width + 5,
            top: tool === 'arrow' ? offset.y + rect.y * scale + Math.min(0, rect.height * scale) : displayProps.top,
            maxWidth: '200px', // Reset max-width after removing debug info
          }}
        >
          {text && <div className="break-all">{text}</div>} {/* Display comment text */}
          {/* Removed debug display for AttachURL_Orig and AttachURL_Proc */}
          {processedAttachmentImageUrl && ( // Display thumbnail if processed URL exists
            <img
              src={processedAttachmentImageUrl}
              alt="Attachment Thumbnail"
              className="h-auto rounded object-cover border border-gray-400 cursor-pointer hover:opacity-80 transition-opacity"
              style={{ width: '50px', height: '40px' }}
              onClick={(e) => {
                e.stopPropagation();
                setIsImageModalOpen(true);
              }}
              onLoad={() => console.log('[AnnotationLayer] Image loaded successfully:', processedAttachmentImageUrl)}
              onError={() => console.error('[AnnotationLayer] Image FAILED to load:', processedAttachmentImageUrl)}
            />
          )}
        </div>
      )}

      {/* 图片放大模态框 - 使用 createPortal */}
      {isImageModalOpen &&
        processedAttachmentImageUrl &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="annotation-image-preview-title"
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4"
            onClick={() => setIsImageModalOpen(false)}
          >
            <div
              className="relative flex flex-col max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="annotation-image-preview-title" className="sr-only">
                Annotation Image Preview
              </h3>
              <div className="relative flex items-center justify-center flex-grow min-h-0">
                <img
                  src={processedAttachmentImageUrl}
                  alt="Annotation Image Preview"
                  className="max-w-full max-h-full object-contain"
                  style={{ maxWidth: 'calc(100vw - 2rem)', maxHeight: 'calc(100vh - 8rem)' }}
                />
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                  onClick={() => setIsImageModalOpen(false)}
                  aria-label="Close image preview"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
