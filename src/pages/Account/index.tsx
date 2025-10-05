import { twMerge } from 'tailwind-merge';

import ProjectCard from '@/components/ProjectCard';
import { useAuth } from '@/hooks/useAuth';

import AccountCard from './AccountCard';
import LoginCard from './LoginCard';
import { AccountSkeleton } from './Skeletons';

export default function AccountPage() {
  const { userInfo, loading, projects, isLoadingProjects } = useAuth();

  return (
    <div className="w-full lg:grid container mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-center py-12">
        {loading && <AccountSkeleton />}
        {!loading && (userInfo ? <AccountCard /> : <LoginCard />)}
      </div>
      {userInfo && (
        <div>
          <h1 className="text-4xl font-bold py-8 flex justify-between flex-col gap-y-6 sm:flex-row">
            プロジェクト一覧
          </h1>
          <div
            className={twMerge(
              'grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6',
              projects?.items?.length === 1 && 'grid-cols-1',
              projects?.items?.length === 2 && 'grid-cols-2',
            )}
          >
            {isLoadingProjects && <AccountSkeleton />}
            {!isLoadingProjects &&
              projects?.items?.map((project) => <ProjectCard key={project.id} project={project} />)}

            {!isLoadingProjects && !projects?.items?.length && (
              <p className="text-center text-muted-foreground pt-4 leading-loose">プロジェクトが存在しません</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
