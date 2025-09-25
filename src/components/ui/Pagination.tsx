import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

import { type Button, buttonVariants } from '@/components/ui/Button';

type ButtonProps = React.ComponentPropsWithoutRef<typeof Button>;

function Pagination(props: React.ComponentPropsWithoutRef<'nav'>) {
  const { className, ...restProps } = props;
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={twMerge('mx-auto flex w-full justify-center', className)}
      {...restProps}
    />
  );
}
Pagination.displayName = 'Pagination';

const PaginationContent = forwardRef<HTMLUListElement, React.ComponentPropsWithoutRef<'ul'>>((props, ref) => {
  const { className, ...restProps } = props;
  return <ul ref={ref} className={twMerge('flex flex-row items-center gap-1', className)} {...restProps} />;
});
PaginationContent.displayName = 'PaginationContent';

const PaginationItem = forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<'li'>>((props, ref) => {
  const { className, ...restProps } = props;
  return <li ref={ref} className={twMerge('', className)} {...restProps} />;
});
PaginationItem.displayName = 'PaginationItem';

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, 'size'> &
  React.ComponentPropsWithoutRef<'a'>;

function PaginationLink(props: PaginationLinkProps) {
  const { className, isActive, size = 'icon', ...restProps } = props;
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      aria-label={restProps['aria-label'] || 'Pagination link'}
      className={twMerge(
        buttonVariants({
          variant: isActive ? 'outline' : 'ghost',
          size,
        }),
        className,
      )}
      {...restProps}
    >
      {restProps.children}
    </a>
  );
}

PaginationLink.displayName = 'PaginationLink';

function PaginationPrevious(props: React.ComponentPropsWithoutRef<typeof PaginationLink>) {
  const { className, ...restProps } = props;
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={twMerge('gap-1 pl-2.5', className)}
      {...restProps}
    >
      <ChevronLeft className="h-4 w-4" />
      <span>Previous</span>
    </PaginationLink>
  );
}
PaginationPrevious.displayName = 'PaginationPrevious';

function PaginationNext(props: React.ComponentPropsWithoutRef<typeof PaginationLink>) {
  const { className, ...restProps } = props;
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={twMerge('gap-1 pr-2.5', className)}
      {...restProps}
    >
      <span>Next</span>
      <ChevronRight className="h-4 w-4" />
    </PaginationLink>
  );
}
PaginationNext.displayName = 'PaginationNext';

function PaginationEllipsis(props: React.ComponentPropsWithoutRef<'span'>) {
  const { className, ...restProps } = props;
  return (
    <span aria-hidden className={twMerge('flex h-9 w-9 items-center justify-center', className)} {...restProps}>
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}
PaginationEllipsis.displayName = 'PaginationEllipsis';

// 完整的分页组件
interface PaginationComponentProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function PaginationComponent({ currentPage, totalPages, onPageChange, className }: PaginationComponentProps) {
  const generatePageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const delta = 2; // 当前页前后显示的页数

    if (totalPages <= 7) {
      // 如果总页数少于等于7，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 总是显示第一页
      pages.push(1);

      if (currentPage > delta + 2) {
        pages.push('ellipsis');
      }

      // 显示当前页前后的页码
      const start = Math.max(2, currentPage - delta);
      const end = Math.min(totalPages - 1, currentPage + delta);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - delta - 1) {
        pages.push('ellipsis');
      }

      // 总是显示最后一页
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = generatePageNumbers();

  return (
    <Pagination className={className}>
      <PaginationContent>
        {/* 上一页按钮 */}
        <PaginationItem>
          <PaginationPrevious
            onClick={currentPage > 1 ? () => onPageChange(currentPage - 1) : undefined}
            className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>

        {/* 页码 */}
        {pageNumbers.map((page, index) => (
          <PaginationItem key={index}>
            {page === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                isActive={page === currentPage}
                onClick={() => onPageChange(page)}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        {/* 下一页按钮 */}
        <PaginationItem>
          <PaginationNext
            onClick={currentPage < totalPages ? () => onPageChange(currentPage + 1) : undefined}
            className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export {
  Pagination,
  PaginationComponent,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};

// 默认导出完整的分页组件
export default PaginationComponent;
