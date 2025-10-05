import { Button } from '@/components/ui/Button';

import { useImageGenContext } from '../contexts/ImageGenContext';

export function ChatPanelHeader() {
  const { conversation, handleClear } = useImageGenContext();

  return (
    <div className="border-b border-black/5 dark:border-white/5 px-6 py-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">参考図生成</h2>
        </div>
        {conversation.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {conversation.filter((m) => m.type === 'response' && m.images).length} セッション
            </span>
            <Button variant="outline" size="sm" onClick={() => handleClear()} className="h-7 text-xs">
              クリア
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
