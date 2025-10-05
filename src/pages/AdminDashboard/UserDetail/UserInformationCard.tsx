import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { type components } from '@/api/schemas';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';

import { useUserDetail } from '../hooks/useUserDetail';

type UserRole = components['schemas']['UserRole'];
type UserOut = components['schemas']['UserOut'];

const ROLES = ['admin', 'user'] as const satisfies UserRole[];

type Props = {
  user: UserOut;
};

export function UserInformationCard(props: Props) {
  const { user } = props;
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const { refetchUser, changeUserRole, deleteUser } = useUserDetail(user.id);

  const handleChangeUserRole = useCallback(
    (role: UserRole) => {
      if (!user.id || !role) {
        return;
      }
      if (!ROLES.includes(role)) {
        return;
      }
      if (userInfo?.id === user.id) {
        toast({ description: 'You cannot change your own role' });
        return;
      }

      changeUserRole(
        {
          role,
        },
        {
          onSuccess: () => {
            refetchUser()
              .then(() => {
                toast({ description: 'User role updated successfully' });
              })
              .catch(console.error);
          },
          onError: (error) => {
            console.error('Failed to update user role:', error);
            toast({ description: 'Failed to update user role. Please try again.' });
          },
        },
      );
    },
    [changeUserRole, refetchUser, user.id, userInfo?.id],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <div>
            <div className="text-sm text-muted-foreground">ID(UUID)</div>
            <div>{user.id}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Name</div>
            <div>{user.display_name}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Email</div>
            <div>{user.email}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Role</div>
            <div>
              <Select value={user.role || undefined} onValueChange={(role) => handleChangeUserRole(role as UserRole)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a role" />
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
            </div>
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              className="text-red-500 hover:text-red-600"
              onClick={() => {
                if (!user.id) {
                  return;
                }
                if (userInfo?.id === user.id) {
                  toast({ description: 'You cannot delete yourself' });
                  return;
                }
                if (!window.confirm('Are you sure you want to delete this user?')) {
                  return;
                }

                deleteUser(undefined, {
                  onSuccess: () => {
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    navigate('..');
                    toast({ description: 'User deleted successfully' });
                  },
                  onError: (error) => {
                    console.error('Failed to delete user:', error);
                    toast({ description: 'Failed to delete user. Please try again.' });
                  },
                });
              }}
            >
              Delete User
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
