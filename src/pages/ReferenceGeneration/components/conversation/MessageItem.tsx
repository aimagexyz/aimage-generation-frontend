import { Bot, Image as ImageIcon, Tag, User } from 'lucide-react';
import { memo } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';

import { type Message } from '../../types';
import { AnimatedImage } from '../AnimatedImage';
import { MessageTimestamp } from './MessageTimestamp';
import { TagBadge } from './TagBadge';

function MessageItemComponent({
  message,
  getGridLayout,
  handleImageClick,
  showTimestamps,
  enableImageInteractions,
}: {
  message: Message;
  getGridLayout: (count: number) => string;
  handleImageClick: (imageUrl: string, message: Message, imageIndex: number) => void;
  showTimestamps: boolean;
  enableImageInteractions: boolean;
}) {
  return (
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
        <div className={`flex-1 min-w-0 max-w-6xl ${message.type === 'prompt' ? 'text-right' : 'text-left'}`}>
          {message.text && (
            <div
              className={`relative inline-block w-full rounded-xl px-4 py-3 shadow-md border backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.01] group/message ${
                message.type === 'prompt'
                  ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 border-blue-200 dark:border-blue-700 text-slate-800 dark:text-slate-100'
                  : 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100'
              }`}
            >
              <p className="text-sm font-medium leading-relaxed tracking-wide break-words whitespace-pre-wrap">
                {message.text}
              </p>
            </div>
          )}
          {message.images && (
            <div className="mt-4 space-y-3">
              <div className={`grid gap-3 ${getGridLayout(message.images?.length || 0)}`}>
                {message.images?.map((img, i) => (
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
                    </div>
                ))}
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
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export const MessageItem = memo(MessageItemComponent);
MessageItem.displayName = 'MessageItem';
