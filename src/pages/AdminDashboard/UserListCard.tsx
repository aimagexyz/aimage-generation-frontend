import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

import { type components } from '@/api/schemas';
import OrgBadges from '@/components/OrgBadges';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';

import { useAdminDashboard } from './hooks/useAdminDashboard';

type UserIn = components['schemas']['UserIn'];
type UserRole = components['schemas']['UserRole'];

const ROLES = ['admin', 'user'] as const satisfies UserRole[];

export function UserListCard() {
  const { userInfo } = useAuth();
  const { users, refetchUsers, addUser, changeUserRole } = useAdminDashboard();

  const [newUser, setNewUser] = useState<UserIn>({ email: '', display_name: '' });
  const [error, setError] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChangeUserRole = useCallback(
    (userId: string | null, role: UserRole) => {
      if (!userId || !role) {
        return;
      }
      if (!ROLES.includes(role)) {
        return;
      }
      if (userInfo?.id === userId) {
        toast({ description: '自分の役割は変更できません' });
        return;
      }

      changeUserRole(
        {
          userId,
          role,
        },
        {
          onSuccess: () => {
            refetchUsers()
              .then(() => {
                toast({ description: 'ユーザーの役割が正常に更新されました' });
              })
              .catch(console.error);
          },
          onError: (error) => {
            console.error('Failed to update user role:', error);
            toast({ description: 'ユーザーの役割の更新に失敗しました。もう一度お試しください。' });
          },
        },
      );
    },
    [changeUserRole, refetchUsers, userInfo?.id],
  );

  const handleAddUser = useCallback(() => {
    console.log('handleAddUser called', { newUser });

    if (!newUser.email.trim() || !newUser.display_name.trim()) {
      const errorMsg = 'メールアドレスと表示名は必須です';
      console.log('Validation error:', errorMsg);
      setError(errorMsg);
      return;
    }

    console.log('Calling addUser API with:', newUser);
    setError('');
    setIsLoading(true);

    addUser(
      {
        email: newUser.email,

        display_name: newUser.display_name,
      },
      {
        onSuccess: (response) => {
          console.log('addUser success:', response);
          refetchUsers()
            .then(() => {
              setNewUser({ email: '', display_name: '' });
              setIsAddUserOpen(false);
              toast({ description: 'ユーザーが正常に追加されました' });
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
        },
        onError: (error) => {
          console.error('addUser failed:', error);

          let errorMessage = 'ユーザーの追加に失敗しました。もう一度お試しください。';

          // 409 Conflictエラー（ユーザー既存）の場合、サーバーからのメッセージを表示
          if (error && typeof error === 'object' && 'response' in error) {
            const response = error.response as { status?: number; data?: { detail?: string } };
            if (response?.status === 409 && typeof response.data?.detail === 'string') {
              errorMessage = response.data.detail;
            }
          }

          setError(errorMessage);
          setIsLoading(false);
        },
      },
    );
  }, [addUser, newUser.display_name, newUser.email, refetchUsers]);

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            ユーザー ({users?.length}) <Button onClick={() => setIsAddUserOpen(true)}>新しいユーザーを追加</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-2 w-[22%]">ユーザーID</TableHead>
                <TableHead className="py-2 px-2 w-[16%]">表示名</TableHead>
                <TableHead className="py-2 px-2 w-[22%]">メールアドレス</TableHead>
                <TableHead className="py-2 px-2 w-[28%]">所属組織</TableHead>
                <TableHead className="py-2 px-2 w-[12%]">役割</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!!users?.length &&
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="py-2 px-2 font-mono text-xs">
                      <Link to={`./users/${user.id}`}>{user.id}</Link>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <Link to={`./users/${user.id}`}>{user.display_name}</Link>
                    </TableCell>
                    <TableCell className="py-2 px-2 font-mono text-xs">
                      <Link to={`./users/${user.id}`}>{user.email}</Link>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <OrgBadges orgs={user.joined_orgs} />
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <Select
                        value={user.role || undefined}
                        onValueChange={(role) => handleChangeUserRole(user.id, role as UserRole)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="役割を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {isAddUserOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>新しいユーザーを追加</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="メールアドレス"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  disabled={isLoading}
                />
                <Input
                  type="text"
                  placeholder="表示名"
                  value={newUser.display_name}
                  onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })}
                  disabled={isLoading}
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddUserOpen(false)} disabled={isLoading}>
                    キャンセル
                  </Button>
                  <Button onClick={handleAddUser} disabled={isLoading}>
                    {isLoading ? '追加中...' : 'ユーザーを追加'}
                  </Button>
                </div>
                {error && <p className="text-red-500 mt-2">{error}</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
