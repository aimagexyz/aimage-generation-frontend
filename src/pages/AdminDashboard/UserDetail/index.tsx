import { Navigate, useParams } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';

import { useUserDetail } from '../hooks/useUserDetail';
import { UserInformationCard } from './UserInformationCard';

type Params = {
  userId: string;
};

export default function UserDetailPage() {
  const { userId } = useParams<Params>();

  const { notSignedIn } = useAuth();

  const { user, userError } = useUserDetail(userId!);

  if (notSignedIn) {
    return <Navigate to="/account" />;
  }

  if (!userId || userError) {
    return (
      <div>
        <h1>No user ID provided or user not found</h1>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-screen-md mb-6 flex flex-col gap-6">
      <h1 className="text-3xl font-bold">User Detail</h1>
      <UserInformationCard user={user} />
    </div>
  );
}
