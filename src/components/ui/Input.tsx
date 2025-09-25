import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

type Props = React.ComponentPropsWithoutRef<'input'>;

const Input = forwardRef<HTMLInputElement, Props>((props, ref) => {
  const { className, type, ...restProps } = props;
  return (
    <input
      type={type}
      className={twMerge(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...restProps}
    />
  );
});

Input.displayName = 'Input';

export { Input };
