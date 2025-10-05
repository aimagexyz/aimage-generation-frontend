import { Clock } from 'lucide-react';
import { memo } from 'react';

function MessageTimestampComponent({ timestamp }: { timestamp?: string }) {
  return (
    <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
      <Clock className="w-3 h-3" />
      <span>{timestamp || new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  );
}

export const MessageTimestamp = memo(MessageTimestampComponent);
MessageTimestamp.displayName = 'MessageTimestamp';
