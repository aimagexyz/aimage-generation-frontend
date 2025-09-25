import { Skeleton } from '@/components/ui/Skeleton';
import { range } from '@/utils/range';

export function AccountSkeleton() {
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="mt-8">
        <div className="flex justify-end mb-4">
          <Skeleton className="h-10 w-48 mr-2" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {[...range(3)].map((index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
