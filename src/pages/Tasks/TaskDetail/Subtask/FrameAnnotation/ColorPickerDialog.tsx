import { useEffect, useState } from 'react';
import { LuDroplet, LuPlus, LuX } from 'react-icons/lu';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { TextArea } from '@/components/ui/TextArea';

import { useFrameAnnotation } from './useFrameAnnotation';

// EyeDropper API type definition - simplified for compatibility

interface ColorInfo {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
}

type Props = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (colors: string[], text: string) => void;
  readonly initialColors?: string[];
  readonly setShowColorDialog: (show: boolean) => void;
};

// Color conversion utilities
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max === min) {
    // h and s are already 0, no need to assign
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const getColorInfo = (hex: string): ColorInfo => {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return { hex, rgb, hsl };
};

export function ColorPickerDialog(props: Props) {
  const { isOpen, onClose, onSave, initialColors = [], setShowColorDialog } = props;
  const { setPickedColors, setIsColorPickerMode, setCurrentTool } = useFrameAnnotation();

  const [colors, setColors] = useState<string[]>(initialColors);
  const [text, setText] = useState('');
  const [isPickingSecondColor, setIsPickingSecondColor] = useState(false);

  const handleAddComparisonColor = async () => {
    if (!('EyeDropper' in window)) {
      alert('お使いのブラウザはEyeDropper APIをサポートしていません。Chrome 95以降またはEdge 95以降をご利用ください。');
      return;
    }

    setIsPickingSecondColor(true);

    // Temporarily close the dialog to avoid blocking the screen during color picking
    onClose();

    try {
      // Type definitions for EyeDropper API
      interface EyeDropperResult {
        sRGBHex: string;
      }

      interface EyeDropperAPI {
        open(): Promise<EyeDropperResult>;
      }

      interface EyeDropperConstructor {
        new (): EyeDropperAPI;
      }

      const EyeDropperClass = window.EyeDropper as EyeDropperConstructor | undefined;
      if (!EyeDropperClass) {
        throw new Error('EyeDropper APIがサポートされていません');
      }

      const eyeDropper = new EyeDropperClass();
      const result = await eyeDropper.open();
      const newColor = result.sRGBHex;

      // Add the new color and reopen the dialog
      setColors((prev: string[]) => [...prev, newColor]);
      setIsPickingSecondColor(false);

      // Small delay to ensure the eyedropper is fully closed before reopening dialog
      setTimeout(() => {
        setShowColorDialog(true);
      }, 100);
    } catch (error) {
      console.log('カラーピッカーがキャンセルされたか、エラーが発生しました:', error);
      setIsPickingSecondColor(false);

      // Reopen the dialog even if color picking was cancelled
      setTimeout(() => {
        setShowColorDialog(true);
      }, 100);
    }
  };

  const handleSave = () => {
    if (colors.length === 0) {
      return;
    }
    onSave(colors, text.trim());
    handleClose();
  };

  const handleClose = () => {
    // Only reset everything if we're not in the middle of picking a second color
    if (!isPickingSecondColor) {
      setText('');
      setColors([]);
      setPickedColors([]);
      setIsColorPickerMode(false);
      setCurrentTool('cursor');
    }
    onClose();
  };

  const removeColor = (index: number) => {
    setColors((prev) => prev.filter((_, i) => i !== index));
  };

  // Update colors when initialColors change
  useEffect(() => {
    if (initialColors.length > 0) {
      setColors(initialColors);
    }
  }, [initialColors]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LuDroplet className="size-4 text-orange-600" />
            カラーピッカー
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Color Display */}
          <div className="space-y-3">
            {colors.map((color, index) => {
              const colorInfo = getColorInfo(color);
              return (
                <div key={`color-${color}`} className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">カラー{colors.length > 1 ? ` ${index + 1}` : ''}</Label>
                    {colors.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeColor(index)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <LuX className="size-3" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-md border-2 border-border shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex-1 space-y-1 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">HEX:</span>{' '}
                          <span className="font-mono">{colorInfo.hex.toUpperCase()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">RGB:</span>{' '}
                          <span className="font-mono">
                            {colorInfo.rgb.r}, {colorInfo.rgb.g}, {colorInfo.rgb.b}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">HSL:</span>{' '}
                        <span className="font-mono">
                          {colorInfo.hsl.h}°, {colorInfo.hsl.s}%, {colorInfo.hsl.l}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Comparison Color Button */}
          {colors.length === 1 && !isPickingSecondColor && (
            <Button
              variant="outline"
              onClick={() => {
                void handleAddComparisonColor();
              }}
              className="w-full border-dashed"
            >
              <LuPlus className="size-4 mr-2" />
              比較色を追加
            </Button>
          )}

          {/* Text Input */}
          <div className="space-y-2">
            <Label htmlFor="color-comment">コメント（任意）</Label>
            <TextArea
              id="color-comment"
              placeholder="これらの色についてのコメントを入力してください..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={colors.length === 0}>
              カラーコメントを保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
