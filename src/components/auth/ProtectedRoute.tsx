import { Navigate, useLocation } from 'react-router-dom';

import Loading from '@/components/Loading';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'user' | 'uploader')[];
  requireProject?: boolean;
}

export function ProtectedRoute({ children, allowedRoles, requireProject = false }: ProtectedRouteProps) {
  const { userInfo, loading, notSignedIn, currentProjectId } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading />;
  }

  if (notSignedIn) {
    return <Navigate to="/account" state={{ from: location }} replace />;
  }

  if (allowedRoles && userInfo && !allowedRoles.includes(userInfo.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold mb-4">アクセス権限がありません</h1>
        <p className="text-muted-foreground mb-6">このページにアクセスするには適切な権限が必要です。</p>
        <Navigate to="/" replace />
      </div>
    );
  }

  if (requireProject && !currentProjectId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold mb-4">プロジェクトが選択されていません</h1>
        <p className="text-muted-foreground mb-6">プロジェクトを選択してからアクセスしてください。</p>
        <Navigate to="/account" replace />
      </div>
    );
  }

  return <>{children}</>;
}
