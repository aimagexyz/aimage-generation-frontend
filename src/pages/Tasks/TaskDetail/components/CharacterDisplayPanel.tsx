import { Download, ImageIcon, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LuLoader } from 'react-icons/lu';

import type { CharacterDetail } from '@/api/charactersService';
import type { components } from '@/api/schemas';
import { LazyImage } from '@/components/ui/LazyImage';
import { useCharacterConceptArt, useCharacterGallery } from '@/hooks/useCharacters';

import { useCharacters } from '../hooks/useCharacters';
import { useSubtaskCharacters } from '../hooks/useSubtaskCharacters';
import { CharacterAvatarSelector } from './CharacterAvatarSelector';

type SubtaskOut = components['schemas']['SubtaskOut'];

interface CharacterDisplayPanelProps {
  projectId: string;
  subtaskId: string;
  subtaskImageUrl?: string | null;
  subtasks?: SubtaskOut[]; // 添加subtasks参数以便从中加载保存的角色选择
}

interface GalleryContentProps {
  isLoading: boolean;
  isError: boolean;
  images: string[];
  character: CharacterDetail;
  totalImages: number;
  sectionTitle: string;
}

interface ImagePopupProps {
  imgUrl: string;
  character: CharacterDetail;
  imageIndex: number;
  totalImages: number;
  sectionTitle: string;
  isExpanded?: boolean;
  onToggleExpand?: (index: number) => void;
}

function ImagePopup({
  imgUrl,
  character,
  imageIndex,
  totalImages,
  sectionTitle,
  isExpanded,
  onToggleExpand,
}: ImagePopupProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panMovedRef = useRef<boolean>(false);
  const wrapperRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isExpanded) {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      setIsPanning(false);
      panStartRef.current = null;
    } else {
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

  const handleClick = (e: React.MouseEvent) => {
    if (panMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      panMovedRef.current = false;
      return;
    }
    onToggleExpand?.(imageIndex);
  };

  let containerCursorClass = '';
  if (isExpanded) {
    containerCursorClass = isPanning ? 'cursor-grabbing' : 'cursor-grab';
  }

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      ref={wrapperRef}
      className="relative overflow-hidden transition-all duration-200 rounded-lg shadow-sm group hover:shadow-md cursor-pointer w-full"
    >
      <div
        className={`relative overflow-hidden bg-gray-100 rounded-lg ${containerCursorClass} ${isExpanded ? 'aspect-[3/2]' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endPan}
        onMouseLeave={endPan}
      >
        {isExpanded ? (
          <img
            src={imgUrl}
            alt={`${character.name} ${sectionTitle} ${imageIndex + 1}`}
            className="absolute top-1/2 left-1/2 max-w-none select-none"
            style={{
              transform: `translate(calc(-50% + ${panOffset.x}px), calc(-50% + ${panOffset.y}px)) scale(${zoomLevel})`,
              transition: isPanning ? 'none' : 'transform 120ms ease-out',
            }}
            draggable={false}
          />
        ) : (
          <LazyImage
            src={imgUrl}
            alt={`${character.name} ${sectionTitle} ${imageIndex + 1}`}
            className="w-full h-full"
            imageClassName="object-contain"
          />
        )}

        {!isExpanded && (
          <div className="absolute inset-0 flex items-center justify-center transition-colors duration-200 bg-black/0 group-hover:bg-black/30">
            <ZoomIn className="w-6 h-6 text-white transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
          </div>
        )}

        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded text-[10px] font-medium">
          {imageIndex + 1}/{totalImages}
        </div>

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

        {/* Download */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            const link = document.createElement('a');
            link.href = imgUrl;
            link.download = `${character.name}-${sectionTitle}-image-${imageIndex + 1}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          className="absolute flex items-center justify-center p-0 text-white transition-opacity duration-200 rounded opacity-0 cursor-pointer top-2 right-2 bg-black/70 hover:bg-black/90 h-7 w-7 group-hover:opacity-100"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              const link = document.createElement('a');
              link.href = imgUrl;
              link.download = `${character.name}-${sectionTitle}-image-${imageIndex + 1}`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          }}
        >
          <Download className="w-3.5 h-3.5" />
        </div>
      </div>
    </button>
  );
}

