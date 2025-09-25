import { Bot, Check, Clock, Copy, Image as ImageIcon, Loader2, RefreshCw, Tag, User } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LikeButton } from '@/components/ui/LikeButton';
import { toast } from '@/components/ui/use-toast';
import { inferSourceInfoFromConversation } from '@/utils/imageSourceUtils';

import { useImageGenContext } from '../contexts/ImageGenContext';
import { type ImageDetailData, type Message } from '../types';
import { AnimatedImage } from './AnimatedImage';
import { UnifiedImageDetailModal } from './LikedImageDetailModal';

/**
 * ConversationLayout Component
 *
 * Responsible for:
 * - Layout management (flex, padding, overflow)
 * - Scrolling behavior
 * - Empty state handling
 * - Accessibility attributes
 *
 * Following SOLID principles:
 * - Single Responsibility: Only handles layout concerns
 * - Open/Closed: Extensible through configuration props
 * - Interface Segregation: Minimal, focused interface
 */

type ScrollBehavior = 'auto' | 'smooth';
type Size = 'sm' | 'md' | 'lg';

interface ConversationLayoutProps {
  children?: React.ReactNode; // No longer the primary content source, but kept for flexibility
  isEmpty?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
  scrollBehavior?: ScrollBehavior;
  padding?: Size;
  spacing?: Size;
  autoScroll?: boolean;
  scrollDependencies?: readonly unknown[];
  ariaLabel?: string;
  role?: string;

  // Merged from ConversationRenderer
  conversation: Message[];
  isLoading: boolean;
  isTyping?: boolean;
  retryCount?: number;
  showTimestamps?: boolean;
  enableImageInteractions?: boolean;
}

/**
 * Build layout classes based on configuration
 * Following DRY principle - centralized class generation
 */
const buildLayoutClasses = (config: {
  padding?: Size;
  spacing?: Size;
  scrollBehavior?: ScrollBehavior;
  className?: string;
}) => {
  const { padding = 'lg', spacing = 'lg', scrollBehavior = 'smooth', className = '' } = config;

  const paddingClasses = {
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  };

  const spacingClasses = {
    sm: 'space-y-4',
    md: 'space-y-6',
    lg: 'space-y-8',
  };

  const scrollClass = scrollBehavior === 'smooth' ? 'scroll-smooth' : '';

  return `flex-1 ${paddingClasses[padding]} ${spacingClasses[spacing]} overflow-y-auto ${scrollClass} ${className}`.trim();
};

const MessageTimestamp = memo(({ timestamp, className }: { timestamp?: string; className?: string }) => {
  return (
    <div className={`flex items-center gap-1 text-xs ${className}`}>
      <Clock className="w-3 h-3" />
      <span>{timestamp || new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  );
});
MessageTimestamp.displayName = 'MessageTimestamp';

const TypingIndicator = memo(() => {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-white border shadow-sm dark:bg-slate-800 rounded-2xl border-slate-200 dark:border-slate-700">
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
      </div>
      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">AIが考えています...</span>
    </div>
  );
});
TypingIndicator.displayName = 'TypingIndicator';

