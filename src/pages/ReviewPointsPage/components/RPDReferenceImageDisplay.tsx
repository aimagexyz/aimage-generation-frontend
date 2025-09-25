import { useState } from 'react';
import { LuImage, LuMaximize2 } from 'react-icons/lu';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAsset } from '@/hooks/useAsset';

interface ReferenceImageItemProps {
  s3Path: string;
  index: number;
  onImageClick: (imageUrl: string, index: number) => void;
}

function ReferenceImageItem({ s3Path, index, onImageClick }: ReferenceImageItemProps) {
  const { assetUrl, isAssetLoading } = useAsset(s3Path);

  if (isAssetLoading) {
    return <Skeleton className="w-full h-20 rounded-lg" />;
  }

  if (!assetUrl) {
    return (
      <div className="w-full h-20 bg-gray-100 rounded-lg flex items-center justify-center">
        <LuImage className="w-6 h-6 text-gray-400" />
        <span className="text-xs text-gray-500 ml-2">Failed to load</span>
      </div>
    );
  }

  return (
    <div className="relative group cursor-pointer" onClick={() => onImageClick(assetUrl, index)}>
      <img
        src={assetUrl}
        alt={`Reference image ${index + 1}`}
        className="w-full h-20 object-contain bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
        <LuMaximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

interface RPDReferenceImageDisplayProps {
  referenceImages: string[];
  title?: string;
}

export function RPDReferenceImageDisplay({
  referenceImages,
  title = 'Reference Images',
}: RPDReferenceImageDisplayProps): JSX.Element {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const handleImageClick = (_imageUrl: string, index: number) => {
    setSelectedImageIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedImageIndex(null);
  };

  const handlePrevImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      const newIndex = selectedImageIndex - 1;
      setSelectedImageIndex(newIndex);
    }
  };

  const handleNextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < referenceImages.length - 1) {
      const newIndex = selectedImageIndex + 1;
      setSelectedImageIndex(newIndex);
    }
  };

  if (!referenceImages || referenceImages.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
        <h4 className="mb-2 text-sm font-medium text-gray-700">{title}</h4>
        <div className="flex items-center justify-center h-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <div className="text-center">
            <LuImage className="w-6 h-6 text-gray-400 mx-auto mb-1" />
            <p className="text-xs text-gray-500">No reference images</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">{title}</h4>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {referenceImages.length} image{referenceImages.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
          {referenceImages.map((s3Path, index) => (
            <ReferenceImageItem
              key={`${s3Path}-${index}`}
              s3Path={s3Path}
              index={index}
              onImageClick={handleImageClick}
            />
          ))}
        </div>
      </div>

      {/* Image Modal */}
      <Dialog open={selectedImageIndex !== null} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-lg font-semibold">
              Reference Image {selectedImageIndex !== null ? selectedImageIndex + 1 : ''} of {referenceImages.length}
            </DialogTitle>
          </DialogHeader>

          <div className="relative" style={{ height: 'calc(90vh - 80px)' }}>
            {selectedImageIndex !== null && (
              <ReferenceImageModalContent
                s3Path={referenceImages[selectedImageIndex]}
                onPrev={selectedImageIndex > 0 ? handlePrevImage : undefined}
                onNext={selectedImageIndex < referenceImages.length - 1 ? handleNextImage : undefined}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ReferenceImageModalContentProps {
  s3Path: string;
  onPrev?: () => void;
  onNext?: () => void;
}

function ReferenceImageModalContent({ s3Path, onPrev, onNext }: ReferenceImageModalContentProps) {
  const { assetUrl, isAssetLoading } = useAsset(s3Path);

  if (isAssetLoading) {
    return (
      <div className="flex items-center justify-center h-96 p-4">
        <Skeleton className="w-full h-full rounded-lg" />
      </div>
    );
  }

  if (!assetUrl) {
    return (
      <div className="flex items-center justify-center h-96 p-4">
        <div className="text-center">
          <LuImage className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Failed to load image</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center p-4 w-full" style={{ height: '100%' }}>
      {/* Navigation buttons */}
      {onPrev && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 hover:bg-white shadow-sm"
        >
          ←
        </Button>
      )}
      {onNext && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 hover:bg-white shadow-sm"
        >
          →
        </Button>
      )}

      {/* Image */}
      <img src={assetUrl} alt="Reference image" className="max-w-full max-h-full object-contain rounded-lg" />
    </div>
  );
}