function GalleryContent({
  isLoading,
  isError,
  images,
  character,
  totalImages,
  sectionTitle,
  expandedIndex,
  onToggleExpand,
}: GalleryContentProps & { expandedIndex?: number | null; onToggleExpand?: (index: number) => void }) {
  if (isLoading) {
    return (
      <div className="py-6 text-center">
        <div className="w-5 h-5 mx-auto mb-2 border-4 border-gray-300 rounded-full border-t-blue-500 animate-spin" />
        <p className="text-sm font-medium">読み込み中...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-6 text-center">
        <ImageIcon className="w-7 h-7 mx-auto mb-2 text-red-400" />
        <p className="text-sm font-medium text-red-600">読み込み失敗</p>
        <p className="text-xs text-gray-500">ネットワークを確認してください</p>
      </div>
    );
  }

  if (!images || images.length === 0) {
    return (
      <div className="py-6 text-center">
        <ImageIcon className="w-7 h-7 mx-auto mb-2 text-gray-400" />
        <p className="text-sm font-medium">画像なし</p>
        <p className="text-xs text-gray-500">画像が登録されていません</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {images.map((imgUrl, index) => {
        const isExpanded = expandedIndex === index;
        return (
          <div key={index} className={`${isExpanded ? 'col-span-2' : ''}`}>
            <ImagePopup
              imgUrl={imgUrl}
              character={character}
              imageIndex={index}
              totalImages={totalImages}
              sectionTitle={sectionTitle}
              isExpanded={isExpanded}
              onToggleExpand={onToggleExpand}
            />
          </div>
        );
      })}
    </div>
  );
}

function PredictionPlaceholder({
  isPredicting,
  predictionFailed,
}: {
  isPredicting: boolean;
  predictionFailed: boolean;
}) {
  if (isPredicting) {
    return (
      <div className="flex items-center justify-center py-8 text-center">
        <div className="space-y-3">
          <LuLoader className="w-8 h-8 mx-auto animate-spin text-purple-500" />
          <div>
            <p className="text-sm font-medium text-gray-700">AI予測中...</p>
            <p className="text-xs text-gray-500">キャラクターを識別しています</p>
          </div>
        </div>
      </div>
    );
  }

  if (predictionFailed) {
    return (
      <div className="text-center py-2">
        <p className="text-xs text-gray-600">予測したキャラクターがありません、手動で選択してください</p>
      </div>
    );
  }

  return null;
}

export function CharacterDisplayPanel({ projectId, subtaskId, subtasks }: CharacterDisplayPanelProps) {
  const [expanded, setExpanded] = useState<{ section: 'gallery' | 'concept'; index: number } | null>(null);

  // Fetch available characters for AI prediction
  const { characters = [] } = useCharacters({ projectId });

  // 使用新的subtask角色管理hook（已包含自动预测功能）
  const {
    displayCharacters,
    selectedCharacter: managedSelectedCharacter,
    isPredicting,
    handleCharacterSelect,
    handleCharacterAdd,
    handleCharacterRemove,
  } = useSubtaskCharacters({
    subtaskId,
    subtasks,
    availableCharacters: characters,
  });

  // Fetch gallery images for the selected character
  const {
    data: galleryData,
    isLoading: isGalleryLoading,
    isError: isGalleryError,
  } = useCharacterGallery(managedSelectedCharacter?.id || null, projectId);

  // Fetch concept art images for the selected character
  const {
    data: conceptArtData,
    isLoading: isConceptArtLoading,
    isError: isConceptArtError,
  } = useCharacterConceptArt(managedSelectedCharacter?.id || null, projectId);

  // Get images from the API responses
  const galleryImages = galleryData?.gallery_images || [];
  const conceptArtImages = conceptArtData?.concept_art_images || [];

  const toggleExpand = (section: 'gallery' | 'concept', index: number) => {
    setExpanded((prev) => (prev && prev.section === section && prev.index === index ? null : { section, index }));
  };

  return (
    <div className="p-4 space-y-4">
      {/* Character Selection Section */}
      <div className="space-y-4">
        {/* 预测中状态显示 */}
        {isPredicting && <PredictionPlaceholder isPredicting={Boolean(isPredicting)} predictionFailed={false} />}

        {/* 角色头像选择器 - 统一使用圆圈头像方案 */}
        {!isPredicting && (
          <>
            <CharacterAvatarSelector
              projectId={projectId}
              predictedCharacters={displayCharacters}
              selectedCharacter={managedSelectedCharacter}
              onCharacterSelect={handleCharacterSelect}
              onCharacterAdd={handleCharacterAdd}
              onCharacterRemove={handleCharacterRemove}
              showEmptyState={displayCharacters.length === 0}
            />

            {/* 没有角色时的提示显示在角色选择器下面 */}
            {displayCharacters.length === 0 && <PredictionPlaceholder isPredicting={false} predictionFailed={true} />}
          </>
        )}
      </div>

      {managedSelectedCharacter && (
        <div className="space-y-6 max-h-[calc(100vh-180px)] overflow-y-auto">
          {/* ギャラリー Section */}
          <div>
            <div className="flex items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">ギャラリー</h3>
              <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {galleryImages.length}枚
              </span>
            </div>
            <GalleryContent
              isLoading={isGalleryLoading}
              isError={isGalleryError}
              images={galleryImages}
              character={managedSelectedCharacter}
              totalImages={galleryImages.length}
              sectionTitle="ギャラリー"
              expandedIndex={expanded?.section === 'gallery' ? expanded.index : null}
              onToggleExpand={(index) => toggleExpand('gallery', index)}
            />
          </div>

          {/* 角色設定集 Section */}
          <div>
            <div className="flex items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">角色設定集</h3>
              <span className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                {conceptArtImages.length}枚
              </span>
            </div>
            <GalleryContent
              isLoading={isConceptArtLoading}
              isError={isConceptArtError}
              images={conceptArtImages}
              character={managedSelectedCharacter}
              totalImages={conceptArtImages.length}
              sectionTitle="角色設定集"
              expandedIndex={expanded?.section === 'concept' ? expanded.index : null}
              onToggleExpand={(index) => toggleExpand('concept', index)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
