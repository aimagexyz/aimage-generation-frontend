import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const Card = forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>((props, ref) => {
  const { className, ...restProps } = props;
  return (
    <div
      ref={ref}
      className={twMerge('rounded-lg border bg-card text-card-foreground shadow-sm', className)}
      {...restProps}
    />
  );
});
Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>((props, ref) => {
  const { className, ...restProps } = props;

  return <div ref={ref} className={twMerge('flex flex-col space-y-1.5 p-6', className)} {...restProps} />;
});
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<'h5'>>((props, ref) => {
  const { className, ...restProps } = props;
  return (
    <h3 ref={ref} className={twMerge('text-2xl font-semibold leading-none tracking-tight', className)} {...restProps} />
  );
});
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<'p'>>((props, ref) => {
  const { className, ...restProps } = props;
  return <p ref={ref} className={twMerge('text-sm text-muted-foreground', className)} {...restProps} />;
});
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>((props, ref) => {
  const { className, ...restProps } = props;
  return <div ref={ref} className={twMerge('p-6 pt-0', className)} {...restProps} />;
});
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>((props, ref) => {
  const { className, ...restProps } = props;
  return <div ref={ref} className={twMerge('flex items-center p-6 pt-0', className)} {...restProps} />;
});
CardFooter.displayName = 'CardFooter';

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
