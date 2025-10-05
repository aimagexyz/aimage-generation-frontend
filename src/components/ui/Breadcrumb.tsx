import { Slot } from '@radix-ui/react-slot';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const Breadcrumb = forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<'nav'> & {
    separator?: React.ReactNode;
  }
>((props, ref) => {
  return <nav ref={ref} aria-label="breadcrumb" {...props} />;
});
Breadcrumb.displayName = 'Breadcrumb';

const BreadcrumbList = forwardRef<HTMLOListElement, React.ComponentPropsWithoutRef<'ol'>>((props, ref) => {
  const { className, ...restProps } = props;
  return (
    <ol
      ref={ref}
      className={twMerge(
        'flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5',
        className,
      )}
      {...restProps}
    />
  );
});
BreadcrumbList.displayName = 'BreadcrumbList';

const BreadcrumbItem = forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<'li'>>((props, ref) => {
  const { className, ...restProps } = props;
  return <li ref={ref} className={twMerge('inline-flex items-center gap-1.5', className)} {...restProps} />;
});
BreadcrumbItem.displayName = 'BreadcrumbItem';

const BreadcrumbLink = forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<'a'> & {
    asChild?: boolean;
  }
>((props, ref) => {
  const { asChild, className, ...restProps } = props;
  const Comp = asChild ? Slot : 'a';
  return <Comp ref={ref} className={twMerge('transition-colors hover:text-foreground', className)} {...restProps} />;
});
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbPage = forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<'span'>>((props, ref) => {
  const { className, ...restProps } = props;
  return (
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={twMerge('font-normal text-foreground', className)}
      {...restProps}
    />
  );
});
BreadcrumbPage.displayName = 'BreadcrumbPage';

function BreadcrumbSeparator(props: React.ComponentPropsWithoutRef<'li'>) {
  const { children, className, ...restProps } = props;
  return (
    <li role="presentation" aria-hidden="true" className={twMerge('[&>svg]:size-3.5', className)} {...restProps}>
      {children ?? <ChevronRight />}
    </li>
  );
}
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

function BreadcrumbEllipsis(props: React.ComponentPropsWithoutRef<'span'>) {
  const { className, ...restProps } = props;
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={twMerge('flex h-9 w-9 items-center justify-center', className)}
      {...restProps}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More</span>
    </span>
  );
}
BreadcrumbEllipsis.displayName = 'BreadcrumbElipssis';

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
