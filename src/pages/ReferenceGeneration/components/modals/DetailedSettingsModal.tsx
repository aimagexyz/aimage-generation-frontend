import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';

export type DetailedSettings = {
  number_of_images: number;
  aspect_ratio: string;
  negative_prompt?: string;
};

type DetailedSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: DetailedSettings) => void;
  initialSettings: DetailedSettings;
};

// Available aspect ratios from backend
const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (正方形)' },
  { value: '16:9', label: '16:9 (ワイド)' },
  { value: '9:16', label: '9:16 (縦長)' },
  { value: '4:3', label: '4:3 (標準)' },
  { value: '3:4', label: '3:4 (縦標準)' },
];

export function DetailedSettingsModal({ isOpen, onClose, onSave, initialSettings }: DetailedSettingsModalProps) {
  const [settings, setSettings] = useState(initialSettings);

  useEffect(() => {
    if (isOpen) {
      setSettings(initialSettings);
    }
  }, [isOpen, initialSettings]);

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const handleNumberOfImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const number_of_images = Math.max(1, Math.min(4, Number(e.target.value)));
    setSettings((s) => ({ ...s, number_of_images }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <motion.div key="content" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <DialogHeader>
            <DialogTitle>詳細パラメータ設定</DialogTitle>
            <DialogDescription>画像の生成に関する詳細な設定を行います。</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Image Count */}
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="image-number-of-images" className="whitespace-nowrap">
                画像数 (1~4)
              </Label>
              <Input
                id="image-number-of-images"
                type="number"
                value={settings.number_of_images}
                onChange={handleNumberOfImagesChange}
                className="w-24"
                min="1"
                max="4"
              />
            </div>

            {/* Aspect Ratio */}
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="image-size">画像サイズ</Label>
              <Select
                value={settings.aspect_ratio}
                onValueChange={(aspect_ratio) => setSettings((s) => ({ ...s, aspect_ratio }))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a size" />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map((ratio) => (
                    <SelectItem key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Negative Prompt */}
            <div className="space-y-2">
              <Label htmlFor="negative-prompt">
                ネガティブプロンプト
                <span className="text-sm text-gray-500 font-normal ml-2">(避けたい要素を指定)</span>
              </Label>
              <TextArea
                id="negative-prompt"
                placeholder="例: blurry, low quality, ugly, deformed, bad anatomy"
                value={settings.negative_prompt || ''}
                onChange={(e) => setSettings((s) => ({ ...s, negative_prompt: e.target.value }))}
                className="min-h-[80px] resize-none"
                maxLength={500}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>画質向上や不適切な内容の回避に使用</span>
                <span>{(settings.negative_prompt || '').length}/500</span>
              </div>
            </div>

            {/* Quick Negative Prompt Suggestions */}
            <div className="space-y-2">
              <Label className="text-sm">クイック追加:</Label>
              <div className="flex flex-wrap gap-1">
                {['low quality', 'blurry', 'ugly', 'deformed', 'bad anatomy', 'text', 'watermark'].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const current = settings.negative_prompt || '';
                      const newNegative = current ? `${current}, ${suggestion}` : suggestion;
                      setSettings((s) => ({ ...s, negative_prompt: newNegative }));
                    }}
                  >
                    + {suggestion}
                  </Button>
                ))}
              </div>
            </div>

            {/* Settings Summary */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">設定プレビュー:</div>
              <div className="text-xs space-y-1 text-gray-600 dark:text-gray-300">
                <div>
                  🖼️ {settings.number_of_images}枚の画像を {settings.aspect_ratio} で生成
                </div>
                {settings.negative_prompt && (
                  <div className="line-clamp-2">🚫 除外要素: {settings.negative_prompt}</div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
