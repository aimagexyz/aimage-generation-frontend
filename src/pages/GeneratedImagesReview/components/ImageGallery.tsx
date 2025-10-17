import { Skeleton } from '@/components/ui/Skeleton';

import { GeneratedReferenceResponse } from '../hooks/useGeneratedImages';
import { EmptyState } from './EmptyState';
import { ImageCard } from './ImageCard';

interface ImageGalleryProps {
  readonly images: GeneratedReferenceResponse[];
  readonly isLoading: boolean;
  readonly isFiltered: boolean;
  readonly onImageClick: (image: GeneratedReferenceResponse) => void;
}

const SKELETON_IDS = Array.from({ length: 10 }, () => crypto.randomUUID());

export function ImageGallery({ images, isLoading, isFiltered, onImageClick }: ImageGalleryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {SKELETON_IDS.map((id) => (
          <div key={id} className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return <EmptyState isFiltered={isFiltered} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {images.map((image) => (
        <ImageCard key={image.id} image={image} onClick={() => onImageClick(image)} />
      ))}
    </div>
  );
}