const CopyButton = memo(({ text, size = 'sm' }: { text: string; size?: 'sm' | 'xs' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        toast({
          title: 'コピーしました',
          description: 'テキストがクリップボードにコピーされました',
          duration: 2000,
        });
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        toast({
          title: 'エラー',
          description: 'コピーに失敗しました',
          variant: 'destructive',
          duration: 2000,
        });
      });
  }, [text]);

  return (
    <Button
      size={size}
      variant="ghost"
      className={`h-8 w-8 p-0 transition-all duration-200 ${
        copied ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
      onClick={handleCopy}
      aria-label="テキストをコピー"
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </Button>
  );
});
CopyButton.displayName = 'CopyButton';

const RegenerateButton = memo(
  ({
    messageId,
    onRegenerate,
    size = 'sm',
  }: {
    messageId: number;
    onRegenerate: (messageId: number) => Promise<void>;
    size?: 'sm' | 'xs';
  }) => {
    const [isRegenerating, setIsRegenerating] = useState(false);

    const handleRegenerate = useCallback(async () => {
      setIsRegenerating(true);
      try {
        await onRegenerate(messageId);
        toast({
          title: '再生成中',
          description: 'プロンプトから画像を再生成しています',
          duration: 2000,
        });
      } catch (error) {
        console.error('Regeneration failed:', error);
        toast({
          title: 'エラー',
          description: '再生成に失敗しました',
          variant: 'destructive',
          duration: 2000,
        });
      } finally {
        setIsRegenerating(false);
      }
    }, [messageId, onRegenerate]);

    return (
      <Button
        size={size}
        variant="ghost"
        className={`h-8 w-8 p-0 transition-all duration-200 ${
          isRegenerating
            ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
            : 'hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
        onClick={() => void handleRegenerate()}
        disabled={isRegenerating}
        aria-label="プロンプトを再生成"
      >
        <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
      </Button>
    );
  },
);
RegenerateButton.displayName = 'RegenerateButton';

const TagBadge = memo(
  ({
    icon: Icon,
    label,
    value,
    variant = 'secondary',
    description,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    variant?: 'secondary' | 'outline';
    description?: string;
  }) => {
    return (
      <div className="relative group">
        <Badge
          variant={variant}
          className={`
          flex items-center gap-1.5 px-3 py-1.5 font-medium transition-all duration-200 hover:scale-105
          ${
            variant === 'secondary'
              ? 'bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 shadow-sm'
              : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm'
          }
        `}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">{label}</span>
          <span className="text-xs font-bold">{value}</span>
        </Badge>
        {description && (
          <div className="absolute z-10 px-2 py-1 mb-2 text-xs text-white transition-opacity duration-200 transform -translate-x-1/2 rounded opacity-0 bottom-full left-1/2 bg-slate-900 group-hover:opacity-100 whitespace-nowrap">
            {description}
          </div>
        )}
      </div>
    );
  },
);
TagBadge.displayName = 'TagBadge';

