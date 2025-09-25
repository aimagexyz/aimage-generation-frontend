import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const Separator = forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>((props, ref) => {
  const { className, orientation = 'horizontal', decorative = true, ...restProps } = props;
  return (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={twMerge(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className,
      )}
      {...restProps}
    />
  );
});
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
