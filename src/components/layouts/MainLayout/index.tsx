import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Loading from '@/components/Loading';

import Header from './Header'; // Import Header

export function MainLayout() {
  const { pathname } = useLocation();

  const fallbackElement = {}[pathname] || <Loading />;

  return (
    <div className="flex flex-col bg-background h-svh overflow-hidden">
      <Header />
      <main className="w-full flex-1 overflow-hidden">
        <Suspense fallback={fallbackElement}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
