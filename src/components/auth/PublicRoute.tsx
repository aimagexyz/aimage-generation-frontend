import { Navigate, useLocation } from 'react-router-dom';

import Loading from '@/components/Loading';
import { useAuth } from '@/hooks/useAuth';

interface LocationState {
  from?: {
    pathname: string;
  };
}

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function PublicRoute({ children, redirectTo = '/' }: PublicRouteProps) {
  const { userInfo, loading } = useAuth();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const from = locationState?.from?.pathname || redirectTo;

  if (loading) {
    return <Loading />;
  }

  if (userInfo) {
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}
