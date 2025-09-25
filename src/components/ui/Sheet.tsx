import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>((props, ref) => {
  const { className, ...restProps } = props;
  return (
    <SheetPrimitive.Overlay
      className={twMerge(
        'fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...restProps}
      ref={ref}
    />
  );
});

SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  'fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
        right:
          'inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
);

type SheetContentProps = React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> &
  VariantProps<typeof sheetVariants>;

const SheetContent = forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>((props, ref) => {
  const { side = 'right', className, children, ...restProps } = props;
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content ref={ref} className={twMerge(sheetVariants({ side }), className)} {...restProps}>
        {children}
        <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = SheetPrimitive.Content.displayName;

function SheetHeader(props: React.ComponentPropsWithoutRef<'div'>) {
  const { className, ...restProps } = props;
  return <div className={twMerge('flex flex-col space-y-2 text-center sm:text-left', className)} {...restProps} />;
}
SheetHeader.displayName = 'SheetHeader';

function SheetFooter(props: React.ComponentPropsWithoutRef<'div'>) {
  const { className, ...restProps } = props;
  return (
    <div
      className={twMerge('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...restProps}
    />
  );
}
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>((props, ref) => {
  const { className, ...restProps } = props;
  return (
    <SheetPrimitive.Title
      ref={ref}
      className={twMerge('text-lg font-semibold text-foreground', className)}
      {...restProps}
    />
  );
});
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>((props, ref) => {
  const { className, ...restProps } = props;
  return (
    <SheetPrimitive.Description
      ref={ref}
      className={twMerge('text-sm text-muted-foreground', className)}
      {...restProps}
    />
  );
});
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
