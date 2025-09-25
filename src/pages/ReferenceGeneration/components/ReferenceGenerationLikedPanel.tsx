import { Heart, Image as ImageIcon, Search, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLikedImages } from '@/hooks/useLikedImages';
import { type LikedImageResponse } from '@/types/userPreferences';

import { UnifiedImageDetailModal } from './LikedImageDetailModal';

interface ReferenceGenerationLikedPanelProps {
  className?: string;
}

export function ReferenceGenerationLikedPanel({ className }: ReferenceGenerationLikedPanelProps) {
  const { likedImages, isLoading, error } = useLikedImages();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<LikedImageResponse | null>(null);

  const filteredImages = likedImages.filter(
    (img) =>
      img.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      img.source_type.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const descriptionText =
    likedImages.length > 0 ? `${likedImages.length}枚のお気に入り` : 'まだお気に入りの画像はありません';

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
              key={img.id}
              className="relative overflow-hidden rounded-lg shadow-sm transition-all duration-300 group hover:shadow-md bg-gray-100 dark:bg-gray-800"
              onClick={() => setSelectedImage(img)}
            >
              <div className="relative aspect-square">
                <img
                  src={img.image_url}
                  alt={img.display_name || `Liked image ${i + 1}`}
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
                        generated_reference: <ImageIcon className="h-2.5 w-2.5" />,
                        character: <ImageIcon className="h-2.5 w-2.5" />,
                        item: <ImageIcon className="h-2.5 w-2.5" />,
                      }[img.source_type] ?? <ImageIcon className="h-2.5 w-2.5" />}
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {{
                          generated_reference: '生成',
                          character: 'キャラ',
                          item: 'アイテム',
                        }[img.source_type] ?? img.source_type}
                      </span>
                    </span>
                  </div>
                )}
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
        {/* Liked Images Panel */}
        <div className="flex flex-1 flex-col h-full min-h-0 bg-white dark:bg-gray-900 md:rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          {/* Header */}
          <div className="p-4 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500 fill-current" />
                <h3 className="font-bold text-gray-900 dark:text-white">お気に入り画像</h3>
              </div>
              <span className="text-xs text-gray-500">{descriptionText}</span>
            </div>

            {likedImages.length > 0 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm focus:scale-[1.01] transition-transform"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 hover:scale-110 transition rounded-full p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
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

      <UnifiedImageDetailModal
        imageData={selectedImage}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </>
  );
}
