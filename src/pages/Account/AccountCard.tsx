import { LuKey, LuLogOut } from 'react-icons/lu';
import { Link } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export default function AccountCard() {
  const { userInfo, logout } = useAuth();

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
        <Avatar className="h-16 w-16">
          <AvatarImage alt={`${userInfo?.name || 'User'}`} src={userInfo?.avatarUrl} />
          <AvatarFallback>{userInfo?.name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{userInfo?.name || 'Username'}</h1>
          <p className="text-gray-500">{userInfo?.email || 'No email provided'}</p>
        </div>
        {userInfo?.role === 'admin' && (
          <Button variant="outline" asChild>
            <Link to="/admin-dashboard">
              <LuKey size={16} className="mr-2" />
              管理ダッシュボード
            </Link>
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => {
            logout().catch(console.error);
          }}
        >
          <LuLogOut size={16} className="mr-2" />
          ログアウト
        </Button>
      </div>
    </div>
  );
}
