import { useEffect, useState } from 'react';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { LuArrowLeftRight, LuColumns2, LuFileImage, LuLayers, LuSlidersHorizontal, LuX } from 'react-icons/lu';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/ToggleGroup';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';

interface ImageComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageOne: string;
  imageTwo: string;
  imageOneName?: string;
  imageTwoName?: string;
  title?: string;
}

type ComparisonMode = 'side-by-side' | 'overlay' | 'slider';

export function ImageComparisonModal({
  isOpen,
  onClose,
  imageOne,
  imageTwo,
  imageOneName = 'Image 1',
  imageTwoName = 'Image 2',
  title = '画像を比較',
}: ImageComparisonModalProps) {
  const [itemOne, setItemOne] = useState(imageOne);
  const [itemTwo, setItemTwo] = useState(imageTwo);
  const [itemOneName, setItemOneName] = useState(imageOneName);
  const [itemTwoName, setItemTwoName] = useState(imageTwoName);
  const [topImageOpacity, setTopImageOpacity] = useState(0.5);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('side-by-side');

  useEffect(() => {
    setItemOne(imageOne);
    setItemTwo(imageTwo);
    setItemOneName(imageOneName);
    setItemTwoName(imageTwoName);
  }, [imageOne, imageTwo, imageOneName, imageTwoName]);

  useEffect(() => {
    if (!isOpen) {
      setTopImageOpacity(0.5);
      setComparisonMode('side-by-side');
    }
  }, [isOpen]);

  const handleSwapImages = () => {
    const tempImageSrc = itemOne;
    const tempImageName = itemOneName;
    setItemOne(itemTwo);
    setItemOneName(itemTwoName);
    setItemTwo(tempImageSrc);
    setItemTwoName(tempImageName);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) {
        return;
      }
      if (comparisonMode !== 'overlay') {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setTopImageOpacity((prev) => Math.max(0, prev - 0.1));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setTopImageOpacity((prev) => Math.min(1, prev + 0.1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, comparisonMode]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw] xl:max-w-[75vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 px-6 pt-2 pb-1">
          <div className="relative w-full flex-1 max-h-[calc(100%-120px)] mb-2 overflow-hidden">
            {comparisonMode === 'overlay' && (
              <div className="relative w-full h-full overflow-hidden border rounded-md bg-muted/20">
                <img
                  src={itemOne}
                  alt={itemOneName}
                  className="absolute top-0 left-0 object-contain w-full h-full"
                  onError={(e) => console.error('Error loading bottom image:', itemOne, e)}
                />
                <img
                  src={itemTwo}
                  alt={itemTwoName}
                  className="absolute top-0 left-0 object-contain w-full h-full"
                  style={{ opacity: topImageOpacity }}
                  onError={(e) => console.error('Error loading top image:', itemTwo, e)}
                />
              </div>
            )}
            {comparisonMode === 'side-by-side' && (
              <div className="flex w-full h-full gap-2">
                <div className="flex flex-col items-center w-1/2 h-full p-1 border rounded-md bg-muted/10">
                  <span className="mb-1 text-xs truncate text-muted-foreground" title={itemOneName}>
                    {itemOneName}
                  </span>
                  <div className="relative flex-1 w-full overflow-hidden">
                    <img
                      src={itemOne}
                      alt={itemOneName}
                      className="absolute top-0 left-0 object-contain w-full h-full"
                      onError={(e) => console.error('Error loading image 1:', itemOne, e)}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center w-1/2 h-full p-1 border rounded-md bg-muted/10">
                  <span className="mb-1 text-xs truncate text-muted-foreground" title={itemTwoName}>
                    {itemTwoName}
                  </span>
                  <div className="relative flex-1 w-full overflow-hidden">
                    <img
                      src={itemTwo}
                      alt={itemTwoName}
                      className="absolute top-0 left-0 object-contain w-full h-full"
                      onError={(e) => console.error('Error loading image 2:', itemTwo, e)}
                    />
                  </div>
                </div>
              </div>
            )}
            {comparisonMode === 'slider' && (
              <div className="relative w-full h-full overflow-hidden border rounded-md bg-muted/20">
                <ReactCompareSlider
                  itemOne={
                    <ReactCompareSliderImage
                      src={itemOne}
                      alt={itemOneName}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  }
                  itemTwo={
                    <ReactCompareSliderImage
                      src={itemTwo}
                      alt={itemTwoName}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  }
                  className="w-full h-full"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 py-2 mt-auto border-t">
            <div className="w-full max-w-xs">
              <TooltipProvider delayDuration={300}>
                <ToggleGroup
                  type="single"
                  value={comparisonMode}
                  onValueChange={(value) => {
                    if (value) {
                      setComparisonMode(value as ComparisonMode);
                    }
                  }}
                  className="flex justify-center w-full"
                  aria-label="Comparison Mode"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="overlay" aria-label="Overlay Mode">
                        <LuLayers className="w-5 h-5" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>オーバーレイ表示 (Overlay)</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="side-by-side" aria-label="Side-by-side Mode">
                        <LuColumns2 className="w-5 h-5" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>並べて表示 (Side-by-Side)</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="slider" aria-label="Slider Mode">
                        <LuSlidersHorizontal className="w-5 h-5" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>スライダー比較 (Slider)</p>
                    </TooltipContent>
                  </Tooltip>
                </ToggleGroup>
              </TooltipProvider>
            </div>

            {comparisonMode === 'overlay' && (
              <>
                <div className="w-full max-w-xs">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={topImageOpacity}
                    onChange={(e) => setTopImageOpacity(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    title={`Opacity: ${Math.round(topImageOpacity * 100)}%`}
                  />
                </div>
                <div className="flex items-center justify-between w-full text-sm">
                  <div className="flex items-center gap-1 truncate">
                    <Button variant="link" className="h-auto p-0 text-xs truncate" title={itemOneName}>
                      <LuFileImage className="mr-1 size-3" /> {itemOneName} (Bottom)
                    </Button>
                  </div>
                  <Button onClick={handleSwapImages} variant="outline" size="xs" className="px-2 h-7">
                    <LuArrowLeftRight className="mr-1 size-3.5" />
                    反転
                  </Button>
                  <div className="flex items-center justify-end gap-1 truncate">
                    <Button variant="link" className="h-auto p-0 text-xs truncate" title={itemTwoName}>
                      <LuFileImage className="mr-1 size-3" /> {itemTwoName} (Top: {Math.round(topImageOpacity * 100)}
                      %)
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <LuX className="w-4 h-4 mr-2" />
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
