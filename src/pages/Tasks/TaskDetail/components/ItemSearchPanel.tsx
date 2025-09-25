import { useQuery } from '@tanstack/react-query';
import { Crop, Download, ExternalLink, ImageIcon, Move, Package, Plus, Search, X, ZoomIn, ZoomOut } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LuLoader } from 'react-icons/lu';

import { type ItemSearchResult as ApiItemSearchResult, searchItemsByImage } from '@/api/itemsService';
import type { components } from '@/api/schemas';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { LazyImage } from '@/components/ui/LazyImage';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAsset } from '@/hooks/useAsset';

import { useItemDetection } from '../hooks/useItemDetection';
import { type SearchContext, useFrameAnnotation } from '../Subtask/FrameAnnotation/useFrameAnnotation';

// 直接使用API返回的类型
type ItemSearchResult = ApiItemSearchResult;
type SubtaskOut = components['schemas']['SubtaskOut'];

// 提取 Pokémon ID 并生成图鉴 URL 的函数
function getPokemonZukanUrl(filename: string): string | null {
  // 匹配文件名开头的数字格式，支持以下格式：
  // "0706-1_ヌメルゴン.png" -> "0706-1"
  // "0023_XXX.png" -> "0023"
  // "834_XXX.png" -> "834"
  const regex = /^(\d+(?:-\d+)?)_/;
  const match = regex.exec(filename);
  if (match) {
    const pokemonId = match[1];
    return `https://zukan.pokemon.co.jp/detail/${pokemonId}`;
  }
  return null;
}

interface CropInfo {
  x: number; // 相对于原图的x坐标 (0-1)
  y: number; // 相对于原图的y坐标 (0-1)
  width: number; // 相对于原图的宽度 (0-1)
  height: number; // 相对于原图的高度 (0-1)
}

interface ItemSearchPanelProps {
  projectId: string;
  subtaskId: string;
  subtaskImageUrl?: string | null;
  subtasks?: SubtaskOut[]; // 添加subtasks参数以便从中加载保存的角色选择
  isLoading?: boolean;
  externalSearchResults?: ItemSearchResult[];
  externalCropInfo?: CropInfo | null;
  onExternalCropReset?: () => void;
  searchContext?: SearchContext;
  onBoundingBoxSelect?: (bbox: [number, number, number, number] | null, label?: string) => void; // 边界框选择回调
  taskId?: string; // 添加taskId用于缓存失效
}

interface SearchResultsProps {
  isLoading: boolean;
  isError: boolean;
  searchResults: ItemSearchResult[];
  totalResults: number;
  searchContext?: SearchContext;
}

interface ImagePopupProps {
  id: string;
  s3Path: string;
  filename: string;
  imageIndex: number;
  totalImages: number;
  similarityScore?: number;
  searchContext?: SearchContext;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
}

interface CroppedImagePreviewProps {
  imageUrl: string;
  cropInfo: CropInfo;
  className?: string;
  alt?: string;
}

