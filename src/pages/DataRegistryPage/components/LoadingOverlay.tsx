import { Image as ImageIcon } from 'lucide-react';

interface LoadingOverlayProps {
  show: boolean;
}

export function LoadingOverlay({ show }: LoadingOverlayProps) {
  if (!show) {
    return null;
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl">
      <div className="flex flex-col items-center space-y-6 p-12 bg-white/95 dark:bg-slate-800/95 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-600 border-t-transparent absolute inset-0"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-bold text-gray-700 dark:text-gray-300">画像を読み込み中...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">最適化された表示を準備しています</p>
        </div>
      </div>
    </div>
  );
}
