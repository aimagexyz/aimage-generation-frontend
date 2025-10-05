import {
  LuArrowUpRight,
  LuCircle,
  LuDroplet,
  LuEye,
  LuEyeOff,
  LuMousePointer2,
  LuPenTool,
  LuSearch,
  LuSquare,
  LuTextCursor,
} from 'react-icons/lu';
import { twMerge } from 'tailwind-merge';

import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { Slider } from '@/components/ui/Slider';

import { useSubtask } from '../useSubtask';
import { ColorPickerDialog } from './ColorPickerDialog';
import { type AnnotationTool, useFrameAnnotation } from './useFrameAnnotation';

// EyeDropper API type definition - simplified for compatibility

// Define the shape of our color comment data
interface ColorCommentData {
  type: 'color-comparison';
  colors: Array<{
    hex: string;
    source: string;
  }>;
  userText?: string;
}

const COLORS = ['#ff0000', '#0000ff', '#00ff00', '#ffff00', '#000000'];

const TOOLS: { title: string; type: AnnotationTool; icon: React.ReactNode }[] = [
  { title: 'カーソル', type: 'cursor', icon: <LuMousePointer2 size={16} className="size-4" /> },
  { title: '長方形', type: 'rect', icon: <LuSquare size={16} className="size-4" /> },
  { title: '円', type: 'circle', icon: <LuCircle size={16} className="size-4" /> },
  { title: '矢印', type: 'arrow', icon: <LuArrowUpRight size={16} className="size-4" /> },
  { title: 'テキスト', type: 'text', icon: <LuTextCursor size={16} className="size-4" /> },
  { title: 'ペン', type: 'pen', icon: <LuPenTool size={16} className="size-4" /> },
  { title: '類似検索', type: 'search', icon: <LuSearch size={16} className="size-4" /> },
  { title: 'カラーピッカー', type: 'color-picker', icon: <LuDroplet size={16} className="size-4" /> },
];

type Props = {
  readonly disabled?: boolean;
  readonly subtaskId?: string;
  readonly selectedVersion?: number;
};

