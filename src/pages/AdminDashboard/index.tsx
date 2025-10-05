import { Navigate } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';

import { UserListCard } from './UserListCard';

export default function AdminDashboardPage() {
  const { userInfo, notSignedIn } = useAuth();

  if (notSignedIn) {
    return <Navigate to="/account" />;
  }

  if (!userInfo) {
    return <div>Loading...</div>;
  }

  if (userInfo?.role !== 'admin') {
    return <div>You do not have permission to access this page.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-screen-2xl mb-6 flex flex-col gap-6">
      <h1 className="text-3xl font-bold">管理ダッシュボード</h1>

      {/* User List */}
      <UserListCard />
    </div>
  );
}
