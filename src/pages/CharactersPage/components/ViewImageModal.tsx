import { Download, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

import type { CharacterDetail } from '@/api/charactersService';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

interface ViewImageModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedCharacter: CharacterDetail | null;
  selectedCharacterImageUrl: string;
  imageZoom: number;
  setImageZoom: (zoom: number | ((prevZoom: number) => number)) => void;
  imageRotation: number;
  setImageRotation: (rotation: number | ((prevRotation: number) => number)) => void;
  handleDownloadImage: () => void;
  hasImage: (character: CharacterDetail) => boolean;
}

export function ViewImageModal({
  isOpen,
  onOpenChange,
  selectedCharacter,
  selectedCharacterImageUrl,
  imageZoom,
  setImageZoom,
  imageRotation,
  setImageRotation,
  handleDownloadImage,
  hasImage,
}: ViewImageModalProps): JSX.Element {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <span>{selectedCharacter?.name} - 画像</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImageZoom((prev) => Math.max(0.5, prev - 0.25))}
                disabled={imageZoom <= 0.5}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600 min-w-[60px] text-center">{Math.round(imageZoom * 100)}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImageZoom((prev) => Math.min(3, prev + 0.25))}
                disabled={imageZoom >= 3}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImageRotation((prev) => (prev + 90) % 360)}>
                <RotateCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadImage}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center p-6 overflow-auto max-h-[70vh]">
          {selectedCharacter && hasImage(selectedCharacter) && (
            <img
              src={selectedCharacter.image_url || selectedCharacterImageUrl}
              alt={selectedCharacter.name}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('/api/v1/characters/')) {
                  target.src = selectedCharacterImageUrl;
                }
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
