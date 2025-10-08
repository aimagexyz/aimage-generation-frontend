import { Check, Heart, Image as ImageIcon, MessageSquare, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { referenceGenerationService } from '@/api/referenceGenerationService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useLikedImages } from '@/hooks/useLikedImages';
import { type LikedImageResponse } from '@/types/userPreferences';

import { type ImageDetailData } from '../types';
import { UnifiedImageDetailModal } from './LikedImageDetailModal';

interface ReferenceGenerationLikedPanelProps {
  className?: string;
}

export function ReferenceGenerationLikedPanel({ className }: ReferenceGenerationLikedPanelProps) {
  const { currentProjectId } = useAuth();
  const { likedImages } = useLikedImages();
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyLiked, setOnlyLiked] = useState(false);
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageDetailData | LikedImageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<ImageDetailData[]>([]);

  // Fetch generated references
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!currentProjectId) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const items = await referenceGenerationService.listReferences(currentProjectId);
        if (cancelled) {
          return;
        }
        // Ensure items is an array before mapping
        const safeItems = Array.isArray(items) ? items : [];
        const mapped: ImageDetailData[] = safeItems.map((it) => ({
          image_url: it.image_url,
          image_path: it.image_path,
          display_name: it.enhanced_prompt || it.base_prompt,
          source_type: 'generated_reference',
          source_id: it.id,
          tags: Object.values(it.tags || {}),
          created_at: typeof it.created_at === 'string' ? it.created_at : String(it.created_at),
          base_prompt: it.base_prompt,
          enhanced_prompt: it.enhanced_prompt,
        }));
        setGenerated(mapped);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError('読み込みに失敗しました');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [currentProjectId]);

  // Build quick lookup of liked image paths
  const likedPathSet = useMemo(() => new Set((likedImages || []).map((l) => l.image_path)), [likedImages]);

  const filteredImages = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = generated.filter((img) => {
      const inQuery =
        (img.display_name || '').toLowerCase().includes(q) ||
        (img.base_prompt || '').toLowerCase().includes(q) ||
        (img.enhanced_prompt || '').toLowerCase().includes(q) ||
        (img.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!inQuery) {
        return false;
      }
      if (onlyLiked) {
        return img.image_path ? likedPathSet.has(img.image_path) : false;
      }
      return true;
    });
    return list;
  }, [generated, searchQuery, onlyLiked, likedPathSet]);

  const descriptionText =
    generated.length > 0 ? `${generated.length}枚の生成画像` : 'まだ生成画像はありません';

  const renderMainContent = () => {
    if (isLoading) {
      return (
        <div
          className="
            grid grid-cols-2 gap-2 p-1
          "
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg shadow-sm transition-all duration-300 group hover:shadow-md bg-gray-100 dark:bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      );
    }

    if (filteredImages.length > 0) {
      return (
        <div
          className="
            grid grid-cols-2 gap-2 p-1
          "
        >
          {filteredImages.map((img, i) => (
            <div
              key={`${img.image_path}-${i}`}
              className="relative overflow-hidden rounded-lg shadow-sm transition-all duration-300 group hover:shadow-md bg-gray-100 dark:bg-gray-800"
              onClick={() => setSelectedImage(img)}
            >
              <div className="relative aspect-square">
                <img
                  src={img.image_url}
                  alt={img.display_name || `Generated image ${i + 1}`}
                  className="w-full h-full object-cover rounded-lg cursor-pointer transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Source Type */}
                {img.source_type && (
                  <div className="absolute bottom-1.5 left-1.5 z-10">
                    <span className="px-2 py-0.5 text-xs bg-black/50 text-white rounded-full backdrop-blur-sm flex items-center gap-1">
                      {{
                        conversation: <MessageSquare className="h-2.5 w-2.5" />,
                        generated_reference: <ImageIcon className="h-2.5 w-2.5" />,
                        character: <ImageIcon className="h-2.5 w-2.5" />,
                        item: <ImageIcon className="h-2.5 w-2.5" />,
                      }[img.source_type] ?? <ImageIcon className="h-2.5 w-2.5" />}
                      <span className="opacity-100 transition-opacity duration-300">
                        {{
                          conversation: '会話',
                          generated_reference: '生成',
                          character: 'キャラ',
                          item: 'アイテム',
                        }[img.source_type] ?? img.source_type}
                      </span>
                    </span>
                  </div>
                )}

                {/* Liked badge */}
                {/* {img.image_path && likedPathSet.has(img.image_path) && (
                  <div className="absolute top-1.5 right-1.5 z-10">
                    <span className="px-1.5 py-0.5 text-[10px] bg-red-500/80 text-white rounded-full backdrop-blur-sm flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                    </span>
                  </div>
                )} */}
              </div>
            </div>
          ))}
        </div>
      );
    }
  };

  if (error) {
    return (
      <div className={`h-full flex-col md:flex ${className}`}>
        <div className="flex flex-1 flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
          <div className="flex items-center gap-2 text-destructive">
            <Heart className="h-5 w-5" />
            <span className="font-semibold">エラーが発生しました</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center">お気に入り画像の読み込みに失敗しました</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`h-full flex-col md:flex ${className}`}>
        {/* Generated Images Panel */}
        <div className="flex flex-1 flex-col h-full min-h-0 bg-white dark:bg-gray-900 md:rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          {/* Header */}
          <div className="p-4 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-purple-500" />
                <h3 className="font-bold text-gray-900 dark:text-white">生成画像</h3>
              </div>
              <span className="text-xs text-gray-500">{descriptionText}</span>
            </div>
            <div className="relative">
              <Input
                placeholder="検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm focus:scale-[1.01] transition-transform pr-24"
              />
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-20 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 hover:scale-110 transition rounded-full p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {/* Temprarily disabled */}
              <Button
                variant={onlyLiked ? 'default' : 'outline'}
                size="sm"
                className={`hidden absolute right-2 top-1/2 -translate-y-1/2 h-8 text-xs ${onlyLiked ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
                onClick={() => setOnlyLiked((v) => !v)}
              >
                <Heart className="w-3.5 h-3.5 mr-1" />
                お気に入りのみ
                {onlyLiked && <Check className="w-3.5 h-3.5 ml-1" />}
              </Button>
            </div>
          </div>
          {/* Content */}
          <div className="flex-1 p-2 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
            {renderMainContent()}
          </div>
        </div>
      </div>

      {/* modals… */}
      {viewImageUrl && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/80 z-50 p-4"
          onClick={() => setViewImageUrl(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={viewImageUrl} alt="Full size view" className="max-w-full max-h-full object-contain rounded-lg" />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2 h-8 w-8 p-0 bg-black/50 text-white hover:bg-black/70"
              onClick={() => setViewImageUrl(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <UnifiedImageDetailModal imageData={selectedImage} isOpen={!!selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
}
