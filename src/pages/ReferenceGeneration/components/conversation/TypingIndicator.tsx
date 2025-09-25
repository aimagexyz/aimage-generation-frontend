import { memo } from 'react';

function TypingIndicatorComponent() {
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
}

export const TypingIndicator = memo(TypingIndicatorComponent);
TypingIndicator.displayName = 'TypingIndicator';