function CroppedImagePreview({ imageUrl, cropInfo, className = '', alt = '裁剪预览' }: CroppedImagePreviewProps) {
  console.log('[CroppedImagePreview] Rendering with:', { imageUrl, cropInfo, className });

  // 最简单的实现：显示一个带有裁剪区域指示的小图标
  // 在小尺寸预览中，显示实际裁剪内容可能不够清晰，所以我们显示一个指示器
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-primary/10 to-primary/20 ${className} flex items-center justify-center`}
    >
      {/* 背景图片，模糊显示 */}
      <img src={imageUrl} alt={alt} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-[1px]" />

      {/* 裁剪指示器 */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <Crop className="w-3 h-3 text-primary mb-0.5" />
        <div className="text-[8px] text-primary font-medium leading-none">
          {Math.round(cropInfo.width * 100)}×{Math.round(cropInfo.height * 100)}%
        </div>
      </div>

      {/* 裁剪区域的小预览框 */}
      <div
        className="absolute border border-primary/60 bg-primary/10"
        style={{
          left: `${cropInfo.x * 100}%`,
          top: `${cropInfo.y * 100}%`,
          width: `${cropInfo.width * 100}%`,
          height: `${cropInfo.height * 100}%`,
        }}
      />
    </div>
  );
}

function ImagePopup({
  id,
  s3Path,
  filename,
  imageIndex,
  similarityScore,
  searchContext,
  isExpanded,
  onToggleExpand,
}: ImagePopupProps) {
  const [forceRefresh, setForceRefresh] = useState(0);
  const { assetUrl, isAssetLoading } = useAsset(s3Path, {
    forceRefresh,
    disableCache: true,
  });
  const [imageError, setImageError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panMovedRef = useRef<boolean>(false);
  const wrapperRef = useRef<HTMLButtonElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 获取 addReferenceImage 和 createAnnotationWithReference 函数
  const addReferenceImage = useFrameAnnotation((state) => state.addReferenceImage);
  const createAnnotationWithReference = useFrameAnnotation((state) => state.createAnnotationWithReference);

  // 获取 Pokémon 图鉴 URL
  const pokemonZukanUrl = useMemo(() => getPokemonZukanUrl(filename), [filename]);

  const cacheBustedAssetUrl = useMemo(() => {
    if (typeof assetUrl !== 'string' || !assetUrl) {
      return assetUrl;
    }
    try {
      const url = new URL(assetUrl);
      url.searchParams.set('_cachebust', `${Date.now()}_${forceRefresh}`);
      return url.toString();
    } catch (e) {
      console.error('Failed to parse asset URL for cache busting:', assetUrl, e);
      return assetUrl;
    }
  }, [assetUrl, forceRefresh]);

  const fallbackUrl = useMemo(() => {
    if (!s3Path) {
      return '';
    }
    try {
      const url = new URL(`https://ai-mage-supervision.s3.amazonaws.com/${s3Path}`);
      url.searchParams.set('_cachebust', `${Date.now()}_${forceRefresh}`);
      return url.toString();
    } catch (e) {
      console.error('Failed to create fallback URL:', s3Path, e);
      return `https://ai-mage-supervision.s3.amazonaws.com/${s3Path}`;
    }
  }, [s3Path, forceRefresh]);

  useEffect(() => {
    // console.log(`[ImagePopup] Triggering force refresh for ${filename}`);
    setForceRefresh((prev) => prev + 1);
    setImageError(false);
  }, [s3Path, similarityScore, filename]);

  const displayUrl = cacheBustedAssetUrl || fallbackUrl;

  const handleClick = (e: React.MouseEvent) => {
    if (panMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      panMovedRef.current = false;
      return;
    }
    if (onToggleExpand) {
      onToggleExpand(id);
    }
  };

  useEffect(() => {
    if (!isExpanded) {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      setIsPanning(false);
      panStartRef.current = null;
    }
  }, [isExpanded]);

  useEffect(() => {
    if (isExpanded) {
      wrapperRef.current?.focus();
    }
  }, [isExpanded]);

  const clampZoom = (z: number) => Math.max(0.5, Math.min(5, z));
  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    if (!isExpanded) {
      return;
    }
    e.preventDefault();
    const delta = -e.deltaY;
    const next = clampZoom(zoomLevel + (delta > 0 ? 0.1 : -0.1));
    setZoomLevel(Number(next.toFixed(2)));
  };
  const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!isExpanded) {
      return;
    }
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    panMovedRef.current = false;
  };
  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!isExpanded || !isPanning) {
      return;
    }
    e.preventDefault();
    const start = panStartRef.current;
    if (!start) {
      return;
    }
    const next = { x: e.clientX - start.x, y: e.clientY - start.y };
    if (!panMovedRef.current) {
      if (Math.abs(next.x - panOffset.x) > 2 || Math.abs(next.y - panOffset.y) > 2) {
        panMovedRef.current = true;
      }
    }
    setPanOffset(next);
  };
  const endPan = () => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
    }
  };
  const resetView = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };
  const zoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((z) => clampZoom(Number((z + 0.2).toFixed(2))));
  };
  const zoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((z) => clampZoom(Number((z - 0.2).toFixed(2))));
  };
  const handleKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (e) => {
    if (!isExpanded) {
      return;
    }
    const key = e.key;
    if (key === '=' || key === '+') {
      e.preventDefault();
      e.stopPropagation();
      setZoomLevel((z) => clampZoom(Number((z + 0.2).toFixed(2))));
    } else if (key === '-' || key === '_') {
      e.preventDefault();
      e.stopPropagation();
      setZoomLevel((z) => clampZoom(Number((z - 0.2).toFixed(2))));
    } else if (key === '0') {
      e.preventDefault();
      e.stopPropagation();
      resetView();
    }
  };

  // 拖拽事件处理函数
  const handleDragStart = (e: React.DragEvent) => {
    console.log('🚀 拖拽开始:', { filename, s3Path });
    setIsDragging(true);

    // 设置拖拽数据
    const dragData = {
      type: 'item-search-image',
      id,
      s3Path,
      filename,
      assetUrl: displayUrl,
      similarityScore,
    };

    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';

    // 设置拖拽图像预览 - 使用安全的方法避免Canvas污染错误
    if (e.currentTarget instanceof HTMLElement) {
      const dragImage = e.currentTarget.querySelector('img');
      if (dragImage instanceof HTMLImageElement && dragImage.complete) {
        try {
          // 创建一个临时的预览元素避免Canvas污染问题
          const previewElement = document.createElement('div');
          previewElement.style.width = '100px';
          previewElement.style.height = '100px';
          previewElement.style.background = `url(${dragImage.src}) center/cover`;
          previewElement.style.border = '2px solid #3b82f6';
          previewElement.style.borderRadius = '8px';
          previewElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          previewElement.style.position = 'absolute';
          previewElement.style.top = '-1000px'; // 隐藏在屏幕外

          document.body.appendChild(previewElement);
          e.dataTransfer.setDragImage(previewElement, 50, 50);

          // 清理临时元素
          setTimeout(() => {
            if (previewElement.parentNode) {
              previewElement.parentNode.removeChild(previewElement);
            }
          }, 0);
        } catch (error) {
          console.warn('Could not set custom drag image, using default:', error);
          // 如果自定义预览失败，尝试使用原图
          try {
            e.dataTransfer.setDragImage(dragImage, 50, 50);
          } catch (fallbackError) {
            console.warn('Could not set any drag image:', fallbackError);
          }
        }
      }
    }
  };

  const handleDragEnd = () => {
    console.log('🏁 拖拽结束:', filename);
    setIsDragging(false);
  };

  if (isAssetLoading) {
    return (
      <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
        <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary/30 rounded-full border-t-primary animate-spin" />
        </div>
      </Card>
    );
  }

  if (!displayUrl || imageError) {
    return (
      <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
        <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center p-4">
          <ImageIcon className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-xs text-gray-600 text-center font-medium mb-2">画像を読み込めませんでした</p>
          <p className="text-[10px] text-gray-500 text-center truncate w-full mb-3" title={filename}>
            {filename}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setImageError(false);
              setForceRefresh((prev) => prev + 1);
            }}
            className="text-xs h-7 px-3"
          >
            再読み込み
          </Button>
        </div>
      </Card>
    );
  }

  // Compute container cursor class without nested ternary in JSX
  let containerCursorClass = '';
  if (isExpanded) {
    containerCursorClass = isPanning ? 'cursor-grabbing' : 'cursor-grab';
  }

  return (
    <Card
      className={`overflow-hidden group hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 ${
        isDragging ? 'opacity-60 ring-2 ring-blue-400' : ''
      }`}
      draggable={!isExpanded} // 只在未展开状态下允许拖拽
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <button
        className="relative w-full block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        ref={wrapperRef}
      >
        <div
          className={`aspect-square relative overflow-hidden bg-gray-100 rounded-t-lg ${containerCursorClass}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={endPan}
          onMouseLeave={endPan}
        >
          {isExpanded ? (
            <img
              src={displayUrl}
              alt={`検索結果 ${filename}`}
              className="absolute top-1/2 left-1/2 max-w-none select-none"
              style={{
                transform: `translate(calc(-50% + ${panOffset.x}px), calc(-50% + ${panOffset.y}px)) scale(${zoomLevel})`,
                transition: isPanning ? 'none' : 'transform 120ms ease-out',
              }}
              draggable={false}
              onError={() => {
                // console.error(`[ImagePopup] Failed to load image: ${filename}`, {
                //   displayUrl,
                //   assetUrl,
                //   fallbackUrl,
                //   s3Path,
                // });
                setImageError(true);
              }}
            />
          ) : (
            <LazyImage
              src={displayUrl}
              alt={`検索結果 ${filename}`}
              className="w-full h-full"
              imageClassName="object-contain"
              onError={() => {
                // console.error(`[ImagePopup] Failed to load image: ${filename}`, {
                //   displayUrl,
                //   assetUrl,
                //   fallbackUrl,
                //   s3Path,
                // });
                setImageError(true);
              }}
              onLoad={() => {
                // console.log(`[ImagePopup] Successfully loaded image: ${filename}`, {
                //   displayUrl,
                //   wasUsingFallback: !assetUrl,
                // });
              }}
            />
          )}

          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Zoom icon */}
          {!isExpanded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
                <ZoomIn className="w-6 h-6 text-white drop-shadow-lg" />
              </div>
            </div>
          )}

          {/* Drag hint icon */}
          {!isExpanded && !isDragging && (
            <div className="absolute top-2 right-2">
              <div className="bg-blue-500/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <Move className="w-3 h-3 text-white" />
              </div>
            </div>
          )}

          {/* Dragging indicator */}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-500/20 border-2 border-blue-400 border-dashed rounded-lg flex items-center justify-center">
              <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                画布にドラッグ中...
              </div>
            </div>
          )}

          {/* Image number badge */}
          <div className="absolute top-1 left-1">
            <Badge
              variant="secondary"
              className="bg-black/70 text-white border-0 text-[10px] font-medium backdrop-blur-sm px-1 py-0.5 min-w-[1.25rem] text-center leading-none"
            >
              {imageIndex + 1}
            </Badge>
          </div>

          {/* Similarity score badge */}
          {Boolean(similarityScore) && (
            <div className="absolute top-1 right-1">
              <Badge
                variant="default"
                className="bg-black/90 text-white border-0 text-xs font-bold backdrop-blur-sm shadow-lg px-1.5 py-0.5 min-w-[2.5rem] text-center"
              >
                {Math.round(similarityScore! * 100)}%
              </Badge>
            </div>
          )}

          {/* Expanded view controls */}
          {isExpanded && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 text-white rounded-md p-1.5 backdrop-blur-sm">
              <button onClick={zoomOut} className="p-1 rounded hover:bg-white/10" title="縮小">
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="px-2 text-xs tabular-nums min-w-[3rem] text-center">{Math.round(zoomLevel * 100)}%</div>
              <button onClick={zoomIn} className="p-1 rounded hover:bg-white/10" title="拡大">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={resetView}
                className="ml-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs"
                title="リセット"
              >
                リセット
              </button>
            </div>
          )}

          {/* Pokemon Zukan button */}
          {pokemonZukanUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(pokemonZukanUrl, '_blank', 'noopener,noreferrer');
              }}
              className="absolute bottom-1 left-1 bg-black/70 hover:bg-black/90 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 backdrop-blur-sm"
              title="ポケモン図鑑で確認"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}

          {/* Context-aware action button */}
          {searchContext && (
            <button
              onClick={(e) => {
                e.stopPropagation();

                if (searchContext.source === 'annotation') {
                  // 注释搜索模式：添加到现有注释
                  addReferenceImage({
                    s3Path,
                    filename,
                  });
                } else if (searchContext.source === 'tool') {
                  // 工具搜索模式：基于此创建注释
                  createAnnotationWithReference({
                    s3Path,
                    filename,
                  });
                }
              }}
              className="absolute top-1 right-1 bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 backdrop-blur-sm"
              title={searchContext.source === 'annotation' ? '注釈に追加' : 'この内容で注釈を作成'}
            >
              <Plus className="w-3 h-3" />
            </button>
          )}

          {/* Download button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const link = document.createElement('a');
              link.href = displayUrl;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="absolute bottom-1 right-1 bg-black/70 hover:bg-black/90 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 backdrop-blur-sm"
            title="ダウンロード"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>

        {/* Character name display - always visible */}
        <div className="px-2 py-1.5 bg-card border-t border-border/20 rounded-b-lg">
          <p className="text-xs font-medium text-foreground text-center truncate leading-tight" title={filename}>
            {filename.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '')}
          </p>
        </div>
      </button>
    </Card>
  );
}

function SearchResults({
  isLoading,
  isError,
  searchResults,
  totalResults,
  searchContext,
  expandedItemId,
  onToggleExpand,
}: SearchResultsProps & { expandedItemId?: string | null; onToggleExpand?: (id: string) => void }) {
  if (isLoading) {
    return null; // 不显示内部加载状态，让外部的搜索提示显示
  }

  if (isError) {
    return (
      <div className="py-8 text-center">
        <ImageIcon className="w-10 h-10 mx-auto mb-3 text-destructive" />
        <h3 className="text-base font-semibold text-destructive mb-1">検索に失敗しました</h3>
        <p className="text-xs text-muted-foreground">ネットワーク接続を確認してください</p>
      </div>
    );
  }

  if (!searchResults || searchResults.length === 0) {
    return (
      <div className="py-8 text-center">
        <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <h3 className="text-base font-semibold text-foreground mb-1">検索結果なし</h3>
        <p className="text-xs text-muted-foreground">類似画像が見つかりませんでした</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 lg:gap-2">
      {searchResults.map((item, index) => {
        const isExpanded = expandedItemId === item.id;
        return (
          <div key={item.id} className={`${isExpanded ? 'col-span-3 row-span-3' : ''}`}>
            <ImagePopup
              id={item.id}
              s3Path={item.s3_path}
              filename={item.filename}
              imageIndex={index}
              totalImages={totalResults}
              similarityScore={item.similarity_score}
              searchContext={searchContext}
              isExpanded={isExpanded}
              onToggleExpand={onToggleExpand}
            />
          </div>
        );
      })}
    </div>
  );
}

function ItemDetectionSection({
  detectedLabels,
  isDetecting,
  detectionError,
  hasDetectionData,
  onLabelClick,
  selectedLabel,
}: {
  detectedLabels: string[];
  isDetecting: boolean;
  detectionError: string | Error | null;
  hasDetectionData: boolean;
  onLabelClick: (label: string) => void;
  selectedLabel: string | null;
}) {
  if (isDetecting) {
    return (
      <div className="flex items-center justify-center py-4 text-center">
        <div className="space-y-2">
          <LuLoader className="w-6 h-6 mx-auto animate-spin text-orange-500" />
          <div>
            <p className="text-sm font-medium text-gray-700">物品検出中...</p>
            <p className="text-xs text-gray-500">画像内の物品を識別しています</p>
          </div>
        </div>
      </div>
    );
  }

  if (detectionError) {
    return (
      <div className="text-center py-2">
        <div className="flex items-center justify-center mb-1">
          <Package className="w-4 h-4 text-red-400 mr-1" />
          <p className="text-xs text-red-600">物品検出に失敗しました</p>
        </div>
        <p className="text-xs text-gray-500">
          {typeof detectionError === 'string' ? detectionError : '検出エラーが発生しました'}
        </p>
      </div>
    );
  }

  if (!hasDetectionData || detectedLabels.length === 0) {
    return (
      <div className="text-center py-2">
        <div className="flex items-center justify-center mb-1">
          <Package className="w-4 h-4 text-gray-400 mr-1" />
          <p className="text-xs text-gray-600">物品が検出されませんでした</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <Package className="w-4 h-4 text-orange-500 mr-2" />
        <h4 className="text-sm font-medium text-gray-700">検出された物品</h4>
        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
          {detectedLabels.length}個
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {detectedLabels.map((label) => {
          const isSelected = selectedLabel === label;
          return (
            <button
              key={label}
              onClick={() => onLabelClick(label)}
              className={`px-2 py-1 text-xs font-medium rounded-full border transition-colors ${
                isSelected
                  ? 'bg-orange-500 text-white border-orange-500' // 选中状态：填充橙色
                  : 'bg-transparent text-orange-600 border-orange-400 hover:bg-orange-50 hover:border-orange-500' // 未选中状态：只有橙色边框
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ItemSearchPanel({
  projectId,
  subtaskId,
  subtaskImageUrl,
  subtasks,
  isLoading,
  externalSearchResults,
  externalCropInfo,
  onExternalCropReset,
  searchContext,
  onBoundingBoxSelect,
  taskId,
}: ItemSearchPanelProps) {
  const renderStartTime = useRef<number>(0);
  const queryStartTime = useRef<number>(0);
  const [cropInfo, setCropInfo] = useState<CropInfo | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // 添加查询时间戳，确保每次搜索都是新的
  const [queryTimestamp, setQueryTimestamp] = useState(Date.now());

  // 物品检测触发的搜索结果状态
  const [itemDetectionSearchResults, setItemDetectionSearchResults] = useState<ItemSearchResult[] | null>(null);
  const [itemDetectionCropInfo, setItemDetectionCropInfo] = useState<CropInfo | null>(null);

  // 使用物品检测hook
  const itemDetectionResult = useItemDetection({
    projectId,
    subtaskId,
    subtaskImageUrl,
    subtasks,
    taskId,
  });

  const detectedLabels = itemDetectionResult.detectedLabels;
  const selectedItemBbox = itemDetectionResult.selectedItemBbox;
  const selectedLabel = itemDetectionResult.selectedLabel;
  const isDetecting = itemDetectionResult.isDetecting;
  const detectionError = itemDetectionResult.detectionError;
  const hasDetectionData = itemDetectionResult.hasDetectionData;
  const handleLabelClick = itemDetectionResult.handleLabelClick;

  // 处理物品标签点击，同时调用外部回调
  const handleItemLabelClick = async (label: string) => {
    handleLabelClick(label);

    // 获取点击标签对应的检测项
    const detectedItems = itemDetectionResult.detectedItems;
    const clickedItem = detectedItems.find((item) => item.label === label);

    if (clickedItem && subtaskImageUrl) {
      // 将边界框坐标转换为裁剪信息
      // box_2d格式: [y1, x1, y2, x2] normalized coordinates (0-1000)
      // 需要转换为: {x, y, width, height} relative coordinates (0-1)
      const [y1, x1, y2, x2] = clickedItem.box_2d;

      // 转换为0-1范围的相对坐标
      const cropInfo: CropInfo = {
        x: x1 / 1000, // 左边界
        y: y1 / 1000, // 上边界
        width: (x2 - x1) / 1000, // 宽度
        height: (y2 - y1) / 1000, // 高度
      };

      console.log('📐 Bounding box conversion:', {
        original: clickedItem.box_2d,
        originalFormat: '[y1, x1, y2, x2] (0-1000)',
        converted: cropInfo,
        convertedFormat: '{x, y, width, height} (0-1)',
        percentages: `${Math.round(cropInfo.width * 100)}×${Math.round(cropInfo.height * 100)}%`,
      });

      try {
        // 使用边界框区域进行搜索
        console.log('🔍 Starting item detection based search with crop:', cropInfo);
        const searchResponse = await searchItemsByImage(projectId, subtaskImageUrl, 20, cropInfo);

        // 存储搜索结果
        setItemDetectionSearchResults(searchResponse.results || []);
        setItemDetectionCropInfo(cropInfo);

        console.log('✅ Item detection search completed:', searchResponse.results?.length, 'results');
      } catch (error) {
        console.error('❌ Item detection search failed:', error);
        setItemDetectionSearchResults([]);
        setItemDetectionCropInfo(null);
      }
    }
  };

  // 当边界框选择变化时通知父组件
  React.useEffect(() => {
    if (onBoundingBoxSelect) {
      // 传递边界框坐标和标签
      onBoundingBoxSelect(selectedItemBbox, selectedLabel || undefined);
    }
  }, [selectedItemBbox, selectedLabel, onBoundingBoxSelect]);

  // 当cropInfo变化时更新时间戳（只在有实际变化时）
  useEffect(() => {
    // 延迟一点更新，避免频繁重新查询
    const timer = setTimeout(() => {
      setQueryTimestamp(Date.now());
    });

    return () => clearTimeout(timer);
  }, [cropInfo]);

  // 当切换subtask时，清除物品检测搜索结果
  useEffect(() => {
    setItemDetectionSearchResults(null);
    setItemDetectionCropInfo(null);
  }, [subtaskId]);

  // 测量查询时间
  const {
    data: searchData,
    isLoading: isSearchLoading,
    isError: isSearchError,
  } = useQuery({
    queryKey: ['itemSearch', projectId, subtaskImageUrl, cropInfo, queryTimestamp], // 添加时间戳确保查询唯一性

    queryFn: async () => {
      if (!subtaskImageUrl) {
        return { results: [], total: 0 };
      }

      try {
        queryStartTime.current = performance.now();
        console.log(`[ItemSearch] Starting search with timestamp: ${queryTimestamp}, cropInfo:`, cropInfo);
        const response = await searchItemsByImage(projectId, subtaskImageUrl, 20, cropInfo || undefined);
        const queryEndTime = performance.now();
        console.log(`[性能测试] 查询耗时: ${(queryEndTime - queryStartTime.current).toFixed(2)}ms`);
        console.log(`[ItemSearch] Search completed, results count: ${response.results?.length || 0}`);
        return response;
      } catch (error) {
        console.error('Error searching items by image:', error);
        throw error;
      }
    },
    enabled: !!subtaskImageUrl && !!projectId && !externalSearchResults, // 如果有外部搜索结果，禁用内部查询
    staleTime: 0, // 立即过期，不使用缓存
    gcTime: 0, // 立即垃圾回收，不保留缓存
    refetchOnMount: true, // 每次挂载时重新获取
    refetchOnWindowFocus: false, // 窗口聚焦时不重新获取
  });

  // 处理鼠标事件
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCropping || !containerRef.current) {
      return;
    }

    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStartPos({ x, y });
    setCurrentRect({ x, y, width: 0, height: 0 });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPos || !containerRef.current) {
      return;
    }

    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRect = {
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y),
    };

    setCurrentRect(newRect);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect || !imgRef.current || !containerRef.current) {
      return;
    }

    setIsDrawing(false);
    setIsCropping(false);

    // 确保裁剪区域有效
    if (currentRect.width < 10 || currentRect.height < 10) {
      setCurrentRect(null);
      setStartPos(null);
      return;
    }

    // 计算相对于图片的坐标
    const imgRect = imgRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    // 调整坐标，相对于图片
    const relativeX = (currentRect.x - (imgRect.left - containerRect.left)) / imgRect.width;
    const relativeY = (currentRect.y - (imgRect.top - containerRect.top)) / imgRect.height;
    const relativeWidth = currentRect.width / imgRect.width;
    const relativeHeight = currentRect.height / imgRect.height;

    // 确保坐标在0-1范围内
    const newCropInfo: CropInfo = {
      x: Math.max(0, Math.min(1, relativeX)),
      y: Math.max(0, Math.min(1, relativeY)),
      width: Math.max(0, Math.min(1, relativeWidth)),
      height: Math.max(0, Math.min(1, relativeHeight)),
    };

    setCropInfo(newCropInfo);
    setStartPos(null);
  };

  const startCropping = () => {
    setIsCropping(true);
    setCurrentRect(null);
    setStartPos(null);
  };

  const resetCrop = () => {
    setCropInfo(null);
    setCurrentRect(null);
    setStartPos(null);
    setIsCropping(false);
    setIsDrawing(false);
  };

  // 测量渲染时间
  useEffect(() => {
    if (searchData) {
      renderStartTime.current = performance.now();
      // 使用 requestAnimationFrame 确保在下一帧渲染时测量
      requestAnimationFrame(() => {
        const renderEndTime = performance.now();
        console.log(`[性能测试] 渲染耗时: ${(renderEndTime - renderStartTime.current).toFixed(2)}ms`);
      });
    }
  }, [searchData]);

  // 测量图片加载时间
  useEffect(() => {
    if (searchData?.results) {
      const imageLoadStartTime = performance.now();
      let loadedImages = 0;
      const totalImages = searchData.results.length;

      const checkAllImagesLoaded = () => {
        loadedImages++;
        if (loadedImages === totalImages) {
          const imageLoadEndTime = performance.now();
          console.log(`[性能测试] 图片加载耗时: ${(imageLoadEndTime - imageLoadStartTime).toFixed(2)}ms`);
        }
      };

      // 监听所有图片的加载
      searchData.results.forEach((item) => {
        const img = new Image();
        img.onload = checkAllImagesLoaded;
        img.onerror = checkAllImagesLoaded;
        img.src = item.s3_path;
      });
    }
  }, [searchData?.results]);

  if (isLoading) {
    return (
      <div className="p-2 space-y-2 animate-pulse">
        {/* Compact skeleton header */}
        <div className="flex items-center justify-between py-2 px-1">
          <div className="flex items-center gap-3">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-12 h-5 rounded-full" />
          </div>
          <Skeleton className="w-16 h-7 rounded" />
        </div>

        {/* Skeleton grid - maximized space */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10 2xl:grid-cols-12 gap-1.5 lg:gap-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // 搜索结果优先级：物品检测搜索结果 > 外部搜索结果 > 内部搜索结果
  const searchResults = itemDetectionSearchResults || externalSearchResults || searchData?.results || [];
  const totalResults = itemDetectionSearchResults?.length || externalSearchResults?.length || searchData?.total || 0;
  const currentCropInfo = itemDetectionCropInfo || externalCropInfo || cropInfo;
  const isUsingExternalResults = !!externalSearchResults;
  const isUsingItemDetectionResults = !!itemDetectionSearchResults;

  const handleToggleExpand = (id: string) => {
    setExpandedItemId((prev) => (prev === id ? null : id));
  };

  console.log('ItemSearchPanel 渲染状态:', {
    externalSearchResults,
    searchDataResults: searchData?.results,
    searchResults,
    totalResults,
    isUsingExternalResults,
    currentCropInfo,
    isSearchLoading,
    shouldShowSearchTip: isSearchLoading && !isUsingExternalResults,
  });

  if (!subtaskImageUrl) {
    return (
      <div className="p-2">
        <div className="py-12 text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground mb-2">画像検索準備中</h3>
          <p className="text-sm text-muted-foreground">サブタスクの画像から類似アイテムを検索します</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      {/* Item Detection Section - 显示在顶部 */}
      <div className="space-y-2">
        <ItemDetectionSection
          detectedLabels={detectedLabels}
          isDetecting={isDetecting}
          detectionError={detectionError}
          hasDetectionData={hasDetectionData}
          onLabelClick={(label) => {
            void handleItemLabelClick(label);
          }}
          selectedLabel={selectedLabel}
        />
      </div>

      {/* 只显示非外部搜索且非物品检测搜索的情况下的搜索图片控制 */}
      {!isUsingExternalResults && !isUsingItemDetectionResults && (
        <>
          {/* 紧凑的搜索控制标题 */}
          <div className="flex items-center justify-between py-2 px-1">
            <div className="flex items-center gap-3">
              {currentCropInfo ? (
                <Crop className="w-5 h-5 text-primary" />
              ) : (
                <ImageIcon className="w-5 h-5 text-primary" />
              )}
              <h3 className="text-base font-semibold text-foreground">
                {currentCropInfo ? 'エリア切り取り検索' : '完全画像検索'}
              </h3>
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                {totalResults}件
              </Badge>
              {/* 显示裁剪预览 - 内部搜索时 */}
              {currentCropInfo && subtaskImageUrl && (
                <div className="flex items-center gap-2 ml-2">
                  <div className="w-6 h-6 border border-border/30 rounded overflow-hidden bg-gray-100">
                    <CroppedImagePreview
                      imageUrl={subtaskImageUrl}
                      cropInfo={currentCropInfo}
                      className="object-cover w-full h-full"
                      alt="AI検索入力画像"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isCropping && !cropInfo && (
                <Button variant="outline" size="sm" onClick={startCropping} className="gap-1 h-7 px-2 text-xs">
                  <Crop className="w-3 h-3" />
                  切り取り
                </Button>
              )}
              {cropInfo && (
                <Button variant="outline" size="sm" onClick={resetCrop} className="gap-1 h-7 px-2 text-xs">
                  <X className="w-3 h-3" />
                  クリア
                </Button>
              )}
            </div>
          </div>

          {/* 搜索图片区域 - 仅在需要时显示 */}
          {(isCropping || currentCropInfo) && (
            <Card className="border-border/40 bg-card shadow-sm mb-3">
              <CardContent className="p-3">
                <div
                  ref={containerRef}
                  className={`relative overflow-hidden border-2 border-border/20 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 shadow-inner ${isCropping ? 'cursor-crosshair' : 'cursor-default'}`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => setIsDrawing(false)}
                >
                  <img
                    ref={imgRef}
                    src={subtaskImageUrl}
                    alt="検索画像"
                    className="w-full h-auto max-h-96 object-contain select-none"
                    draggable={false}
                  />

                  {/* 当前绘制的矩形 */}
                  {currentRect && (
                    <div
                      className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
                      style={{
                        left: `${currentRect.x}px`,
                        top: `${currentRect.y}px`,
                        width: `${currentRect.width}px`,
                        height: `${currentRect.height}px`,
                      }}
                    />
                  )}

                  {/* 已确定的裁剪区域 */}
                  {currentCropInfo && imgRef.current && (
                    <div
                      className="absolute border-2 border-green-500 bg-green-200/20 pointer-events-none"
                      style={{
                        left: `${currentCropInfo.x * imgRef.current.clientWidth + (imgRef.current.getBoundingClientRect().left - containerRef.current!.getBoundingClientRect().left)}px`,
                        top: `${currentCropInfo.y * imgRef.current.clientHeight + (imgRef.current.getBoundingClientRect().top - containerRef.current!.getBoundingClientRect().top)}px`,
                        width: `${currentCropInfo.width * imgRef.current.clientWidth}px`,
                        height: `${currentCropInfo.height * imgRef.current.clientHeight}px`,
                      }}
                    />
                  )}

                  {/* 裁剪提示 */}
                  {isCropping && (
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
                      <div className="bg-white/95 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 shadow-lg border border-border/20">
                        画像上でドラッグして矩形エリアを描画
                      </div>
                    </div>
                  )}

                  {/* 裁剪区域信息 */}
                  {currentCropInfo && (
                    <Badge variant="default" className="absolute top-3 left-3 bg-green-600 text-white">
                      選択エリア: {Math.round(currentCropInfo.width * 100)}% ×{' '}
                      {Math.round(currentCropInfo.height * 100)}%
                    </Badge>
                  )}
                </div>

                {currentCropInfo && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      切り取りエリア: X={Math.round(currentCropInfo.x * 100)}%, Y={Math.round(currentCropInfo.y * 100)}
                      %, 幅={Math.round(currentCropInfo.width * 100)}%, 高さ={Math.round(currentCropInfo.height * 100)}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* 物品检测搜索结果的紧凑标题 */}
      {isUsingItemDetectionResults && (
        <div className="flex items-center justify-between py-2 px-1">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-foreground">物品検出による類似検索</h3>
            <Badge variant="outline" className="border-orange-500/30 text-orange-600 text-xs">
              {totalResults}件
            </Badge>
            {/* 显示检测到的物品标签 */}
            {selectedLabel && (
              <Badge variant="default" className="bg-orange-500 text-white text-xs">
                {selectedLabel}
              </Badge>
            )}
            {/* 显示截取区域的小预览 */}
            {currentCropInfo && subtaskImageUrl && (
              <div className="flex items-center gap-2 ml-2">
                <div className="w-32 h-20 border border-border/30 rounded overflow-hidden bg-gray-100">
                  <CroppedImagePreview
                    imageUrl={subtaskImageUrl}
                    cropInfo={currentCropInfo}
                    className="object-cover w-full h-full"
                    alt="物品検出エリア"
                  />
                </div>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setItemDetectionSearchResults(null);
              setItemDetectionCropInfo(null);
            }}
            className="gap-1 h-7 px-2 text-xs"
          >
            <X className="w-3 h-3" />
            クリア
          </Button>
        </div>
      )}

      {/* 外部搜索结果的紧凑标题 */}
      {isUsingExternalResults && !isUsingItemDetectionResults && (
        <div className="flex items-center justify-between py-2 px-1">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">類似画像検索結果</h3>
            <Badge variant="outline" className="border-primary/30 text-primary text-xs">
              {totalResults}件
            </Badge>
            {/* 显示截取区域的小预览 - 显示实际裁剪后的图片 */}
            {currentCropInfo && subtaskImageUrl && (
              <div className="flex items-center gap-2 ml-2">
                <div className="w-32 h-20 border border-border/30 rounded overflow-hidden bg-gray-100">
                  <CroppedImagePreview
                    imageUrl={subtaskImageUrl}
                    cropInfo={currentCropInfo}
                    className="object-cover w-full h-full"
                    alt="AI検索入力画像"
                  />
                </div>
              </div>
            )}
          </div>
          {onExternalCropReset && (
            <Button variant="outline" size="sm" onClick={onExternalCropReset} className="gap-1 h-7 px-2 text-xs">
              <X className="w-3 h-3" />
              クリア
            </Button>
          )}
        </div>
      )}

      {/* 搜索状态提示 */}
      {isSearchLoading && !isUsingExternalResults && !isUsingItemDetectionResults && subtaskImageUrl && (
        <div className="flex items-center justify-center py-4 px-2">
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-2 rounded-lg border border-primary/20">
            <div className="w-4 h-4 border-2 border-primary/30 rounded-full border-t-primary animate-spin" />
            <span className="text-sm font-medium">類似画像を検索中...</span>
          </div>
        </div>
      )}

      {/* Search Results */}
      <SearchResults
        isLoading={isSearchLoading}
        isError={isSearchError}
        searchResults={searchResults}
        totalResults={totalResults}
        searchContext={searchContext}
        expandedItemId={expandedItemId}
        onToggleExpand={handleToggleExpand}
      />
    </div>
  );
}
