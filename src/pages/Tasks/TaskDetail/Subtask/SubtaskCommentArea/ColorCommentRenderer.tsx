import { LuDroplet, LuPalette } from 'react-icons/lu';

// Color comment data structure
interface ColorCommentData {
  type: 'color-comparison';
  colors: Array<{
    hex: string;
    source: string;
  }>;
  userText?: string;
}

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

// Parse color comment from text
export const parseColorComment = (text: string): { colorData: ColorCommentData; userText: string } | null => {
  const colorRegex = /^\[COLOR_COMPARISON:(.*?)\](?:\n\n(.*))?$/s;
  const colorMatch = colorRegex.exec(text);
  if (!colorMatch) {
    return null;
  }

  try {
    const colorData = JSON.parse(colorMatch[1]) as ColorCommentData;
    const userText = colorMatch[2] || '';
    return { colorData, userText };
  } catch {
    return null;
  }
};

// Check if annotation is a color comment
export const isColorComment = (text: string | null): boolean => {
  return !!text && text.startsWith('[COLOR_COMPARISON:');
};

type Props = {
  readonly colorData: ColorCommentData;
  readonly userText: string;
};

export function ColorCommentRenderer(props: Props) {
  const { colorData, userText } = props;

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-3 mt-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <LuDroplet className="size-4 text-orange-600" />
        <span className="text-sm font-medium text-orange-800">色比較</span>
        {colorData.colors.length > 1 && <LuPalette className="size-4 text-orange-600" />}
      </div>

      {/* Colors Display */}
      <div className="space-y-3">
        {colorData.colors.map((colorInfo, index) => {
          const rgb = hexToRgb(colorInfo.hex);
          const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

          return (
            <div key={`color-${colorInfo.hex}`} className="flex items-center gap-3">
              {/* Color Swatch */}
              <div
                className="w-10 h-10 rounded-md border-2 border-white shadow-sm flex-shrink-0"
                style={{ backgroundColor: colorInfo.hex }}
                title={colorInfo.hex.toUpperCase()}
              />

              {/* Color Info */}
              <div className="flex-1 text-xs space-y-0.5">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-muted-foreground">HEX:</span>{' '}
                    <span className="font-mono font-medium">{colorInfo.hex.toUpperCase()}</span>
                  </div>
                  {colorData.colors.length > 1 && (
                    <span className="text-xs text-orange-600 font-medium">色{index + 1}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div>
                    <span>RGB:</span>{' '}
                    <span className="font-mono">
                      {rgb.r}, {rgb.g}, {rgb.b}
                    </span>
                  </div>
                  <div>
                    <span>HSL:</span>{' '}
                    <span className="font-mono">
                      {hsl.h}°, {hsl.s}%, {hsl.l}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* User Text */}
      {userText && (
        <div className="mt-3 pt-3 border-t border-orange-200/50">
          <div className="text-sm text-gray-700 whitespace-pre-wrap">{userText}</div>
        </div>
      )}

      {/* Color Comparison Info */}
      {colorData.colors.length > 1 && (
        <div className="mt-3 pt-3 border-t border-orange-200/50">
          <div className="text-xs text-muted-foreground">
            <LuPalette className="size-3 inline mr-1" />
            {colorData.colors.length}色を比較中
          </div>
        </div>
      )}
    </div>
  );
}
