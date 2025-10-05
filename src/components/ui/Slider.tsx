import * as SliderPrimitive from '@radix-ui/react-slider';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const Slider = forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>((props, ref) => {
  const { className, orientation, ...restProps } = props;
  const isVertical = orientation === 'vertical';
  return (
    <SliderPrimitive.Root
      ref={ref}
      orientation={orientation}
      className={twMerge(
        'relative flex touch-none select-none items-center',
        isVertical ? 'h-full flex-col' : 'w-full',
        className,
      )}
      {...restProps}
    >
      <SliderPrimitive.Track
        className={twMerge(
          'relative grow overflow-hidden rounded-full bg-secondary',
          isVertical ? 'w-2 h-full' : 'h-2 w-full',
        )}
      >
        <SliderPrimitive.Range className={twMerge('absolute bg-primary', isVertical ? 'w-full' : 'h-full')} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
