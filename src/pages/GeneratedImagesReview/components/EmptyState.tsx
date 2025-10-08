import { ImageOff, SearchX } from 'lucide-react';

interface EmptyStateProps {
  readonly isFiltered: boolean;
}

export function EmptyState({ isFiltered }: EmptyStateProps) {
  if (isFiltered) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <SearchX className="mb-4 h-16 w-16 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">一致する画像が見つかりません</h3>
        <p className="text-sm text-muted-foreground">
          フィルター条件を調整してください
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <ImageOff className="mb-4 h-16 w-16 text-muted-foreground" />
      <h3 className="mb-2 text-lg font-semibold">生成された画像はありません</h3>
      <p className="text-sm text-muted-foreground">
        生成ページで新しい参考画像を作成してください
      </p>
    </div>
  );
}

