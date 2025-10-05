import { FileText, Move } from 'lucide-react';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { LuClock, LuFileText, LuHistory, LuSave, LuSearch, LuTrash2, LuUndo, LuUpload, LuUser } from 'react-icons/lu';
import { twMerge } from 'tailwind-merge';

import { type ItemSearchByImageResponse, searchItemsByImage } from '@/api/itemsService';
import { type components } from '@/api/schemas'; // For history prop type
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';

import { UnifiedPDFPreviewModal } from './components/UnifiedPDFPreviewModal';
import { AnnotationInput } from './FrameAnnotation/AnnotationInput';
import { AnnotationLayer } from './FrameAnnotation/AnnotationLayer';
import { DrawingCanvas, type DrawingCanvasRef } from './FrameAnnotation/DrawingCanvas';
import {
  ImageOverlayCanvas,
  type ImageOverlayCanvasRef,
  type OverlayImage,
} from './FrameAnnotation/ImageOverlayCanvas';
import { useEditableAnnotation } from './FrameAnnotation/useEditableAnnotation';
import { type Annotation, useFrameAnnotation } from './FrameAnnotation/useFrameAnnotation';
import { useDrawingAnnotation } from './useDrawingAnnotation';
import { useSubtask } from './useSubtask';

const TOOL_CURSOR_CLASSES: Record<string, string> = {
  cursor: 'cursor-default', // Default for cursor tool, will be overridden by grab/grabbing
  text: 'cursor-text',
  rect: 'cursor-crosshair',
  circle: 'cursor-crosshair',
  arrow: 'cursor-crosshair',
  search: 'cursor-crosshair',
  pen: 'cursor-crosshair',
};

interface DragData {
  type: string;
  id?: string;
  s3Path?: string;
  filename?: string;
  assetUrl?: string;
  similarityScore?: number;
}

export interface ImageDisplayMetrics {
  scale: number;
  paddingX: number;
  paddingY: number;
  scaledWidth: number;
  scaledHeight: number;
}

type Props = {
  imageUrl: string;
  imageAlt?: string;
  annotations: Annotation[];
  onAnnotationCreate: (annotation: Annotation) => void;
  isSubmitting?: boolean;
  history: components['schemas']['SubtaskContent'][];
  version: number;
  selectedVersion: number;
  onVersionChange: (version: number) => void;
  canUpdateAsset?: boolean;
  isAiReviewing?: boolean;
  onAssetFileUpdate?: (file: File) => Promise<void>;
  isUpdatingAsset?: boolean;
  onImageDisplayMetricsChange?: (metrics: ImageDisplayMetrics) => void;
  onRequestOpenCommentInput?: () => void;
  projectId?: string;
  onSearchResults?: (
    results: ItemSearchByImageResponse,
    cropInfo?: { x: number; y: number; width: number; height: number },
  ) => void;
  onSwitchToSearchPanel?: () => void;
  subtaskId?: string; // 添加subtaskId用于编辑功能
};

interface PanStartDetails {
  mouseX: number;
  mouseY: number;
  initialPaddingX: number;
  initialPaddingY: number;
}

// Helper function to format date
const formatVersionDate = (dateString?: string | null): string => {
  if (!dateString) {
    return '';
  }
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

// Helper function to get relative time
const getRelativeTime = (dateString?: string | null): string => {
  if (!dateString) {
    return '';
  }
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return '数分前';
    } else if (diffInHours < 24) {
      return `${diffInHours}時間前`;
    } else if (diffInHours < 168) {
      // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days}日前`;
    } else {
      return formatVersionDate(dateString);
    }
  } catch {
    return '';
  }
};

// Helper function to truncate author name
const truncateAuthor = (author?: string | null): string => {
  if (!author) {
    return '';
  }
  // If it looks like a UUID, show first 8 characters
  if (author.length > 20 && author.includes('-')) {
    return `${author.substring(0, 8)}...`;
  }
  // If it's a long name, truncate
  if (author.length > 15) {
    return `${author.substring(0, 12)}...`;
  }
  return author;
};

// Helper function to get version info
const getVersionInfo = (
  versionNumber: number,
  history: components['schemas']['SubtaskContent'][],
  currentVersion: number,
): components['schemas']['SubtaskContent'] | null => {
  if (versionNumber === currentVersion) {
    // Current version - we don't have its content in history
    return null;
  }
  // History is ordered from newest to oldest, so we need to find the right index
  const historyIndex = currentVersion - versionNumber - 1;
  return history[historyIndex] || null;
};

// 可拖动可变形的搜索矩形组件
interface DraggableSearchRectProps {
  rect: { x: number; y: number; width: number; height: number };
  onRectChange: (rect: { x: number; y: number; width: number; height: number }) => void;
  onRectChangeComplete: (rect: { x: number; y: number; width: number; height: number }) => void;
  padding: { x: number; y: number };
  renderedImageSize: { width: number; height: number };
}

