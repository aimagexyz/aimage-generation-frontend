import '@/index.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layouts/MainLayout';
import Loading from '@/components/Loading';
import { Toaster } from '@/components/ui/Toaster';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useAutoChangeTheme } from '@/hooks/useTheme';

import ReferenceGenerationPage from './pages/ReferenceGeneration';
import { queryClient } from './queryClient';

const AccountPage = lazy(() => import('@/pages/Account'));
const NotFound = lazy(() => import('@/pages/NotFound'));
// Only keep account page and reference generation

function RootRedirect() {
  const { currentProjectId, notSignedIn } = useAuth();
  if (notSignedIn || !currentProjectId) {
    return <Navigate to="/account" replace />;
  }
  return <Navigate to={`/projects/${currentProjectId}/reference-generation`} replace />;
}

function App() {
  useAutoChangeTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="" element={<MainLayout />}>
                  <Route index element={<RootRedirect />} />
                  <Route path="account" element={<AccountPage />} />
                  <Route
                    path="projects/:projectId/reference-generation"
                    element={
                      <ProtectedRoute requireProject>
                        <ReferenceGenerationPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