const MessageItem = memo(
  ({
    message,
    getGridLayout,
    handleImageClick,
    showTimestamps,
    enableImageInteractions,
    onRegenerate,
  }: {
    message: Message;
    getGridLayout: (count: number) => string;
    handleImageClick: (imageUrl: string, message: Message, imageIndex: number) => void;
    showTimestamps: boolean;
    enableImageInteractions: boolean;
    onRegenerate: (messageId: number) => Promise<void>;
  }) => (
    <article
      key={message.id}
      className={`flex flex-col gap-2 group ${message.type === 'prompt' ? 'items-end' : 'items-start'}`}
      role="article"
      aria-label={`${message.type === 'prompt' ? 'ユーザー' : 'AI'}のメッセージ`}
    >
      <div
        className={`flex items-start gap-3 ${message.type === 'prompt' ? 'flex-row-reverse' : 'flex-row'} max-w-full`}
      >
        <div className="relative flex-shrink-0 transition-transform duration-150 hover:scale-105">
          <Avatar
            className={`h-10 w-10 ring-2 shadow-md transition-all duration-200 ${
              message.type === 'prompt'
                ? 'ring-blue-200 dark:ring-blue-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800'
                : 'ring-purple-200 dark:ring-purple-800 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800'
            }`}
          >
            <AvatarImage src={message.type === 'prompt' ? '/user-avatar.png' : '/bot-avatar.png'} />
            <AvatarFallback
              className={`font-bold ${
                message.type === 'prompt'
                  ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 dark:from-blue-800 dark:to-blue-700 dark:text-blue-200'
                  : 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 dark:from-purple-800 dark:to-purple-700 dark:text-purple-200'
              }`}
            >
              {message.type === 'prompt' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </AvatarFallback>
          </Avatar>
          {message.type === 'response' && (
            <div className="absolute w-3 h-3 bg-green-500 border-2 border-white rounded-full -bottom-0.5 -right-0.5 dark:border-slate-800" />
          )}
        </div>
        <div className={`flex-1 min-w-0 max-w-3xl ${message.type === 'prompt' ? 'text-right' : 'text-left'}`}>
          {message.text && (
            <div
              className={`relative inline-block rounded-2xl px-4 py-3 shadow-sm transition-shadow duration-200 hover:shadow-md group/message ${
                message.type === 'prompt'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              <p className="text-sm leading-relaxed font-medium">{message.text}</p>
              {showTimestamps && message.type === 'prompt' && (
                <div className="flex items-center justify-between mt-2 gap-2">
                  <MessageTimestamp
                    timestamp={
                      message.metadata?.timestamp
                        ? new Date(message.metadata.timestamp).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : undefined
                    }
                    className="text-blue-200"
                  />
                  <div className="opacity-0 group-hover/message:opacity-100 transition-opacity duration-200">
                    <RegenerateButton messageId={message.id} onRegenerate={onRegenerate} size="xs" />
                  </div>
                </div>
              )}
            </div>
          )}
          {message.images && (
            <div className="mt-4 space-y-3">
              <div className={`grid gap-3 ${getGridLayout(message.images?.length || 0)}`}>
                {message.images?.map((img, i) => {
                  const sourceInfo = inferSourceInfoFromConversation(img, message.id, message.metadata);
                  return (
                    <div
                      key={i}
                      className={`relative overflow-hidden transition-all duration-200 shadow-md group/image rounded-xl hover:shadow-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 ${
                        enableImageInteractions ? 'cursor-pointer hover:scale-105' : ''
                      }`}
                      onClick={() => handleImageClick(img, message, i)}
                    >
                      <AnimatedImage src={img} alt={`Generated image ${i + 1}`} aspectRatio={message.aspect_ratio} />
                      {enableImageInteractions && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/image:opacity-100 transition-all duration-200 rounded-xl z-10 flex items-center justify-center">
                          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 shadow-lg">
                            詳細表示
                          </div>
                        </div>
                      )}
                      {enableImageInteractions && (
                        <div className="absolute top-2 right-2 z-20" onClick={(e) => e.stopPropagation()}>
                          <LikeButton
                            imageUrl={img}
                            sourceInfo={sourceInfo || undefined}
                            size="sm"
                            variant="floating"
                            className="h-7 w-7 shadow-lg backdrop-blur-sm"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {showTimestamps && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <TagBadge icon={ImageIcon} label="生成枚数" value={`${message.images?.length || 0}枚`} />
                    <TagBadge icon={Tag} label="アスペクト比" value={message.aspect_ratio || '1:1'} variant="outline" />
                    <MessageTimestamp
                      timestamp={
                        message.metadata?.timestamp
                          ? new Date(message.metadata.timestamp).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : undefined
                      }
                      className="text-slate-400 dark:text-slate-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  ),
);
MessageItem.displayName = 'MessageItem';

/**
 * ConversationLayout Component
 *
 * Pure layout component that handles scrolling, spacing, and empty states
 * without knowing anything about the conversation business logic
 */
function ConversationLayoutComponent({
  isEmpty = false,
  emptyState,
  className = '',
  scrollBehavior = 'smooth',
  padding = 'lg',
  spacing = 'lg',
  autoScroll = true,
  scrollDependencies = [],
  ariaLabel = '会話履歴',
  role = 'log',
  // Merged props
  conversation,
  isLoading,
  isTyping = false,
  retryCount = 0,
  showTimestamps = true,
  enableImageInteractions = true,
}: ConversationLayoutProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedImageData, setSelectedImageData] = useState<ImageDetailData | null>(null);

  // Memoize layout classes to prevent unnecessary recalculations
  const layoutClasses = useMemo(
    () => buildLayoutClasses({ padding, spacing, scrollBehavior, className }),
    [padding, spacing, scrollBehavior, className],
  );

  // Auto-scroll logic - only when autoScroll is enabled
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [autoScroll, scrollDependencies]);

  const convertConversationImageToDetail = useCallback(
    (imageUrl: string, message: Message, imageIndex: number): ImageDetailData => {
      const generatedRef = message.metadata?.generatedReferences?.[imageIndex];
      const timestamp = message.metadata?.timestamp
        ? new Date(message.metadata.timestamp).toISOString()
        : new Date().toISOString();

      return {
        image_url: imageUrl,
        image_path: generatedRef?.image_path,
        display_name:
          generatedRef?.base_prompt || (generatedRef ? `生成画像 ${imageIndex + 1}` : `会話画像 ${imageIndex + 1}`),
        source_type: 'conversation',
        source_id: generatedRef?.id,
        created_at: timestamp,
        base_prompt: generatedRef?.base_prompt,
        enhanced_prompt: generatedRef?.enhanced_prompt,
        generation_time: message.metadata?.generationTime,
        settings: message.metadata?.settings,
      };
    },
    [],
  );

  const handleImageClick = useCallback(
    (imageUrl: string, message: Message, imageIndex: number) => {
      if (enableImageInteractions) {
        const imageDetailData = convertConversationImageToDetail(imageUrl, message, imageIndex);
        setSelectedImageData(imageDetailData);
      }
    },
    [convertConversationImageToDetail, enableImageInteractions],
  );

  const getGridLayout = useCallback((imageCount: number): string => {
    switch (imageCount) {
      case 1:
        return 'grid-cols-1 max-w-md';
      case 2:
        return 'grid-cols-2 max-w-2xl';
      case 3:
        return 'grid-cols-2 md:grid-cols-3 max-w-3xl';
      case 4:
        return 'grid-cols-2 md:grid-cols-2 lg:grid-cols-4 max-w-4xl';
      default:
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-5xl';
    }
  }, []);

  const { handleRegenerate } = useImageGenContext();

  const renderContent = () => {
    if (isEmpty) {
      return <>{emptyState}</>;
    }
    return (
      <>
        {conversation.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            getGridLayout={getGridLayout}
            handleImageClick={handleImageClick}
            showTimestamps={showTimestamps}
            enableImageInteractions={enableImageInteractions}
            onRegenerate={handleRegenerate}
          />
        ))}
        {isLoading && (
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Avatar className="w-10 h-10 shadow-md ring-2 ring-purple-200 dark:ring-purple-800 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
                  <AvatarImage src="/bot-avatar.png" />
                  <AvatarFallback className="font-bold text-purple-700 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-700 dark:text-purple-200">
                    <Bot className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="px-4 py-3 shadow-sm rounded-2xl bg-gray-100 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-slate-100">画像を生成中...</span>
                  {retryCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      試行 {retryCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {isTyping && !isLoading && (
          <div className="flex flex-col items-start gap-2">
            <Avatar className="w-10 h-10 shadow-md ring-2 ring-purple-200 dark:ring-purple-800 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
              <AvatarImage src="/bot-avatar.png" />
              <AvatarFallback className="font-bold text-purple-700 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-700 dark:text-purple-200">
                <Bot className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            <TypingIndicator />
          </div>
        )}
      </>
    );
  };

  return (
    <div ref={scrollRef} className={layoutClasses} role={role} aria-label={ariaLabel} tabIndex={0}>
      {renderContent()}
      {enableImageInteractions && (
        <UnifiedImageDetailModal
          imageData={selectedImageData}
          isOpen={!!selectedImageData}
          onClose={() => setSelectedImageData(null)}
        />
      )}
    </div>
  );
}

/**
 * Memoized export for performance optimization
 * Following React best practices
 */
export const ConversationLayout = memo(ConversationLayoutComponent);
ConversationLayout.displayName = 'ConversationLayout';

/**
 * Type exports for external usage
 */
export type { ConversationLayoutProps };
