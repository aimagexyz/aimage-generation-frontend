interface PageChangeLoadingIndicatorProps {
  show: boolean;
}

export function PageChangeLoadingIndicator({ show }: PageChangeLoadingIndicatorProps) {
  if (!show) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 z-10">
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">読み込み中...</span>
        </div>
      </div>
    </div>
  );
}