function DraggableSearchRect({
  rect,
  onRectChange,
  onRectChangeComplete,
  padding,
  renderedImageSize,
}: DraggableSearchRectProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialRect, setInitialRect] = useState(rect);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, action: 'drag' | 'resize', handle?: string) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;

      setDragStart({ x: startX, y: startY });
      setInitialRect(rect);

      if (action === 'drag') {
        setIsDragging(true);
      } else if (action === 'resize' && handle) {
        setIsResizing(true);
        setResizeHandle(handle);
      }
    },
    [rect],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging && !isResizing) {
        return;
      }

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      if (isDragging) {
        // 拖动整个矩形
        const newX = Math.max(
          padding.x,
          Math.min(initialRect.x + deltaX, padding.x + renderedImageSize.width - initialRect.width),
        );
        const newY = Math.max(
          padding.y,
          Math.min(initialRect.y + deltaY, padding.y + renderedImageSize.height - initialRect.height),
        );

        onRectChange({
          x: newX,
          y: newY,
          width: initialRect.width,
          height: initialRect.height,
        });
      } else if (isResizing) {
        // 调整矩形大小
        const newRect = { ...initialRect };

        switch (resizeHandle) {
          case 'nw': // 左上角
            newRect.x = Math.max(padding.x, Math.min(initialRect.x + deltaX, initialRect.x + initialRect.width - 20));
            newRect.y = Math.max(padding.y, Math.min(initialRect.y + deltaY, initialRect.y + initialRect.height - 20));
            newRect.width = initialRect.width - (newRect.x - initialRect.x);
            newRect.height = initialRect.height - (newRect.y - initialRect.y);
            break;
          case 'ne': // 右上角
            newRect.y = Math.max(padding.y, Math.min(initialRect.y + deltaY, initialRect.y + initialRect.height - 20));
            newRect.width = Math.max(
              20,
              Math.min(initialRect.width + deltaX, padding.x + renderedImageSize.width - initialRect.x),
            );
            newRect.height = initialRect.height - (newRect.y - initialRect.y);
            break;
          case 'sw': // 左下角
            newRect.x = Math.max(padding.x, Math.min(initialRect.x + deltaX, initialRect.x + initialRect.width - 20));
            newRect.width = initialRect.width - (newRect.x - initialRect.x);
            newRect.height = Math.max(
              20,
              Math.min(initialRect.height + deltaY, padding.y + renderedImageSize.height - initialRect.y),
            );
            break;
          case 'se': // 右下角
            newRect.width = Math.max(
              20,
              Math.min(initialRect.width + deltaX, padding.x + renderedImageSize.width - initialRect.x),
            );
            newRect.height = Math.max(
              20,
              Math.min(initialRect.height + deltaY, padding.y + renderedImageSize.height - initialRect.y),
            );
            break;
          case 'n': // 上边
            newRect.y = Math.max(padding.y, Math.min(initialRect.y + deltaY, initialRect.y + initialRect.height - 20));
            newRect.height = initialRect.height - (newRect.y - initialRect.y);
            break;
          case 's': // 下边
            newRect.height = Math.max(
              20,
              Math.min(initialRect.height + deltaY, padding.y + renderedImageSize.height - initialRect.y),
            );
            break;
          case 'w': // 左边
            newRect.x = Math.max(padding.x, Math.min(initialRect.x + deltaX, initialRect.x + initialRect.width - 20));
            newRect.width = initialRect.width - (newRect.x - initialRect.x);
            break;
          case 'e': // 右边
            newRect.width = Math.max(
              20,
              Math.min(initialRect.width + deltaX, padding.x + renderedImageSize.width - initialRect.x),
            );
            break;
        }

        onRectChange(newRect);
      }
    },
    [isDragging, isResizing, dragStart, initialRect, resizeHandle, onRectChange, padding, renderedImageSize],
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging || isResizing) {
      // 在拖动或调整大小结束时触发搜索
      onRectChangeComplete(rect);
    }
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle('');
  }, [isDragging, isResizing, rect, onRectChangeComplete]);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleSize = 8; // 调整手柄的大小

  return (
    <div
      className="absolute border-2 border-blue-500 bg-blue-200/30 shadow-lg ring-1 ring-blue-400/50"
      style={{
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={(e) => handleMouseDown(e, 'drag')}
    >
      {/* 调整大小的手柄 */}
      {/* 四个角 */}
      <div
        className="absolute bg-blue-600 border-2 border-white cursor-nw-resize shadow-md hover:bg-blue-700 transition-colors"
        style={{
          left: -handleSize / 2,
          top: -handleSize / 2,
          width: handleSize,
          height: handleSize,
        }}
        onMouseDown={(e) => handleMouseDown(e, 'resize', 'nw')}
      />
      <div
        className="absolute bg-blue-600 border-2 border-white cursor-ne-resize shadow-md hover:bg-blue-700 transition-colors"
        style={{
          right: -handleSize / 2,
          top: -handleSize / 2,
          width: handleSize,
          height: handleSize,
        }}
        onMouseDown={(e) => handleMouseDown(e, 'resize', 'ne')}
      />
      <div
        className="absolute bg-blue-600 border-2 border-white cursor-sw-resize shadow-md hover:bg-blue-700 transition-colors"
        style={{
          left: -handleSize / 2,
          bottom: -handleSize / 2,
          width: handleSize,
          height: handleSize,
        }}
        onMouseDown={(e) => handleMouseDown(e, 'resize', 'sw')}
      />
      <div
        className="absolute bg-blue-600 border-2 border-white cursor-se-resize shadow-md hover:bg-blue-700 transition-colors"
        style={{
          right: -handleSize / 2,
          bottom: -handleSize / 2,
          width: handleSize,
          height: handleSize,
        }}
        onMouseDown={(e) => handleMouseDown(e, 'resize', 'se')}
      />

      {/* 四条边的中点 */}
      <div
        className="absolute bg-blue-600 border-2 border-white cursor-n-resize shadow-md hover:bg-blue-700 transition-colors"
        style={{
          left: '50%',
          top: -handleSize / 2,
          width: handleSize,
          height: handleSize,
          transform: 'translateX(-50%)',
        }}
        onMouseDown={(e) => handleMouseDown(e, 'resize', 'n')}
      />
      <div
        className="absolute bg-blue-600 border-2 border-white cursor-s-resize shadow-md hover:bg-blue-700 transition-colors"
        style={{
          left: '50%',
          bottom: -handleSize / 2,
          width: handleSize,
          height: handleSize,
          transform: 'translateX(-50%)',
        }}
        onMouseDown={(e) => handleMouseDown(e, 'resize', 's')}
      />
      <div
        className="absolute bg-blue-600 border-2 border-white cursor-w-resize shadow-md hover:bg-blue-700 transition-colors"
        style={{
          left: -handleSize / 2,
          top: '50%',
          width: handleSize,
          height: handleSize,
          transform: 'translateY(-50%)',
        }}
        onMouseDown={(e) => handleMouseDown(e, 'resize', 'w')}
      />
      <div
        className="absolute bg-blue-600 border-2 border-white cursor-e-resize shadow-md hover:bg-blue-700 transition-colors"
        style={{
          right: -handleSize / 2,
          top: '50%',
          width: handleSize,
          height: handleSize,
          transform: 'translateY(-50%)',
        }}
        onMouseDown={(e) => handleMouseDown(e, 'resize', 'e')}
      />
    </div>
  );
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function ImageAnnotation(props: Props) {
  const {
    imageUrl,
    imageAlt,
    annotations,
    onAnnotationCreate,
    isSubmitting,
    history,
    version,
    selectedVersion,
    onVersionChange,
    canUpdateAsset,
    isAiReviewing,
    onAssetFileUpdate,
    isUpdatingAsset,
    onImageDisplayMetricsChange,
    onRequestOpenCommentInput,
    projectId,
    onSearchResults,
    onSwitchToSearchPanel,
    subtaskId,
  } = props;

  const [scale, setScale] = useState(1);
  const [padding, setPadding] = useState({ x: 0, y: 0 });
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [renderedImageSize, setRenderedImageSize] = useState({ width: 0, height: 0 });

  const [isPanning, setIsPanning] = useState(false);
  const [isPDFPreviewOpen, setIsPDFPreviewOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [panStartDetails, setPanStartDetails] = useState<PanStartDetails | null>(null);
  const [isCurrentlyPannable, setIsCurrentlyPannable] = useState(false);

  const {
    setStartPos,
    setCurrentRect,
    setIsShowingAnnotationInput,
    isShowingAnnotationInput,
    startPos,
    currentTool,
    currentRect,
    currentColor,
    currentText,
    searchRect,
    setSearchRect,
    setSearchContext,
    isDrawingMode,
    brushSize,
    setDrawingData,
  } = useFrameAnnotation();

  // 编辑功能相关hooks
  const subtaskHookResult = useSubtask(subtaskId || '', selectedVersion);
  const updateAnnotation = subtaskId ? subtaskHookResult.updateAnnotation : null;

  const editableAnnotation = useEditableAnnotation({
    onSave: async (annotationId: string, newRect: components['schemas']['Rect']) => {
      return new Promise<void>((resolve) => {
        if (updateAnnotation) {
          updateAnnotation({ annotationId, rect: newRect });
        }
        resolve();
      });
    },
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drawingCanvasRef = useRef<DrawingCanvasRef>(null);
  const imageOverlayCanvasRef = useRef<ImageOverlayCanvasRef>(null);

  // Keep track of previous rendered size and padding to preserve pan when zooming
  const prevRenderedSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const prevZoomLevelRef = useRef<number>(1);
  const paddingRef = useRef(padding);
  useEffect(() => {
    paddingRef.current = padding;
  }, [padding]);

  // Drawing annotation management
  const { drawingData, saveDrawing, clearDrawing, isSaving } = useDrawingAnnotation(subtaskId || '');
  const [unsavedDrawingData, setUnsavedDrawingData] = useState<string | undefined>(undefined);

  // 图片叠加层状态
  const [overlayImages, setOverlayImages] = useState<OverlayImage[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);

  // 监听叠加图片状态变化
  useEffect(() => {
    console.log('🔄 叠加图片状态变化:', {
      count: overlayImages.length,
      overlayImages,
      selectedOverlayId,
    });
  }, [overlayImages, selectedOverlayId]);

  // Clear unsaved data when save is successful
  useEffect(() => {
    if (drawingData === unsavedDrawingData && unsavedDrawingData) {
      setUnsavedDrawingData(undefined);
    }
  }, [drawingData, unsavedDrawingData]);

  // Reset unsaved drawing data when subtask changes
  useEffect(() => {
    setUnsavedDrawingData(undefined);
  }, [subtaskId]);

  // 搜索功能
  const performSearch = async (rect: { x: number; y: number; width: number; height: number }) => {
    console.log('performSearch called with rect:', rect);
    console.log('projectId:', projectId);
    console.log('imgRef.current:', imgRef.current);
    console.log('renderedImageSize:', renderedImageSize);
    console.log('padding:', padding);

    if (!projectId || !imgRef.current) {
      console.log('Early return: missing projectId or imgRef');
      return;
    }

    try {
      // 计算相对于原图的坐标 (0-1)
      const displayWidth = renderedImageSize.width;
      const displayHeight = renderedImageSize.height;

      console.log('Display dimensions:', { displayWidth, displayHeight });

      if (displayWidth === 0 || displayHeight === 0) {
        console.log('Early return: display dimensions are 0');
        return;
      }

      const relativeX = (rect.x - padding.x) / displayWidth;
      const relativeY = (rect.y - padding.y) / displayHeight;
      const relativeWidth = rect.width / displayWidth;
      const relativeHeight = rect.height / displayHeight;

      // 确保坐标在0-1范围内
      const cropInfo = {
        x: Math.max(0, Math.min(1, relativeX)),
        y: Math.max(0, Math.min(1, relativeY)),
        width: Math.max(0, Math.min(1, relativeWidth)),
        height: Math.max(0, Math.min(1, relativeHeight)),
      };

      console.log('Performing search with crop info:', cropInfo);

      const searchResults = await searchItemsByImage(projectId, imageUrl, 20, cropInfo);

      if (onSearchResults) {
        onSearchResults(searchResults, cropInfo);
      }

      console.log('Search results:', searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  // Helper function for panning logic
  const handlePanningMove = (e: React.MouseEvent) => {
    if (!panStartDetails || !containerRef.current) {
      return;
    }

    e.preventDefault();
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;

    let newPaddingX;
    let newPaddingY;

    const deltaX = e.clientX - panStartDetails.mouseX;
    const proposedX = panStartDetails.initialPaddingX + deltaX;
    if (renderedImageSize.width > containerWidth) {
      const minX = containerWidth - renderedImageSize.width;
      const maxX = 0;
      newPaddingX = Math.max(minX, Math.min(proposedX, maxX));
    } else {
      newPaddingX = (containerWidth - renderedImageSize.width) / 2;
    }

    const deltaY = e.clientY - panStartDetails.mouseY;
    const proposedY = panStartDetails.initialPaddingY + deltaY;
    if (renderedImageSize.height > containerHeight) {
      const minY = containerHeight - renderedImageSize.height;
      const maxY = 0;
      newPaddingY = Math.max(minY, Math.min(proposedY, maxY));
    } else {
      newPaddingY = (containerHeight - renderedImageSize.height) / 2;
    }

    const newDynamicPadding = { x: newPaddingX, y: newPaddingY };
    setPadding(newDynamicPadding);

    if (onImageDisplayMetricsChange) {
      onImageDisplayMetricsChange({
        scale,
        paddingX: newDynamicPadding.x,
        paddingY: newDynamicPadding.y,
        scaledWidth: renderedImageSize.width,
        scaledHeight: renderedImageSize.height,
      });
    }
  };

  // Helper function for drawing logic
  const handleDrawingMove = (e: React.MouseEvent) => {
    if (!startPos || isShowingAnnotationInput || !containerRef.current) {
      return;
    }

    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentRect(
      currentTool === 'arrow'
        ? { x: startPos.x, y: startPos.y, width: x - startPos.x, height: y - startPos.y }
        : {
            x: x < startPos.x ? x : startPos.x,
            y: y < startPos.y ? y : startPos.y,
            width: Math.abs(x - startPos.x),
            height: Math.abs(y - startPos.y),
          },
    );
  };

  // Effect to update isCurrentlyPannable state based on dimensions
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;
      setIsCurrentlyPannable(renderedImageSize.width > containerWidth || renderedImageSize.height > containerHeight);
    } else {
      setIsCurrentlyPannable(false); // Should not happen after mount
    }
  }, [renderedImageSize]);

  const handleAnnotationStart = (e: React.MouseEvent) => {
    if (!containerRef.current) {
      return;
    }

    if (currentTool === 'cursor' && isCurrentlyPannable) {
      e.preventDefault();
      setIsPanning(true);
      setPanStartDetails({
        mouseX: e.clientX,
        mouseY: e.clientY,
        initialPaddingX: padding.x,
        initialPaddingY: padding.y,
      });
      return;
    }

    if (currentTool !== 'cursor') {
      if (startPos || isShowingAnnotationInput) {
        return; // Already drawing or input is open
      }
      if (imgRef.current && e.target !== imgRef.current) {
        return; // Click was not on the image itself
      }
      e.preventDefault();

      // 如果是搜索工具，在开始绘制新区域时清除之前的搜索结果
      if (currentTool === 'search' && onSearchResults) {
        onSearchResults({ results: [], total: 0 }, undefined);
      }

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setStartPos({ x, y });
      setCurrentRect({ x, y, width: 0, height: 0 });
      if (currentTool === 'text') {
        setIsShowingAnnotationInput(true);
      }
    } else {
      // If cursor tool but not pannable, prevent default browser actions like image drag
      e.preventDefault();
    }
  };

  const handleAnnotationMove = (e: React.MouseEvent) => {
    if (isPanning) {
      handlePanningMove(e);
      return;
    }

    if (currentTool !== 'cursor') {
      handleDrawingMove(e);
    }
  };

  const handleAnnotationEnd = () => {
    if (isPanning) {
      setIsPanning(false);
      setPanStartDetails(null);
      return;
    }

    if (currentTool !== 'cursor' && startPos) {
      // 如果是搜索工具且有有效的矩形，执行搜索
      if (currentTool === 'search' && currentRect && currentRect.width > 10 && currentRect.height > 10) {
        // 设置搜索上下文为工具模式
        setSearchContext({
          source: 'tool',
          annotationRect: currentRect,
        });

        setSearchRect(currentRect);
        void performSearch(currentRect);
        // 重置绘制状态，但保留搜索矩形
        setStartPos(undefined);
        setCurrentRect(undefined);
      } else if (currentTool !== 'search') {
        setIsShowingAnnotationInput(true);
      }
    }
  };

  useEffect(() => {
    const imgElement = imgRef.current;
    const containerElement = containerRef.current;

    const calculateAndSetDisplayMetrics = () => {
      if (
        !imgElement?.complete ||
        !containerElement ||
        imgElement.naturalWidth === 0 ||
        imgElement.naturalHeight === 0
      ) {
        return;
      }

      const { naturalWidth, naturalHeight } = imgElement;
      const { offsetWidth: containerWidth, offsetHeight: containerHeight } = containerElement;

      const baseFitScale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight, 1);

      const finalEffectiveScale = baseFitScale * zoomLevel;
      setScale(finalEffectiveScale);

      const newRenderedWidth = naturalWidth * finalEffectiveScale;
      const newRenderedHeight = naturalHeight * finalEffectiveScale;
      setRenderedImageSize({ width: newRenderedWidth, height: newRenderedHeight });

      // Preserve current pan when zooming (keyboard +/- or Q/E) by anchoring to container center.
      // For initial load or container resize, fall back to centering.
      let nextPaddingX: number;
      let nextPaddingY: number;
      const prevW = prevRenderedSizeRef.current.width;
      const prevH = prevRenderedSizeRef.current.height;

      const isZoomChange = zoomLevel !== prevZoomLevelRef.current && prevW > 0 && prevH > 0;

      if (isZoomChange) {
        const cX = containerWidth / 2;
        const cY = containerHeight / 2;
        const kx = newRenderedWidth / prevW;
        const ky = newRenderedHeight / prevH;

        // Keep the same image point at the container center
        nextPaddingX = cX - (cX - paddingRef.current.x) * kx;
        nextPaddingY = cY - (cY - paddingRef.current.y) * ky;

        // Clamp within bounds
        if (newRenderedWidth > containerWidth) {
          const minX = containerWidth - newRenderedWidth;
          const maxX = 0;
          nextPaddingX = Math.max(minX, Math.min(nextPaddingX, maxX));
        } else {
          nextPaddingX = (containerWidth - newRenderedWidth) / 2;
        }

        if (newRenderedHeight > containerHeight) {
          const minY = containerHeight - newRenderedHeight;
          const maxY = 0;
          nextPaddingY = Math.max(minY, Math.min(nextPaddingY, maxY));
        } else {
          nextPaddingY = (containerHeight - newRenderedHeight) / 2;
        }
      } else {
        // Center for initial load or non-zoom recalculations
        nextPaddingX = (containerWidth - newRenderedWidth) / 2;
        nextPaddingY = (containerHeight - newRenderedHeight) / 2;
      }

      setPadding({ x: nextPaddingX, y: nextPaddingY });

      if (onImageDisplayMetricsChange) {
        onImageDisplayMetricsChange({
          scale: finalEffectiveScale,
          paddingX: nextPaddingX,
          paddingY: nextPaddingY,
          scaledWidth: newRenderedWidth,
          scaledHeight: newRenderedHeight,
        });
      }

      // Update refs for next calculation
      prevRenderedSizeRef.current = { width: newRenderedWidth, height: newRenderedHeight };
      prevZoomLevelRef.current = zoomLevel;
    };

    calculateAndSetDisplayMetrics();

    let loadTimeoutId: number;
    const delayedCalculationOnLoad = () => {
      clearTimeout(loadTimeoutId);
      loadTimeoutId = window.setTimeout(calculateAndSetDisplayMetrics, 50);
    };

    window.addEventListener('resize', calculateAndSetDisplayMetrics);
    if (imgElement) {
      imgElement.addEventListener('load', delayedCalculationOnLoad);
    }

    return () => {
      window.removeEventListener('resize', calculateAndSetDisplayMetrics);
      if (imgElement) {
        imgElement.removeEventListener('load', delayedCalculationOnLoad);
      }
      clearTimeout(loadTimeoutId);
    };
  }, [imageUrl, onImageDisplayMetricsChange, zoomLevel]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // 检查是否是Item Search的图片拖拽
    const hasItemImage = e.dataTransfer.types.includes('application/json');
    const hasFiles = e.dataTransfer.types.includes('Files');

    // 如果是Item Search图片拖拽，总是允许
    // 如果是文件拖拽，需要检查权限
    if (hasItemImage || (hasFiles && canUpdateAsset && !isAiReviewing && !isUpdatingAsset)) {
      setIsDraggingOver(true);
      // 暂时禁用叠加层交互以避免拖拽冲突
      setSelectedOverlayId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // 检查拖拽类型并设置拖拽效果
    const hasItemImage = e.dataTransfer.types.includes('application/json');
    if (hasItemImage) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // 只有当真正离开容器时才设置为false，避免在子元素间移动时的状态跳动
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleItemImageDrop = useCallback(
    (dragData: DragData, dropPosition: { x: number; y: number }) => {
      console.log('🎯 接收到Item Search拖拽的图片:', dragData);
      console.log('📍 Drop position:', dropPosition);
      console.log('🎨 当前叠加层状态:', {
        overlayImagesCount: overlayImages.length,
        selectedOverlayId,
        renderedImageSize,
        scale,
        padding,
      });

      // 调用叠加层组件添加图片
      if (imageOverlayCanvasRef.current) {
        console.log('🔧 调用叠加层组件添加真实参考图片...');
        console.log('📄 拖拽数据:', dragData);

        // 确保必需字段存在
        if (dragData.s3Path && dragData.filename) {
          const overlayDragData = {
            s3Path: dragData.s3Path,
            filename: dragData.filename,
            assetUrl: dragData.assetUrl,
            type: dragData.type,
          };
          imageOverlayCanvasRef.current.addOverlayImage(overlayDragData, dropPosition);
          console.log('📞 已调用addOverlayImage方法，开始加载真实图片...');
        } else {
          console.error('❌ 拖拽数据缺少必需字段:', { s3Path: dragData.s3Path, filename: dragData.filename });
        }
      } else {
        console.error('❌ 叠加层组件引用不可用');
      }
    },
    [overlayImages.length, selectedOverlayId, renderedImageSize, scale, padding],
  );

  const calculateDropPosition = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    const imgRect = imgRef.current?.getBoundingClientRect();

    if (!containerRect || !imgRect) {
      return null;
    }

    const dropX = e.clientX - imgRect.left;
    const dropY = e.clientY - imgRect.top;

    // 转换为相对于图片的比例坐标 (0-1)
    const relativeX = dropX / imgRect.width;
    const relativeY = dropY / imgRect.height;

    console.log('📍 拖拽位置:', { dropX, dropY, relativeX, relativeY });
    return { x: relativeX, y: relativeY };
  }, []);

  const handleFileDrop = useCallback(
    (files: FileList) => {
      if (!canUpdateAsset || isAiReviewing || isUpdatingAsset || !onAssetFileUpdate) {
        return;
      }

      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          void onAssetFileUpdate(file);
        }
      }
    },
    [canUpdateAsset, isAiReviewing, isUpdatingAsset, onAssetFileUpdate],
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    // 首先检查是否是从Item Search拖拽的图片
    const itemImageData = e.dataTransfer.getData('application/json');
    if (itemImageData) {
      try {
        const dragData = JSON.parse(itemImageData) as DragData;
        if (dragData && typeof dragData === 'object' && dragData.type === 'item-search-image') {
          const dropPosition = calculateDropPosition(e);
          if (dropPosition) {
            handleItemImageDrop(dragData, dropPosition);
          }
          return;
        }
      } catch (error) {
        console.error('解析拖拽数据失败:', error);
      }
    }

    // 如果不是Item Search的图片，则处理文件拖拽（现有逻辑）
    const files = e.dataTransfer.files;
    if (files) {
      handleFileDrop(files);
    }
  };

  const handleFileSelectChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onAssetFileUpdate && canUpdateAsset && !isAiReviewing && !isUpdatingAsset) {
      void onAssetFileUpdate(files[0]);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const triggerFileInput = () => {
    if (canUpdateAsset && !isAiReviewing && !isUpdatingAsset) {
      fileInputRef.current?.click();
    }
  };

  // Keyboard shortcuts for zoom: '=' or '+' to zoom in, '-' to zoom out, '0' to reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isEditable) {
        return;
      }
      if (e.key === '=' || e.key === '+' || e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setZoomLevel((prev) => Math.min(prev + 0.2, 5));
      } else if (e.key === '-' || e.key === '_' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setZoomLevel((prev) => Math.max(prev - 0.2, 0.2));
      } else if (e.key === '0' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setZoomLevel(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePDFPreview = () => {
    setIsGeneratingPDF(true);
    setIsPDFPreviewOpen(true);
  };

  // Check if there are valid annotations for PDF generation
  const hasValidAnnotations = annotations.some(
    (ann) => ann.rect !== undefined && (ann.type === 'annotation' || ann.type === 'ai-annotation'),
  );

  const getCursorClassForImage = (): string => {
    if (isPanning) {
      return 'cursor-grabbing';
    }
    if (currentTool === 'cursor' && isCurrentlyPannable) {
      return 'cursor-grab';
    }
    return TOOL_CURSOR_CLASSES[currentTool] || 'cursor-default';
  };

  return (
    <div
      className={twMerge(
        'relative w-full h-full flex flex-col',
        isDraggingOver && 'border-2 border-dashed border-primary-500 bg-primary-500/10',
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelectChange}
        style={{ display: 'none' }}
        accept="image/*"
        disabled={isUpdatingAsset || !canUpdateAsset || isAiReviewing}
      />

      {((history && history.length > 0) || canUpdateAsset) && (
        <div className="absolute z-20 top-0 right-0 group">
          {/* 扩大的hover区域 */}
          <div className="w-48 h-32 absolute top-0 right-0" />

          {/* 按钮容器 */}
          <div className="flex flex-col items-end space-y-2 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {history && history.length > 0 && (
              <Select
                value={String(selectedVersion)}
                onValueChange={(value) => onVersionChange(Number(value))}
                disabled={isUpdatingAsset}
              >
                <SelectTrigger className="w-[160px] h-9 bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <LuHistory className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">v{selectedVersion}</span>
                  </div>
                </SelectTrigger>
                <SelectContent
                  align="end"
                  className="w-[320px] max-h-[400px] p-0 border-0 shadow-2xl rounded-xl bg-white/95 backdrop-blur-md"
                >
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">バージョン履歴</h3>
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {version}件
                      </Badge>
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    {/* Current version */}
                    <SelectItem value={String(version)} className="p-0 focus:bg-transparent">
                      <div className="w-full p-3 rounded-lg hover:bg-blue-50/80 transition-colors duration-150 cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-blue-600">v{version}</span>
                            <Badge variant="default" className="text-xs bg-blue-100 text-blue-700 border-0 px-2 py-0.5">
                              現在
                            </Badge>
                          </div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        </div>
                        <p className="text-xs text-gray-500">最新バージョン</p>
                      </div>
                    </SelectItem>

                    {/* Previous versions */}
                    {Array.from({ length: version - 1 }, (_, i) => {
                      const versionNumber = version - 1 - i;
                      const versionInfo = getVersionInfo(versionNumber, history, version);

                      return (
                        <SelectItem
                          key={versionNumber}
                          value={String(versionNumber)}
                          className="p-0 focus:bg-transparent"
                        >
                          <div className="w-full p-3 rounded-lg hover:bg-gray-50/80 transition-colors duration-150 cursor-pointer">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">v{versionNumber}</span>
                              {versionInfo?.created_at && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <LuClock className="w-3 h-3" />
                                  <span>{getRelativeTime(versionInfo.created_at)}</span>
                                </div>
                              )}
                            </div>

                            <div className="space-y-1">
                              {versionInfo?.author && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <LuUser className="w-3 h-3 text-gray-400" />
                                  <span className="font-medium">{truncateAuthor(versionInfo.author)}</span>
                                </div>
                              )}

                              {versionInfo?.description && (
                                <div className="flex items-start gap-1.5 text-xs text-gray-600">
                                  <LuFileText className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <p className="line-clamp-2 leading-relaxed">{versionInfo.description}</p>
                                </div>
                              )}

                              {!versionInfo?.author && !versionInfo?.description && !versionInfo?.created_at && (
                                <p className="text-xs text-gray-400 italic">詳細情報なし</p>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </div>
                </SelectContent>
              </Select>
            )}

            {canUpdateAsset && (
              <Button
                variant="outline"
                size="sm"
                onClick={triggerFileInput}
                disabled={!canUpdateAsset || !!isAiReviewing || !!isUpdatingAsset}
                className="h-9 w-[160px] bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg"
                aria-label="Update Asset"
              >
                <LuUpload className="mr-2 w-4 h-4" />
                <span className="text-sm font-medium">素材を更新</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onRequestOpenCommentInput}
              className="h-9 w-[160px] bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg"
              aria-label="Add Comment"
            >
              <span className="text-sm font-medium">コメント追加</span>
            </Button>

            {/* PDF Preview Button */}
            {hasValidAnnotations && (
              <Button
                onClick={handlePDFPreview}
                disabled={isGeneratingPDF}
                variant="outline"
                size="sm"
                className="h-9 w-[160px] bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg"
              >
                <FileText className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">レポート作成</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Always-visible zoom controls (left side with slider) */}
      <div className="absolute z-30 left-3 top-1/2 -translate-y-1/2">
        <div className="flex items-center gap-1.5 backdrop-blur-sm shadow-sm rounded-md p-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-1.5" aria-label="Zoom controls">
                  <div className="h-32 flex items-center">
                    <Slider
                      orientation="vertical"
                      min={0.2}
                      max={5}
                      step={0.05}
                      value={[zoomLevel]}
                      onValueChange={(vals) => {
                        const next = Array.isArray(vals) ? vals[0] : zoomLevel;
                        setZoomLevel(Math.max(0.2, Math.min(5, next)));
                      }}
                      disabled={!!isUpdatingAsset}
                      className="h-32 scale-90"
                      aria-label="Zoom level"
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="space-y-1">
                  <div className="font-medium">ズーム</div>
                  <div className="text-xs text-muted-foreground">スライダーまたはキーボードショートカットを使用:</div>
                  <ul className="text-xs list-disc list-inside space-y-0.5">
                    <li>Q または + / = で拡大</li>
                    <li>E または - で縮小</li>
                    <li>W または 0 でリセット</li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div
        ref={containerRef}
        className={twMerge(
          'relative flex-1 w-full h-full overflow-hidden text-left img-container bg-muted/20',
          currentTool === 'search' && 'ring-2 ring-blue-300 ring-opacity-50',
          isDraggingOver && 'ring-4 ring-blue-400 bg-blue-50/30',
        )}
        onMouseDown={handleAnnotationStart}
        onMouseUp={handleAnnotationEnd}
        onMouseMove={handleAnnotationMove}
        onMouseLeave={isPanning ? handleAnnotationEnd : undefined}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUpdatingAsset && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/50">
            <LuUpload className="size-8 animate-ping text-primary-500" />
          </div>
        )}

        {/* 搜索模式指示器 */}
        {currentTool === 'search' && !searchRect && !currentRect && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <LuSearch className="w-4 h-4" />
              <span className="text-sm font-medium">検索したい範囲をドラッグして選択してください</span>
            </div>
          </div>
        )}

        {/* 拖拽图片到画布的提示 */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-30 bg-blue-500/10 border-4 border-blue-400 border-dashed rounded-lg flex items-center justify-center">
            <div className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg">
              <div className="flex items-center gap-3">
                <Move className="w-6 h-6" />
                <div>
                  <div className="text-lg font-medium">画像を配置</div>
                  <div className="text-sm opacity-90">ここに離して画像を追加します</div>
                </div>
              </div>
            </div>
          </div>
        )}
        <img
          ref={imgRef}
          src={imageUrl}
          alt={imageAlt}
          className={twMerge('select-none absolute', getCursorClassForImage())}
          style={{
            width: renderedImageSize.width > 0 ? `${renderedImageSize.width}px` : 'auto',
            height: renderedImageSize.height > 0 ? `${renderedImageSize.height}px` : 'auto',
            left: `${padding.x}px`,
            top: `${padding.y}px`,
            maxWidth: 'none',
            maxHeight: 'none',
          }}
          draggable="false"
        />

        {/* Image Overlay Canvas Layer for dragged images */}
        {renderedImageSize.width > 0 && renderedImageSize.height > 0 ? (
          <ImageOverlayCanvas
            key={`image-overlay-canvas-${subtaskId}`}
            ref={imageOverlayCanvasRef}
            imageUrl={imageUrl}
            width={renderedImageSize.width / scale}
            height={renderedImageSize.height / scale}
            scale={scale}
            paddingX={padding.x}
            paddingY={padding.y}
            overlayImages={overlayImages}
            onOverlayImagesChange={setOverlayImages}
            selectedOverlayId={selectedOverlayId}
            onOverlaySelect={setSelectedOverlayId}
            isInteractive={!isDraggingOver} // 除了拖拽时，始终允许交互用于对比调整
            currentTool={currentTool} // 传递当前工具状态
          />
        ) : (
          <div className="absolute top-4 left-4 bg-yellow-100 text-yellow-800 p-2 rounded text-xs">
            等待图片尺寸计算... ({renderedImageSize.width}×{renderedImageSize.height})
          </div>
        )}

        {/* Drawing Canvas Layer for handwritten annotations */}
        {currentTool !== 'search' && (isDrawingMode || drawingData || unsavedDrawingData) && (
          <DrawingCanvas
            key={`drawing-canvas-${subtaskId}`} // 确保每个subtask有独立的canvas实例
            ref={drawingCanvasRef}
            imageUrl={imageUrl}
            width={renderedImageSize.width > 0 ? renderedImageSize.width / scale : 800}
            height={renderedImageSize.height > 0 ? renderedImageSize.height / scale : 600}
            scale={scale}
            paddingX={padding.x}
            paddingY={padding.y}
            isActive={currentTool === 'pen'}
            currentTool={currentTool === 'pen' ? 'pen' : 'none'}
            currentColor={currentColor}
            brushSize={brushSize}
            onDrawingChange={(data) => {
              setUnsavedDrawingData(data);
              setDrawingData(data);
            }}
            initialDrawingData={unsavedDrawingData || drawingData || undefined}
            opacity={0.8}
            showControls={false}
            onDelete={() => {
              // Clear drawing from backend
              if (subtaskId) {
                clearDrawing();
                setDrawingData('');
              }
            }}
          />
        )}

        <>
          {currentTool !== 'search' && currentTool !== 'pen' && (
            <AnnotationLayer
              id="current-drawing"
              scale={1}
              offset={{ x: 0, y: 0 }}
              text={currentText}
              rect={currentRect}
              color={currentColor}
              tool={(() => {
                const tool = currentTool as string;
                if (tool === 'search') {
                  return 'rect';
                }
                if (tool === 'color-picker') {
                  return 'cursor';
                }
                return currentTool as 'cursor' | 'rect' | 'circle' | 'arrow' | 'text' | 'pen';
              })()}
              timestamp={new Date().toISOString()}
            />
          )}
          <AnnotationInput
            scale={scale}
            padding={padding}
            onAnnotationCreate={onAnnotationCreate}
            containerRef={containerRef}
            isSubmitting={isSubmitting}
            onSearchRequest={(rect) => {
              if (onSearchResults) {
                // 只执行搜索，不设置为可拖动的搜索框
                // 保持原有的注释框不变
                void performSearch(rect);
              }
            }}
            onSwitchToSearchPanel={onSwitchToSearchPanel}
          />
          {currentTool !== 'search' &&
            currentTool !== 'pen' &&
            annotations
              .filter((item) => item.type === 'annotation' || item.type === 'ai-annotation')
              .map(
                ({ id, text, rect, color, tool, timestamp, solved, attachment_image_url: attachmentImageUrl }, i) => (
                  <AnnotationLayer
                    key={id}
                    order={i + 1}
                    scale={scale}
                    offset={padding}
                    id={id}
                    text={text}
                    rect={rect}
                    color={color}
                    tool={tool}
                    timestamp={timestamp}
                    solved={solved}
                    attachment_image_url={attachmentImageUrl}
                    // 编辑功能props
                    isEditable={!!subtaskId && !!updateAnnotation}
                    isEditing={editableAnnotation.isEditing(id)}
                    currentRect={editableAnnotation.getCurrentRect(id)}
                    isDirty={editableAnnotation.isDirty(id)}
                    saveStatus={editableAnnotation.getSaveStatus(id)}
                    onStartEditing={editableAnnotation.startEditing}
                    onUpdateWhileEditing={editableAnnotation.updateWhileEditing}
                    onFinishEditing={(annotationId) => {
                      void editableAnnotation.finishEditing(annotationId);
                    }}
                    onCancelEditing={editableAnnotation.cancelEditing}
                  />
                ),
              )}
        </>

        {/* 可拖动可变形的搜索矩形 */}
        {searchRect && currentTool === 'search' && (
          <DraggableSearchRect
            rect={searchRect}
            onRectChange={(newRect) => {
              setSearchRect(newRect);
            }}
            onRectChangeComplete={(newRect) => {
              void performSearch(newRect);
            }}
            padding={padding}
            renderedImageSize={renderedImageSize}
          />
        )}

        {/* 当前绘制的矩形 */}
        {currentRect && currentTool === 'search' && (
          <div
            className="absolute border-2 border-dashed border-blue-500 bg-blue-100/40 pointer-events-none shadow-lg animate-pulse"
            style={{
              left: `${currentRect.x}px`,
              top: `${currentRect.y}px`,
              width: `${currentRect.width}px`,
              height: `${currentRect.height}px`,
            }}
          />
        )}
      </div>

      {/* Drawing Controls - Bottom Left Corner */}
      {currentTool !== 'search' && isDrawingMode && (
        <div className="absolute bottom-4 left-4 flex gap-2 z-20">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (drawingCanvasRef.current) {
                drawingCanvasRef.current.undoLastDrawing();
              }
            }}
            className="bg-white/90 hover:bg-white shadow-md"
          >
            <LuUndo className="w-4 h-4 mr-1" />
            元に戻す
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (drawingCanvasRef.current) {
                drawingCanvasRef.current.clearDrawings();
                setUnsavedDrawingData('');
              }
            }}
            className="bg-white/90 hover:bg-white shadow-md"
          >
            <LuTrash2 className="w-4 h-4 mr-1" />
            クリア
          </Button>
          <Button
            size="sm"
            variant={unsavedDrawingData && unsavedDrawingData !== drawingData ? 'default' : 'secondary'}
            onClick={() => {
              if (subtaskId && unsavedDrawingData) {
                saveDrawing(unsavedDrawingData);
              }
            }}
            disabled={!unsavedDrawingData || unsavedDrawingData === drawingData || isSaving}
            className={
              unsavedDrawingData && unsavedDrawingData !== drawingData
                ? 'bg-green-500/90 hover:bg-green-500 shadow-md animate-pulse'
                : 'bg-white/90 hover:bg-white shadow-md'
            }
          >
            <LuSave className="w-4 h-4 mr-1" />
            {unsavedDrawingData && unsavedDrawingData !== drawingData ? '保存*' : '保存'}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (subtaskId) {
                clearDrawing();
                setDrawingData('');
                setUnsavedDrawingData('');
                if (drawingCanvasRef.current) {
                  drawingCanvasRef.current.clearDrawings();
                }
              }
            }}
            className="bg-red-500/90 hover:bg-red-500 shadow-md"
          >
            <LuTrash2 className="w-4 h-4 mr-1" />
            完全削除
          </Button>
        </div>
      )}

      {/* Unified PDF Preview Modal */}
      <UnifiedPDFPreviewModal
        isOpen={isPDFPreviewOpen}
        onClose={() => {
          setIsPDFPreviewOpen(false);
          setIsGeneratingPDF(false);
        }}
        mediaUrl={imageUrl}
        mediaType="image"
        annotations={annotations}
        subtaskName="画像レビュー"
        onGenerationStart={() => setIsGeneratingPDF(true)}
        onGenerationComplete={() => setIsGeneratingPDF(false)}
      />
    </div>
  );
}
