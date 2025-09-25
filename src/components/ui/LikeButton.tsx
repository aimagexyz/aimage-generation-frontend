import { Heart } from 'lucide-react';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

import { useLikedImages } from '@/hooks/useLikedImages';
import type { ImageSourceInfo } from '@/types/userPreferences';

import { Button } from './Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './Tooltip';

interface LikeButtonProps {
  imageUrl: string;
  // New props for source tracking (optional for backward compatibility)
  sourceInfo?: ImageSourceInfo;
  // Legacy props (for backward compatibility)
  source_type?: string;
  source_id?: string;
  image_path?: string;
  display_name?: string;

  size?: 'sm' | 'md' | 'lg' | 'icon';
  variant?: 'floating' | 'inline' | 'minimal';
  className?: string;
  disabled?: boolean;
  showTooltip?: boolean;
  children?: React.ReactNode;
}

/**
 * LikeButton Component
 *
 * SOLID Principles:
 * - Single Responsibility: Only handles image liking functionality
 * - Open/Closed: Extensible with different variants and sizes
 * - Interface Segregation: Clean props interface for different use cases
 *
 * DRY Principles:
 * - Reuses existing Button component and variants
 * - Reuses existing Tooltip component
 * - Follows established icon and styling patterns
 *
 * KISS Principles:
 * - Simple interface: pass imageUrl and optional source info
 * - Automatic state management with useLikedImages hook
 * - Consistent behavior across all usage contexts
 * - Backward compatible with existing usage
 */
const LikeButton = forwardRef<HTMLButtonElement, LikeButtonProps>(
  (
    {
      imageUrl,
      sourceInfo,
      source_type,
      source_id,
      image_path,
      display_name,
      size = 'md',
      variant = 'floating',
      className,
      disabled,
      showTooltip = true,
      children,
      ...props
    },
    ref,
  ) => {
    const { isLiked, toggleLike, isToggling } = useLikedImages();

    const liked = isLiked(imageUrl);
    const isDisabled = disabled || isToggling || !imageUrl;

    // Construct source info from props (new format takes precedence)
    const finalSourceInfo: ImageSourceInfo | undefined =
      sourceInfo ||
      (source_type && source_id && image_path
        ? {
            source_type,
            source_id,
            image_path,
            display_name,
          }
        : undefined);

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDisabled) {
        // Pass source info if available, otherwise rely on hook's fallback logic
        toggleLike(imageUrl, finalSourceInfo);
      }
    };

    // Size configurations following existing Button patterns
    const sizeConfig = {
      sm: { button: 'h-7 w-7 p-0', icon: 'h-3 w-3' },
      md: { button: 'h-8 w-8 p-0', icon: 'h-4 w-4' },
      lg: { button: 'h-10 w-10 p-0', icon: 'h-5 w-5' },
      icon: { button: 'h-8 w-8 p-0', icon: 'h-4 w-4' },
    };

    // Variant configurations for different usage contexts
    const variantConfig = {
      floating: {
        base: 'transition-all duration-300 hover:scale-110 shadow-lg backdrop-blur-sm',
        liked: 'bg-red-500/90 hover:bg-red-600/90 text-white border-red-500/50',
        unliked: 'bg-white/90 hover:bg-gray-50/90 text-gray-600 border-gray-200/50 hover:text-red-500',
      },
      inline: {
        base: 'transition-all duration-200',
        liked: 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200',
        unliked: 'bg-gray-50 hover:bg-gray-100 text-gray-500 border-gray-200 hover:text-red-500',
      },
      minimal: {
        base: 'transition-all duration-200 bg-transparent border-transparent',
        liked: 'text-red-500 hover:text-red-600',
        unliked: 'text-gray-400 hover:text-red-500',
      },
    };

    const config = variantConfig[variant];
    const sizeClasses = sizeConfig[size];

    const buttonClasses = twMerge(
      sizeClasses.button,
      config.base,
      liked ? config.liked : config.unliked,
      isDisabled && 'opacity-50 cursor-not-allowed',
      className,
    );

    const heartClasses = twMerge(
      sizeClasses.icon,
      'transition-all duration-200',
      liked ? 'fill-current' : '',
      isToggling && 'animate-pulse',
    );

    const baseTooltipText = liked ? 'お気に入りから削除' : 'お気に入りに追加';
    const legacyTooltipText = liked ? 'お気に入りから削除 (レガシーモード)' : 'お気に入りに追加 (レガシーモード)';
    const tooltipText = finalSourceInfo ? baseTooltipText : legacyTooltipText;

    const button = (
      <Button
        ref={ref}
        variant="outline"
        className={buttonClasses}
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={tooltipText}
        title={tooltipText}
        {...props}
      >
        <Heart className={heartClasses} />
        {children}
      </Button>
    );

    if (showTooltip && !children) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-sm">{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return button;
  },
);

LikeButton.displayName = 'LikeButton';

export { LikeButton };
export type { LikeButtonProps };
