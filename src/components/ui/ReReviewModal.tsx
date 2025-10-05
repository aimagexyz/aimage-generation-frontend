import { Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useState } from 'react';

import type { CharacterDetail } from '@/api/charactersService';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { ReviewSetSelector } from '@/components/ui/ReviewSetSelector';
import { Switch } from '@/components/ui/Switch';
import type { AiReviewMode } from '@/types/aiReview';
import type { ReviewSelection } from '@/types/ReviewSet';

interface ReReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selection: ReviewSelection) => Promise<void>;
  projectId: string;
  isProcessing?: boolean;
  selectedCharacter?: CharacterDetail | null;
}

export function ReReviewModal({
  isOpen,
  onClose,
  onConfirm,
  projectId,
  isProcessing = false,
  selectedCharacter,
}: ReReviewModalProps) {
  const [selectedRpdIds, setSelectedRpdIds] = useState<string[]>([]);
  const [selectedReviewSetIds, setSelectedReviewSetIds] = useState<string[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);

  // Add mode selection state with localStorage persistence
  // Use boolean for switch: false = speed (default), true = quality (high quality)
  const [isQualityMode, setIsQualityMode] = useState<boolean>(() => {
    try {
      const savedMode = localStorage.getItem('ai-review-mode');
      return savedMode === 'quality'; // Default to false (speed) if not quality
    } catch {
      return true; // Default to quality mode
    }
  });

  // Handle mode change and save to localStorage
  const handleModeChange = useCallback((checked: boolean) => {
    setIsQualityMode(checked);
    const mode: AiReviewMode = checked ? 'quality' : 'speed';
    try {
      localStorage.setItem('ai-review-mode', mode);
    } catch (error) {
      console.warn('Failed to save AI review mode to localStorage:', error);
    }
  }, []);

  // Handle confirm action
  const handleConfirm = useCallback(async () => {
    if (isConfirming || isProcessing) {
      return;
    }

    try {
      setIsConfirming(true);
      const selectedMode: AiReviewMode = isQualityMode ? 'quality' : 'speed';
      await onConfirm({
        rpdIds: selectedRpdIds,
        reviewSetIds: selectedReviewSetIds,
        mode: selectedMode, // Include selected mode
      });
      // Modal will be closed by parent component after successful confirmation
    } catch (error) {
      console.error('Re-review confirmation failed:', error);
      // Keep modal open on error so user can retry
    } finally {
      setIsConfirming(false);
    }
  }, [selectedRpdIds, selectedReviewSetIds, isQualityMode, onConfirm, isConfirming, isProcessing]);

  // Handle modal close - reset state when closing
  const handleClose = useCallback(() => {
    if (isConfirming || isProcessing) {
      return; // Prevent closing during processing
    }
    setSelectedRpdIds([]);
    setSelectedReviewSetIds([]);
    // Don't reset mode - keep it persistent across modal opens
    onClose();
  }, [onClose, isConfirming, isProcessing]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey && !isConfirming && !isProcessing) {
        event.preventDefault();
        void handleConfirm();
      }
    },
    [handleConfirm, isConfirming, isProcessing],
  );

  const isDisabled = isConfirming || isProcessing;
  const totalSelections = selectedRpdIds.length + selectedReviewSetIds.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto"
        onKeyDown={handleKeyDown}
        aria-describedby="re-review-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            再監修設定
          </DialogTitle>
          <DialogDescription id="re-review-description">
            レビューセットまたは個別のレビューポイントを選択して再監修を実行できます。
            何も選択しない場合は、全てのレビューポイントで再監修を行います。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* AI Review Mode Selection - Compact Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
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
                disabled={isDisabled}
                aria-label="高品質モードの切り替え"
              />
              <span
                className={`text-sm font-medium transition-colors ${isQualityMode ? 'text-blue-600' : 'text-muted-foreground'}`}
              >
                高品質
              </span>
            </div>
          </div>

          {/* ReviewSet and RPD Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">レビュー対象選択 (オプション)</label>
            <ReviewSetSelector
              projectId={projectId}
              selectedRpdIds={selectedRpdIds}
              onRpdSelectionChange={setSelectedRpdIds}
              selectedReviewSetIds={selectedReviewSetIds}
              onReviewSetSelectionChange={setSelectedReviewSetIds}
              disabled={isDisabled}
              className="w-full"
              selectedCharacter={selectedCharacter}
            />
            <p className="text-xs text-muted-foreground">
              {totalSelections === 0
                ? '選択なし：全てのレビューポイントで再監修を実行'
                : `選択中：${selectedReviewSetIds.length}セット + ${selectedRpdIds.length}個別`}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isDisabled}>
            キャンセル
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={isDisabled} className="min-w-[120px]">
            {isConfirming || isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                実行中...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                再監修実行
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
