import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const Alert = forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'> & VariantProps<typeof alertVariants>>(
  (props, ref) => {
    const { className, variant, ...restProps } = props;
    return <div ref={ref} role="alert" className={twMerge(alertVariants({ variant }), className)} {...restProps} />;
  },
);
Alert.displayName = 'Alert';

const AlertTitle = forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<'h5'>>((props, ref) => {
  const { className, children, ...restProps } = props;
  return (
    <h5 ref={ref} className={twMerge('mb-1 font-medium leading-none tracking-tight', className)} {...restProps}>
      {children}
    </h5>
  );
});
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<'p'>>((props, ref) => {
  const { className, ...restProps } = props;
  return <div ref={ref} className={twMerge('text-sm [&_p]:leading-relaxed', className)} {...restProps} />;
});
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertDescription, AlertTitle };
