import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchApi } from '@/api/client';
import { type components } from '@/api/schemas';
import { useAuth } from '@/hooks/useAuth';

type UserIn = components['schemas']['UserIn'];

type UserRole = components['schemas']['UserRole'];

export function useAdminDashboard() {
  const { userInfo } = useAuth();
  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ['users', userInfo?.id, userInfo?.role],
    queryFn: () => fetchApi({ url: '/api/v1/admin/users', method: 'get' }).then((res) => res.data.items),
    enabled: userInfo?.role === 'admin',
  });

  const { data: projects, refetch: refetchProjects } = useQuery({
    queryKey: ['projects', userInfo?.id, userInfo?.role],
    queryFn: () => fetchApi({ url: '/api/v1/admin/projects', method: 'get' }).then((res) => res.data.items),
    enabled: userInfo?.role === 'admin',
  });

  const { mutate: addUser } = useMutation({
    mutationFn: (data: UserIn) => fetchApi({ url: '/api/v1/admin/users', method: 'post', data }),
  });

  const { mutate: changeUserRole } = useMutation({
    mutationFn: (data: { userId: string; role: UserRole }) =>
      fetchApi({
        url: `/api/v1/admin/users/${data.userId}` as '/api/v1/admin/users/{user_id}',
        method: 'patch',
        params: {
          role: data.role,
        },
      }),
  });

  const value = useMemo(
    () => ({
      users,
      refetchUsers,
      projects,
      refetchProjects,
      addUser,
      changeUserRole,
    }),
    [addUser, changeUserRole, projects, refetchProjects, refetchUsers, users],
  );

  return value;
}
