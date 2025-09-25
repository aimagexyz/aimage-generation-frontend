import { Loader2, Play, X } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import type { SelectionBarProps } from '@/types/UnifiedReview';

export function SelectionBar({
  selectedItems,
  onRemove,
  onClear,
  onStartReview,
  isProcessing = false,
  mode,
  onModeChange,
}: SelectionBarProps) {
  const reviewSetCount = selectedItems.filter((item) => item.type === 'review_set').length;
  const rpdCount = selectedItems.filter((item) => item.type === 'rpd').length;
  const totalCount = selectedItems.length;

  const isQualityMode = mode === 'quality';

  const handleModeChange = (checked: boolean) => {
    const newMode = checked ? 'quality' : 'speed';
    onModeChange(newMode);
  };

  return (
    <div className="flex-shrink-0 border rounded-lg p-4 bg-background">
      {/* Mode Selection */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-4">
        <div className="space-y-1">
          <Label className="text-sm font-medium text-foreground">監修モード</Label>
          <p className="text-xs text-muted-foreground">
            {isQualityMode ? 'より丁寧に監修を実行' : '一般的な監修タスクに対応'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-medium transition-colors ${!isQualityMode ? 'text-emerald-600' : 'text-muted-foreground'}`}
          >
            デフォルト
          </span>
          <Switch
            checked={isQualityMode}
            onCheckedChange={handleModeChange}
            disabled={isProcessing}
            aria-label="高品質モードの切り替え"
          />
          <span
            className={`text-sm font-medium transition-colors ${isQualityMode ? 'text-blue-600' : 'text-muted-foreground'}`}
          >
            高品質
          </span>
        </div>
      </div>

      {/* Selection Display */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-foreground">選択中 ({totalCount}項目)</Label>
          {totalCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={isProcessing}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              すべてクリア
            </Button>
          )}
        </div>

        {/* Selected Items */}
        {totalCount > 0 ? (
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {selectedItems.map((item) => (
              <Badge
                key={`${item.type}-${item.id}`}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1 text-xs max-w-xs"
              >
                <span className="text-xs opacity-70">{item.type === 'review_set' ? '📦' : '📝'}</span>
                <span className="truncate">{item.name}</span>
                {item.isRecommended && <span className="text-xs opacity-70">⭐</span>}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                  }}
                />
              </Badge>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
            まだ項目が選択されていません
          </div>
        )}

        {/* Selection Summary */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {reviewSetCount > 0 && `${reviewSetCount}セット`}
              {reviewSetCount > 0 && rpdCount > 0 && ' + '}
              {rpdCount > 0 && `${rpdCount}個別`}
            </span>
          </div>
        )}

        {/* Start Review Button */}
        {totalCount > 0 && (
          <Button onClick={onStartReview} disabled={isProcessing} className="w-full h-10" size="lg">
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                実行中...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                監修開始 ({totalCount}項目)
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
