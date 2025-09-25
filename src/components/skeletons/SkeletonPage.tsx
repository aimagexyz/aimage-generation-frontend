import { Skeleton } from '@/components/ui/Skeleton';

import { SkeletonPageLayout } from './SkeletonPageLayout';

export function SkeletonPage() {
  return (
    <SkeletonPageLayout>
      <div className="flex flex-row space-x-4">
        <div className="flex flex-col space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-[230px] w-[370px] rounded-xl" />
            <Skeleton className="h-[340px] w-[370px] rounded-xl" />
          </div>
        </div>

        <div className="flex flex-col space-y-3 w-full">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      </div>
    </SkeletonPageLayout>
  );
}
