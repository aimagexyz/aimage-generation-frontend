import type { MouseEvent } from 'react';
import { LuImage } from 'react-icons/lu';

import { Skeleton } from '@/components/ui/Skeleton';
import { useAsset } from '@/hooks/useAsset';

export interface CitationImageThumbnailProps {
  imageUrl: string; // 现在这个是S3路径
  sourceText?: string;
  index: number;
  onViewImageCitation: (imageUrl: string, sourceText?: string) => void;
}

export function CitationImageThumbnail({
  imageUrl: s3Path,
  sourceText,
  index,
  onViewImageCitation,
}: CitationImageThumbnailProps) {
  const { assetUrl, isAssetLoading } = useAsset(s3Path);

  // 加载状态
  if (isAssetLoading) {
    return (
      <div className="flex-shrink-0 w-24 h-24 rounded cursor-pointer">
        <Skeleton className="w-full h-full rounded" />
      </div>
    );
  }

  // 加载失败状态
  if (!assetUrl) {
    return (
      <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded border border-border/40 flex items-center justify-center cursor-pointer">
        <div className="text-center">
          <LuImage className="w-6 h-6 text-gray-400 mx-auto mb-1" />
          <span className="text-xs text-gray-500">加载失败</span>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onViewImageCitation(assetUrl, sourceText); // 使用转换后的URL
      }}
      className="flex-shrink-0 block w-24 h-24 text-left transition-opacity rounded cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
      aria-label={`View larger reference image ${index + 1}`}
    >
      <img
        src={assetUrl}
        alt={`参考画像 ${index + 1}`}
        className="object-cover w-full h-full border rounded shadow-sm border-border/40"
      />
    </button>
  );
}
