import { ChevronDown, ImageIcon, ImagePlus, Lightbulb, Loader2, Send, Settings, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';

import { type DetailedSettings } from './modals/DetailedSettingsModal';

type PromptInputProps = {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  onOpenStructuredModal: () => void;
  structuredSelections: Record<string, string>;
  onSelectionRemove: (selectionTitle: string) => void;
  detailedSettings: DetailedSettings;
  onSettingsChange: (settings: DetailedSettings) => void;
  // New: prompt image attachments
  promptImages: string[];
  onAddImages: (files: File[] | FileList) => void;
  onRemoveImage: (index: number) => void;
  onClearImages: () => void;
};

const PROMPT_SUGGESTIONS = [
  '座りポーズ',
  '立ちポーズ',
  'ジャンプしながら手を振るポーズ',
  'ウィンクしながらピースサイン',
  'リラックス',
  '照れている',
];

// Available aspect ratios (matching DetailedSettingsModal)
const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
];

// Helper function to get category display name
const getCategoryDisplayName = (categoryKey: string): string => {
  const categoryMap: Record<string, string> = {
    'basic-gender': '性別',
    'basic-age': '年齢',
    'basic-bodyType': '体型',
    'basic-skinColor': '肌色',
    'hair-style': '髪型',
    'hair-bangs': '前髪',
    'hair-color': '髪色',
    'expression-face': '表情',
    'clothing-theme': 'テーマ',
    'clothing-tops': 'トップス',
    'clothing-bottoms': 'ボトムス',
    'clothing-shoes': '靴',
    'clothing-accessories': 'アクセ',
    'clothing-items': '小物',
    'pose-pose': 'ポーズ',
    'pose-gaze': '視線',
    'pose-composition': '構図',
    'pose-hands': '手の動き',
  };
  return categoryMap[categoryKey] || categoryKey;
};