export function AnnotationToolbar(props: Props) {
  const { disabled, subtaskId, selectedVersion } = props;
  const {
    currentTool,
    setCurrentTool,
    currentColor,
    setCurrentColor,
    resetImageAnnotation,
    setIsSearchMode,
    showAiBoundingBoxes,
    setShowAiBoundingBoxes,
    setIsDrawingMode,
    brushSize,
    setBrushSize,
    setIsColorPickerMode,
    pickedColors,
    setPickedColors,
    showColorDialog,
    setShowColorDialog,
  } = useFrameAnnotation();

  // Use subtask hook for creating color comments
  const { createNewAnnotation } = useSubtask(subtaskId || '', selectedVersion);

  // Color picker handler
  const handleColorPicker = async () => {
    if (!('EyeDropper' in window)) {
      alert('お使いのブラウザはEyeDropper APIをサポートしていません。Chrome 95以降またはEdge 95以降をご利用ください。');
      setCurrentTool('cursor');
      setIsColorPickerMode(false);
      return;
    }

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
      const color = result.sRGBHex;

      // Add the picked color to the state
      setPickedColors([color]);
      setShowColorDialog(true);

      // Reset tool to cursor after picking
      setCurrentTool('cursor');
      setIsColorPickerMode(false);
    } catch (error) {
      // User cancelled or error occurred
      console.log('カラーピッカーがキャンセルされたか、エラーが発生しました:', error);
      setCurrentTool('cursor');
      setIsColorPickerMode(false);
    }
  };

  // Handle color comment save
  const handleColorSave = (colors: string[], text: string) => {
    if (!subtaskId || colors.length === 0) {
      console.warn('カラーコメントを保存できません: subtaskIdまたは色が不足しています');
      return;
    }

    // Create structured color comment data (without userText)
    const colorCommentData: ColorCommentData = {
      type: 'color-comparison',
      colors: colors.map((color) => ({
        hex: color,
        source: 'スクリーンピッカー',
      })),
    };

    // Create the comment text that includes both structured data and user text
    const commentText = [`[COLOR_COMPARISON:${JSON.stringify(colorCommentData)}]`, text.trim()]
      .filter(Boolean)
      .join('\n\n');

    // Create annotation using the existing system
    createNewAnnotation({
      id: crypto.randomUUID(),
      type: 'comment',
      text: commentText,
      timestamp: new Date().toLocaleString(),
      color: colors[0], // Store primary color in the color field
      tool: 'cursor', // Use cursor as tool since color-picker is not in API schema
    });

    // Clean up state
    setPickedColors([]);
    setShowColorDialog(false);
  };

  return (
    <div className="flex flex-col items-center gap-1 p-1 bg-card border-r shadow-lg h-full w-16">
      <div className="flex flex-col gap-1 items-center">
        {TOOLS.map((tool) => (
          <Button
            key={tool.type}
            title={tool.title}
            variant="outline"
            className={twMerge(
              'cursor-pointer size-9 border-2 p-0 transition-all duration-200',
              (() => {
                if (tool.type === 'search') {
                  return 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-400 shadow-sm';
                }
                if (tool.type === 'color-picker') {
                  return 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300 hover:from-orange-100 hover:to-amber-100 hover:border-orange-400 shadow-sm';
                }
                return 'border hover:bg-muted/50';
              })(),
              (() => {
                if (currentTool === tool.type && tool.type === 'search') {
                  return 'bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-500 shadow-md ring-2 ring-blue-200';
                }
                if (currentTool === tool.type && tool.type === 'pen') {
                  return 'bg-gradient-to-br from-green-100 to-emerald-100 border-green-500 shadow-md ring-2 ring-green-200';
                }
                if (currentTool === tool.type && tool.type === 'color-picker') {
                  return 'bg-gradient-to-br from-orange-100 to-amber-100 border-orange-500 shadow-md ring-2 ring-orange-200';
                }
                if (currentTool === tool.type) {
                  return 'border-primary';
                }
                return '';
              })(),
              disabled && 'opacity-50 cursor-not-allowed',
            )}
            onClick={() => {
              if (disabled) {
                return;
              }
              // Only reset if switching to a different tool
              if (currentTool !== tool.type) {
                resetImageAnnotation();
                setCurrentTool(tool.type);
              }
              // Always update the mode states
              if (tool.type === 'search') {
                setIsSearchMode(true);
                setIsDrawingMode(false);
                setIsColorPickerMode(false);
              } else if (tool.type === 'pen') {
                setIsSearchMode(false);
                setIsDrawingMode(true);
                setIsColorPickerMode(false);
              } else if (tool.type === 'color-picker') {
                setIsSearchMode(false);
                setIsDrawingMode(false);
                setIsColorPickerMode(true);
                // Trigger color picker immediately
                void handleColorPicker();
              } else {
                setIsSearchMode(false);
                setIsDrawingMode(false);
                setIsColorPickerMode(false);
              }
            }}
            disabled={disabled}
          >
            <div
              className={twMerge(
                tool.type === 'search' && 'text-blue-600',
                currentTool === tool.type && tool.type === 'search' && 'text-blue-700',
                tool.type === 'color-picker' && 'text-orange-600',
                currentTool === tool.type && tool.type === 'color-picker' && 'text-orange-700',
              )}
            >
              {tool.icon}
            </div>
          </Button>
        ))}
      </div>

      <Separator orientation="horizontal" className="w-10 my-1" />

      {/* AI边界框显示控制按钮 */}
      <div className="flex flex-col gap-1 items-center">
        <Button
          variant="outline"
          className={twMerge(
            'cursor-pointer size-9 border-2 p-0 transition-all duration-200',
            'bg-gradient-to-br from-purple-50 to-violet-50 border-purple-300 hover:from-purple-100 hover:to-violet-100 hover:border-purple-400 shadow-sm',
            showAiBoundingBoxes &&
              'bg-gradient-to-br from-purple-100 to-violet-100 border-purple-500 shadow-md ring-2 ring-purple-200',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
          onClick={() => {
            if (disabled) {
              return;
            }
            setShowAiBoundingBoxes(!showAiBoundingBoxes);
          }}
          disabled={disabled}
        >
          <div className={twMerge('text-purple-600', showAiBoundingBoxes && 'text-purple-700')}>
            {showAiBoundingBoxes ? <LuEye size={16} className="size-4" /> : <LuEyeOff size={16} className="size-4" />}
          </div>
        </Button>
      </div>

      {currentTool === 'pen' && (
        <>
          <Separator orientation="horizontal" className="w-10 my-1" />

          {/* 画笔大小控制 - 紧凑版 */}
          <div className="flex flex-col gap-1 items-center w-12">
            <span className="text-xs text-muted-foreground text-center leading-3">サイズ</span>
            <div className="w-8 h-12 flex flex-col items-center justify-center">
              <Slider
                value={[brushSize]}
                onValueChange={(value) => setBrushSize(value[0])}
                min={1}
                max={20}
                step={1}
                orientation="vertical"
                className="h-10"
                disabled={disabled}
              />
            </div>
            <span className="text-xs font-medium leading-3 mb-2">{brushSize}px</span>
          </div>

          {/* 颜色选择 - 紧凑版 */}
          <div className="flex flex-col gap-0.5 items-center">
            <span className="text-xs text-muted-foreground text-center leading-3">カラー</span>
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  if (disabled) {
                    return;
                  }
                  setCurrentColor(color);
                }}
                className={twMerge(
                  'rounded-full size-4 cursor-pointer border',
                  currentColor === color ? 'border-2 border-primary shadow-lg' : 'border-gray-300',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
                style={{
                  backgroundColor: color,
                }}
                disabled={disabled}
              />
            ))}
          </div>
        </>
      )}

      {currentTool !== 'cursor' && currentTool !== 'search' && currentTool !== 'pen' && (
        <>
          <Separator orientation="horizontal" className="w-10 my-2" />

          <div className="flex flex-col gap-1 items-center">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  if (disabled) {
                    return;
                  }
                  setCurrentColor(color);
                }}
                className={twMerge(
                  'rounded-full size-5 cursor-pointer border',
                  currentColor === color ? 'border-2 border-primary shadow-lg' : 'border-gray-300',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
                style={{
                  backgroundColor: color,
                }}
                disabled={disabled}
              />
            ))}
          </div>
        </>
      )}

      {/* Color Picker Dialog */}
      <ColorPickerDialog
        isOpen={showColorDialog}
        onClose={() => setShowColorDialog(false)}
        onSave={handleColorSave}
        initialColors={pickedColors}
        setShowColorDialog={setShowColorDialog}
      />
    </div>
  );
}
