import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const Table = forwardRef<HTMLTableElement, React.ComponentPropsWithoutRef<'table'>>((props, ref) => {
  const { className, children, ...restProps } = props;
  return (
    <table ref={ref} className={twMerge('w-full caption-bottom text-sm', className)} {...restProps}>
      {children}
    </table>
  );
});
Table.displayName = 'Table';

const TableHeader = forwardRef<HTMLTableSectionElement, React.ComponentPropsWithoutRef<'thead'>>((props, ref) => {
  const { className, ...restProps } = props;
  return <thead ref={ref} className={twMerge('[&_tr]:border-b', className)} {...restProps} />;
});
TableHeader.displayName = 'TableHeader';

const TableBody = forwardRef<HTMLTableSectionElement, React.ComponentPropsWithoutRef<'tbody'>>((props, ref) => {
  const { className, ...restProps } = props;
  return <tbody ref={ref} className={twMerge('[&_tr:last-child]:border-0', className)} {...restProps} />;
});
TableBody.displayName = 'TableBody';

const TableFooter = forwardRef<HTMLTableSectionElement, React.ComponentPropsWithoutRef<'tfoot'>>((props, ref) => {
  const { className, ...restProps } = props;
  return (
    <tfoot
      ref={ref}
      className={twMerge('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
      {...restProps}
    />
  );
});
TableFooter.displayName = 'TableFooter';

const TableRow = forwardRef<HTMLTableRowElement, React.ComponentPropsWithoutRef<'tr'>>((props, ref) => {
  const { className, ...restProps } = props;
  return (
    <tr
      ref={ref}
      className={twMerge('border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', className)}
      {...restProps}
    />
  );
});
TableRow.displayName = 'TableRow';

const TableHead = forwardRef<HTMLTableCellElement, React.ComponentPropsWithoutRef<'th'>>((props, ref) => {
  const { className, ...restProps } = props;
  return (
    <th
      ref={ref}
      className={twMerge(
        'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...restProps}
    />
  );
});
TableHead.displayName = 'TableHead';

const TableCell = forwardRef<HTMLTableCellElement, React.ComponentPropsWithoutRef<'td'>>((props, ref) => {
  const { className, ...restProps } = props;
  return (
    <td ref={ref} className={twMerge('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)} {...restProps} />
  );
});
TableCell.displayName = 'TableCell';

const TableCaption = forwardRef<HTMLTableCaptionElement, React.ComponentPropsWithoutRef<'caption'>>((props, ref) => {
  const { className, ...restProps } = props;
  return <caption ref={ref} className={twMerge('mt-4 text-sm text-muted-foreground', className)} {...restProps} />;
});
TableCaption.displayName = 'TableCaption';

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