export function PromptInput({
  prompt,
  onPromptChange,
  onSubmit,
  isLoading,
  onOpenStructuredModal,
  structuredSelections,
  onSelectionRemove,
  detailedSettings,
  onSettingsChange,
  promptImages,
  onAddImages,
  onRemoveImage,
  onClearImages,
}: PromptInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(prompt);
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    const newPrompt = prompt ? `${prompt}, ${suggestion}` : suggestion;
    onPromptChange(newPrompt);
    setShowSuggestions(false);
  };

  const handleImageCountChange = (value: string) => {
    const number_of_images = Math.max(1, Math.min(4, Number(value) || 1));
    onSettingsChange({
      ...detailedSettings,
      number_of_images,
    });
  };

  const handleAspectRatioChange = (aspect_ratio: string) => {
    onSettingsChange({
      ...detailedSettings,
      aspect_ratio,
    });
  };

  // Convert structured selections to display tags
  const allTags = Object.entries(structuredSelections).map(([category, item]) => ({
    category,
    categoryDisplay: getCategoryDisplayName(category),
    item,
    key: `${category}-${item}`,
  }));

  const hasContent = prompt.trim() || allTags.length > 0;

  const processFiles = (files: FileList | File[]) => {
    const array = Array.from(files);
    const imageFiles = array.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      return;
    }
    onAddImages(imageFiles);
  };

  const handlePaste: React.ClipboardEventHandler<HTMLTextAreaElement> = (e) => {
    const items = e.clipboardData?.items;
    if (!items) {
      return;
    }
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && file.type.startsWith('image/')) {
          files.push(file);
        }
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      processFiles(files);
    }
  };

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`relative ${isDragOver ? 'ring-2 ring-purple-400 rounded-lg' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <TextArea
          placeholder="プロンプトを入力するか、画像を添付してください"
          className={`min-h-[44px] resize-none rounded-lg bg-gray-50 p-3 pr-20 text-sm transition-all duration-200 dark:bg-gray-800 border-0 focus:border focus:border-purple-400 focus:bg-white dark:focus:bg-gray-900 ${isExpanded ? 'min-h-[88px]' : ''
            } ${showSuggestions ? 'border-2 border-purple-500' : ''}`}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setIsExpanded(true)}
          onBlur={() => {
            setIsExpanded(false);
            // Add a small delay to allow click events on suggestions to complete
            setTimeout(() => setShowSuggestions(false), 100);
          }}
          disabled={isLoading}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              processFiles(e.target.files);
            }
            // reset to allow reselecting same files
            e.currentTarget.value = '';
          }}
        />

        {/* Compact floating action buttons */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={isLoading}
            onClick={() => fileInputRef.current?.click()}
            title="画像を追加"
          >
            <ImagePlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={isLoading}
            onClick={() => setShowSuggestions(!showSuggestions)}
            title="提案を表示 (Tab)"
          >
            <Lightbulb className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            className="h-7 w-7 p-0 bg-purple-600 hover:bg-purple-700"
            onClick={() => onSubmit(prompt)}
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Compact suggestions dropdown */}
        {showSuggestions && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 p-2">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              おすすめ
            </div>
            <div className="flex flex-wrap gap-1">
              {PROMPT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-purple-800 rounded transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent textarea blur
                    handleSuggestionClick(suggestion);
                  }}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Attached images preview */}
      {promptImages && promptImages.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-2">
            {promptImages.map((url, idx) => (
              <div key={`${url}-${idx}`} className="relative group h-12 w-12 flex-shrink-0 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
                <img src={url} alt={`attached-${idx + 1}`} className="h-full w-full object-cover" />
                <button
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white text-gray-700 shadow border border-gray-200 opacity-0 group-hover:opacity-100 transition"
                  onClick={() => onRemoveImage(idx)}
                  aria-label="remove image"
                >
                  <X className="h-3 w-3 m-auto" />
                </button>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClearImages}>
            画像をクリア
          </Button>
        </div>
      )}

      {/* Compact controls row with tags dropdown */}
      <div className="flex items-center justify-between gap-2">
        {(!promptImages || promptImages.length === 0) ? <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenStructuredModal}
            disabled={isLoading}
            className="h-8 text-xs"
          >
            <ImageIcon className="mr-1 h-3.5 w-3.5" />
            ヒント
            {allTags.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 h-4 w-4 p-0 text-xs rounded-full flex items-center justify-center"
              >
                {allTags.length}
              </Badge>
            )}
          </Button>

          {/* Tags dropdown */}
          {allTags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" disabled={isLoading}>
                  <span>選択中のタグ</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 max-h-64 overflow-y-auto">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">選択中のタグ</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-red-500 hover:text-red-600"
                      onClick={() => {
                        Object.keys(structuredSelections).forEach((category) => {
                          onSelectionRemove(category);
                        });
                      }}
                    >
                      すべてクリア
                    </Button>
                  </div>
                </div>
                <div className="p-1">
                  {allTags.map((tag) => (
                    <DropdownMenuItem
                      key={tag.key}
                      className="flex items-center justify-between group cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="secondary" className="text-xs px-2 py-1 h-auto font-normal">
                          <span className="text-gray-500">{tag.categoryDisplay}:</span>
                          <span className="ml-1 font-semibold">{tag.item}</span>
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectionRemove(tag.category);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div> : <div className="flex items-center gap-2 flex-1 min-w-0" />}

        {/* Compact settings and status */}
        <div className="flex items-center gap-2 text-xs">
          {hasContent && !isLoading && (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold">準備OK</span>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isLoading}>
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 space-y-2">
              <div className="space-y-1">
                <Label htmlFor="img-count" className="px-1 text-xs font-normal text-gray-600">
                  生成枚数
                </Label>
                <Input
                  id="img-count"
                  type="number"
                  value={detailedSettings?.number_of_images || 1}
                  onChange={(e) => handleImageCountChange(e.target.value)}
                  min="1"
                  max="4"
                  className="w-full h-8"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="aspect-ratio" className="px-1 text-xs font-normal text-gray-600">
                  アスペクト比
                </Label>
                <Select
                  value={detailedSettings?.aspect_ratio || '1:1'}
                  onValueChange={handleAspectRatioChange}
                  disabled={isLoading}
                >
                  <SelectTrigger id="aspect-ratio" className="w-full h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((ratio) => (
                      <SelectItem key={ratio.value} value={ratio.value} className="text-xs">
                        {ratio.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
