import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/Button';
import { isValidUrl } from '@/utils/utils';

export interface ImageViewModalState {
  // Export for use in TaskDetailPage state
  imageUrl: string;
  sourceText?: string;
}

interface ImagePreviewModalProps {
  modalState: ImageViewModalState | null; // If null, modal is not shown
  onClose: () => void;
}

export function ImagePreviewModal({ modalState, onClose }: ImagePreviewModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  if (!modalState || !isMounted) {
    return null;
  }

  const { imageUrl, sourceText } = modalState;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-preview-title"
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="image-preview-title" className="sr-only">
          Reference Image Preview
        </h3>
        <div className="relative flex items-center justify-center flex-grow min-h-0">
          <img
            src={imageUrl}
            alt="Reference Preview"
            className="max-w-full max-h-full object-contain"
            style={{ maxWidth: 'calc(100vw - 2rem)', maxHeight: 'calc(100vh - 8rem)' }}
          />
        </div>
        <div className="bg-card/95 backdrop-blur-sm rounded-lg shadow-xl p-4 mt-2">
          {sourceText && (
            <div className="text-sm text-muted-foreground mb-3">
              <strong className="text-foreground">来源:</strong>
              {isValidUrl(sourceText) ? (
                <a
                  href={sourceText}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 underline hover:text-primary break-all"
                >
                  {sourceText}
                </a>
              ) : (
                <span className="ml-1 break-words">{sourceText}</span>
              )}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={onClose} className="w-full">
            关闭
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
