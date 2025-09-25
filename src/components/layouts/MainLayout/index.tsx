import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Loading from '@/components/Loading';

import Header from './Header'; // Import Header

export function MainLayout() {
  const { pathname } = useLocation();

  // Check if we're on the reference generation page
  const isReferenceGenerationPage = pathname.includes('/reference-generation');

  const fallbackElement = {}[pathname] || <Loading />;

  return (
    <div
      className={`flex flex-col bg-background ${isReferenceGenerationPage ? 'h-screen overflow-hidden' : 'min-h-screen'}`}
    >
      <Header />
      <main
        className={`mx-auto w-full max-w-screen-2xl ${isReferenceGenerationPage ? 'flex-1 overflow-hidden' : 'flex-1 p-4 md:p-6 lg:p-8'}`}
      >
        <Suspense fallback={fallbackElement}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
