import clsx from 'clsx';
import { useState } from 'react';

import { LazyImage } from '@/components/ui/LazyImage';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAsset } from '@/hooks/useAsset';
import { useTaskThumbnails } from '@/hooks/useTaskThumbnails';
import { ImagePreviewModal, type ImageViewModalState } from '@/pages/Tasks/TaskDetail/components/ImagePreviewModal';

interface ThumbnailImageProps {
  s3Path: string;
  altText: string;
  onImageClick: (imageUrl: string) => void;
}

function ThumbnailImage({ s3Path, altText, onImageClick }: Readonly<ThumbnailImageProps>) {
  const { assetUrl, isAssetLoading } = useAsset(s3Path);

  const handleClick = () => {
    if (assetUrl) {
      onImageClick(assetUrl);
    }
  };

  if (isAssetLoading) {
    return <Skeleton className="w-12 h-12 rounded" />;
  }

  if (assetUrl) {
    return (
      <LazyImage
        src={assetUrl}
        alt={altText}
        className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity border border-border"
        onClick={handleClick}
      />
    );
  }

  return null;
}

interface TaskThumbnailPreviewProps {
  taskId: string;
}

export function TaskThumbnailPreview({ taskId }: Readonly<TaskThumbnailPreviewProps>) {
  const [imageViewModalState, setImageViewModalState] = useState<ImageViewModalState | null>(null);

  const { data: thumbnailsResponse, isLoading, isError } = useTaskThumbnails(taskId, { limit: 3 });

  const handleImageClick = (imageUrl: string) => {
    setImageViewModalState({ imageUrl, sourceText: '画像プレビュー' });
  };

  const handleCloseImageModal = () => {
    setImageViewModalState(null);
  };

  if (isLoading) {
    return (
      <div className="flex gap-1 flex-wrap max-w-[9.5rem]">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="w-12 h-12 rounded flex-shrink-0" />
        ))}
      </div>
    );
  }

  if (isError || !thumbnailsResponse?.thumbnails) {
    return <div className="text-xs text-muted-foreground">読み込み失敗</div>;
  }

  const { thumbnails } = thumbnailsResponse;

  if (thumbnails.length === 0) {
    return <div className="text-xs text-muted-foreground">画像なし</div>;
  }

  // Calculate optimal width based on thumbnail count
  const totalItems = thumbnails.length;
  let containerWidth = ''; // No fixed width for 1 item, let it auto-size
  if (totalItems === 2) {
    containerWidth = 'w-[6.25rem]'; // 2 * 3rem + 1 * 0.25rem gap
  } else if (totalItems >= 3) {
    containerWidth = 'w-[9.5rem]'; // 3 * 3rem + 2 * 0.25rem gap
  }

  return (
    <>
      <div
        className={clsx(
          'flex gap-1 items-center flex-wrap',
          containerWidth, // Will be empty string for 1 item, allowing auto-sizing
          // Ensure thumbnails don't exceed 3 per row
          'max-w-[9.5rem]',
        )}
      >
        {thumbnails.map((thumbnail) => (
          <ThumbnailImage
            key={thumbnail.subtask_id}
            s3Path={thumbnail.compressed_s3_path || thumbnail.original_s3_path}
            altText={thumbnail.subtask_name || 'サブタスク画像'}
            onImageClick={handleImageClick}
          />
        ))}
      </div>
      {imageViewModalState?.imageUrl && (
        <ImagePreviewModal modalState={imageViewModalState} onClose={handleCloseImageModal} />
      )}
    </>
  );
}
