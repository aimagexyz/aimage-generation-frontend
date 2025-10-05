import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const Avatar = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>((props, ref) => {
  const { className, ...restProps } = props;
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={twMerge('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
      {...restProps}
    />
  );
});
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>((props, ref) => {
  const { className, ...restProps } = props;
  return (
    <AvatarPrimitive.Image ref={ref} className={twMerge('aspect-square h-full w-full', className)} {...restProps} />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>((props, ref) => {
  const { className, ...restProps } = props;
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={twMerge('flex h-full w-full items-center justify-center rounded-full bg-muted', className)}
      {...restProps}
    />
  );
});
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarFallback, AvatarImage };
