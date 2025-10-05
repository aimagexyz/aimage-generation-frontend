import {
  Copy,
  Download,
  Hash,
  Image as ImageIcon,
  MessageSquare,
  Palette,
  Sparkles,
  Tag,
  Timer,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LikeButton } from '@/components/ui/LikeButton';
import { toast } from '@/components/ui/use-toast';
import { type LikedImageResponse } from '@/types/userPreferences';

import { type ImageDetailData } from '../types';

interface UnifiedImageDetailModalProps {
  imageData: ImageDetailData | LikedImageResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

// Type guard to check if data is from liked images
const isLikedImageData = (data: ImageDetailData | LikedImageResponse): data is LikedImageResponse => {
  return 'id' in data;
};

// Convert LikedImageResponse to unified format
const convertLikedImageToUnified = (liked: LikedImageResponse): ImageDetailData => ({
  image_url: liked.image_url,
  image_path: liked.image_path,
  display_name: liked.display_name,
  source_type: liked.source_type as 'generated_reference' | 'character' | 'item',
  source_id: liked.source_id,
  tags: liked.tags,
  created_at: liked.created_at,
});

export function UnifiedImageDetailModal({ imageData, isOpen, onClose }: UnifiedImageDetailModalProps) {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  if (!imageData) {
    return null;
  }

  // Normalize data to unified format
  const data: ImageDetailData = isLikedImageData(imageData) ? convertLikedImageToUnified(imageData) : imageData;

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get source type display
  const getSourceTypeDisplay = (sourceType: string) => {
    switch (sourceType) {
      case 'conversation':
        return { label: '会話画像', icon: MessageSquare, color: 'from-blue-500 to-cyan-500' };
      case 'generated_reference':
        return { label: '生成画像', icon: Sparkles, color: 'from-purple-500 to-blue-500' };
      case 'character':
        return { label: 'キャラクター', icon: ImageIcon, color: 'from-green-500 to-teal-500' };
      case 'item':
        return { label: 'アイテム', icon: Palette, color: 'from-orange-500 to-red-500' };
      default:
        return { label: sourceType, icon: Hash, color: 'from-gray-500 to-slate-500' };
    }
  };

  // Copy to clipboard functionality
  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(label);
      toast({
        title: 'コピーしました',
        description: `${label}をクリップボードにコピーしました`,
        duration: 2000,
      });
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: 'エラー',
        description: 'コピーに失敗しました',
        variant: 'destructive',
        duration: 2000,
      });
    }
  };

  // Download image
  const handleDownload = async () => {
    try {
      const response = await fetch(data.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.display_name || 'image'}_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'ダウンロード完了',
        description: '画像がダウンロードされました',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to download image:', error);
      toast({
        title: 'エラー',
        description: 'ダウンロードに失敗しました',
        variant: 'destructive',
        duration: 2000,
      });
    }
  };

  const sourceInfo = getSourceTypeDisplay(data.source_type);
  const SourceIcon = sourceInfo.icon;

  return (
    <>
      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in"
            onClick={onClose}
          >
            <div
              className="relative max-w-4xl w-full max-h-[95vh] bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-10 h-8 w-8 p-0 bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm rounded-full transition-all duration-150 hover:scale-110"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="flex flex-row h-full">
                {/* Image Section - Left Side */}
                <div className="w-1/2 relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                  <div className="relative h-full flex items-center justify-center p-4">
                    {isImageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    <img
                      src={data.image_url}
                      alt={data.display_name || '画像'}
                      className="max-w-full max-h-full object-contain rounded-xl shadow-lg transition-transform duration-200 hover:scale-105"
                      onLoad={() => setIsImageLoading(false)}
                      onError={() => setIsImageLoading(false)}
                    />

                    {/* Floating action buttons */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      {/* Only show like button for conversation images that have source info */}
                      {(() => {
                        if (data.source_type === 'conversation' && data.image_path && data.source_id) {
                          return (
                            <LikeButton
                              imageUrl={data.image_url}
                              sourceInfo={{
                                source_type: 'generated_reference',
                                source_id: data.source_id,
                                image_path: data.image_path,
                                display_name: data.display_name,
                              }}
                              size="sm"
                              variant="floating"
                              className="h-10 w-10 shadow-lg backdrop-blur-sm transition-transform duration-150 hover:scale-110"
                            />
                          );
                        }
                        return null;
                      })()}
                      {/* Show like button for liked images */}
                      {(() => {
                        if (isLikedImageData(imageData) && data.source_id && data.image_path) {
                          return (
                            <LikeButton
                              imageUrl={data.image_url}
                              sourceInfo={{
                                source_type: data.source_type as 'generated_reference' | 'character' | 'item',
                                source_id: data.source_id,
                                image_path: data.image_path,
                                display_name: data.display_name,
                              }}
                              size="sm"
                              variant="floating"
                              className="h-10 w-10 shadow-lg backdrop-blur-sm transition-transform duration-150 hover:scale-110"
                            />
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Details Section - Right Side */}
                <div className="w-1/2 flex flex-col min-h-0 overflow-hidden">
                  {/* Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-start gap-3 mb-4">
                      <div
                        className={`p-2 rounded-xl bg-gradient-to-br ${sourceInfo.color} text-white shadow-lg flex-shrink-0 transition-transform duration-150 hover:scale-110`}
                      >
                        <SourceIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                          {data.display_name || '画像'}
                        </h2>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => void handleDownload()}
                        className="flex-1 transition-transform duration-150 hover:scale-105"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        ダウンロード
                      </Button>
                    </div>
                  </div>

                  {/* Metadata Cards */}
                  <div className="flex-1 min-h-0 p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
                    {/* Basic Information */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        基本情報
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">作成日時</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-blue-800 dark:text-blue-200 text-right">
                              {formatDate(data.created_at)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-all duration-150 hover:scale-110"
                              onClick={() => void handleCopy(data.created_at, '作成日時')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {data.source_id && (
                          <div className="flex items-start justify-between">
                            <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">ソースID</span>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded font-mono text-blue-800 dark:text-blue-200">
                                {data.source_id.slice(0, 8)}...
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-all duration-150 hover:scale-110"
                                onClick={() => void handleCopy(data.source_id ?? '', 'ソースID')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                        {typeof data.generation_time === 'number' ? (
                          <div className="flex items-start justify-between">
                            <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">生成時間</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-1">
                                <Timer className="h-3 w-3" />
                                {Math.round(data.generation_time / 1000)}秒
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Generation Prompts - Only for conversation images */}
                    {data.source_type === 'conversation' && (data.base_prompt || data.enhanced_prompt) && (
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                        <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-3 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          プロンプト情報
                        </h3>
                        <div className="space-y-3">
                          {data.base_prompt && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                                  ベースプロンプト
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-all duration-150 hover:scale-110"
                                  onClick={() => void handleCopy(data.base_prompt!, 'ベースプロンプト')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-xs bg-emerald-100 dark:bg-emerald-800 px-3 py-2 rounded font-mono text-emerald-800 dark:text-emerald-200 break-words">
                                {data.base_prompt}
                              </p>
                            </div>
                          )}
                          {data.enhanced_prompt && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                                  拡張プロンプト
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-all duration-150 hover:scale-110"
                                  onClick={() => void handleCopy(data.enhanced_prompt!, '拡張プロンプト')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-xs bg-emerald-100 dark:bg-emerald-800 px-3 py-2 rounded font-mono text-emerald-800 dark:text-emerald-200 break-words">
                                {data.enhanced_prompt}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {data.tags && data.tags.length > 0 && (
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                        <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          タグ
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {data.tags.map((tag) => (
                            <div key={tag}>
                              <Badge
                                variant="secondary"
                                className="bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-600 transition-transform duration-150 hover:scale-105"
                              >
                                {tag}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Generation Settings - Only for conversation images */}
                    {data.source_type === 'conversation' && data.settings && (
                      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                        <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          生成設定
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-amber-700 dark:text-amber-300">画像数:</span>
                            <span className="text-sm text-amber-800 dark:text-amber-200">
                              {data.settings.number_of_images}枚
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-amber-700 dark:text-amber-300">アスペクト比:</span>
                            <span className="text-sm text-amber-800 dark:text-amber-200">
                              {data.settings.aspect_ratio}
                            </span>
                          </div>
                          {data.settings.negative_prompt && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-amber-700 dark:text-amber-300">
                                  ネガティブプロンプト:
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-all duration-150 hover:scale-110"
                                  onClick={() =>
                                    void handleCopy(data.settings!.negative_prompt!, 'ネガティブプロンプト')
                                  }
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-xs bg-amber-100 dark:bg-amber-800 px-2 py-1 rounded text-amber-800 dark:text-amber-200">
                                {data.settings.negative_prompt}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Copy Feedback */}
                    {copyFeedback && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 animate-fade-in">
                        <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-1 bg-white rounded-full" />
                          </div>
                          <span className="text-sm font-medium">{copyFeedback}をコピーしました</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// Keep the old component name for backward compatibility
export const LikedImageDetailModal = UnifiedImageDetailModal;
