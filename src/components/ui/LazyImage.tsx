import { useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/utils';

import { Skeleton } from './Skeleton';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  skeletonClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
  imageClassName?: string; // allows overriding image object-fit, keep KISS/DRY
}

export function LazyImage({
  src,
  alt,
  fallbackSrc,
  className,
  skeletonClassName,
  onLoad,
  onError,
  imageClassName,
  ...props
}: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1,
      },
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  return (
    <div className={cn('relative overflow-hidden', className)} ref={imgRef}>
      {/* Skeleton placeholder */}
      {isLoading && (
        <div className={cn('absolute inset-0 w-full h-full', skeletonClassName)}>
          <Skeleton className="absolute inset-0 w-full h-full" />
          {/* shimmering placeholder lines for friendlier UX */}
          <div className="absolute bottom-3 left-3 right-3 space-y-2 opacity-60">
            <Skeleton className="h-3 w-2/3 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
        </div>
      )}

      {/* Actual image */}
      {isInView && (
        <img
          src={hasError && fallbackSrc ? fallbackSrc : src}
          alt={alt}
          className={cn(
            'w-full h-full transition-opacity duration-300',
            imageClassName ? imageClassName : 'object-cover',
            isLoading ? 'opacity-0' : 'opacity-100',
          )}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}

      {/* Error state */}
      {hasError && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-400">
            <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs">画像を読み込めませんでした</p>
          </div>
        </div>
      )}
    </div>
  );
}
