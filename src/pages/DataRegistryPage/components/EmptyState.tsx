import { Image as ImageIcon } from 'lucide-react';

interface EmptyStateProps {
  show: boolean;
}

export function EmptyState({ show }: EmptyStateProps) {
  if (!show) {
    return null;
  }

  return (
    <div className="text-center py-24">
      <div className="relative mx-auto w-32 h-32 mb-8">
        <div className="absolute inset-0 bg-gray-200 dark:bg-slate-600 rounded-2xl shadow-inner"></div>
        <div className="absolute inset-4 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm">
          <ImageIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full border-4 border-white dark:border-slate-800 animate-pulse"></div>
      </div>
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300">まだ参考画像がありません</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
          上記のアップロードエリアから画像を追加してください。
          <br />
          <span className="text-sm">AI が類似画像を見つけるためのデータベースを構築します。</span>
        </p>
        <div className="mt-8">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 rounded-full border border-gray-200 dark:border-gray-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">アップロードを開始してください</span>
          </div>
        </div>
      </div>
    </div>
  );
}
