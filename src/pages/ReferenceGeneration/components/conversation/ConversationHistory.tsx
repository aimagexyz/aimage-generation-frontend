import { Bot, Loader2 } from 'lucide-react';
import { memo, useCallback, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { useImageGenContext } from '@/pages/ReferenceGeneration/contexts/ImageGenContext';

import { type ImageDetailData, type Message } from '../../types';
import { UnifiedImageDetailModal } from '../LikedImageDetailModal';
import { MessageItem } from './MessageItem';

function ConversationHistoryComponent() {
  const { conversation, isLoading } = useImageGenContext();
  const [selectedImageData, setSelectedImageData] = useState<ImageDetailData | null>(null);

  const enableImageInteractions = true; // or from context/props if configurable
  const showTimestamps = true; // or from context/props if configurable

  const convertConversationImageToDetail = useCallback(
    (imageUrl: string, message: Message, imageIndex: number): ImageDetailData => {
      const generatedRef = message.metadata?.generatedReferences?.[imageIndex];
      const timestamp = message.metadata?.timestamp
        ? new Date(message.metadata.timestamp).toISOString()
        : new Date().toISOString();

      return {
        image_url: imageUrl,
        image_path: generatedRef?.image_path,
        display_name: generatedRef ? `生成画像 ${imageIndex + 1}` : `会話画像 ${imageIndex + 1}`,
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
    // Responsive grid that uses more space, without max-width constraints
    switch (imageCount) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-2';
      case 3:
        return 'grid-cols-2 sm:grid-cols-3';
      case 4:
        return 'grid-cols-2 sm:grid-cols-4';
      default:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
    }
  }, []);

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
            <div className="px-4 py-3 border shadow-md rounded-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">画像を生成中...</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {enableImageInteractions && (
        <UnifiedImageDetailModal
          imageData={selectedImageData}
          isOpen={!!selectedImageData}
          onClose={() => setSelectedImageData(null)}
        />
      )}
    </>
  );
}

export const ConversationHistory = memo(ConversationHistoryComponent);
ConversationHistory.displayName = 'ConversationHistory';
