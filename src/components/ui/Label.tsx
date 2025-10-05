import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const labelVariants = cva('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70');

const Label = forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>((props, ref) => {
  const { className, ...restProps } = props;
  return <LabelPrimitive.Root ref={ref} className={twMerge(labelVariants(), className)} {...restProps} />;
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
