import { useMutation, useQuery } from '@tanstack/react-query';

import { fetchApi } from '@/api/client';
import { type components } from '@/api/schemas';
import { useAuth } from '@/hooks/useAuth';

type UserRole = components['schemas']['UserRole'];

export function useUserDetail(userId: string) {
  const { userInfo } = useAuth();

  const {
    data: user,
    refetch: refetchUser,
    error: userError,
  } = useQuery({
    queryKey: ['user', userInfo?.id, userInfo?.role, userId],
    queryFn: () =>
      fetchApi({ url: `/api/v1/users/${userId}` as '/api/v1/users/{user_id}', method: 'get' }).then((res) => res.data),
    enabled: !!userId && userInfo?.role === 'admin',
  });

  const { data: userProjects, refetch: refetchUserProjects } = useQuery({
    queryKey: ['userProjects', userInfo?.id, userInfo?.role, userId],
    queryFn: () =>
      fetchApi({
        url: `/api/v1/admin/users/${userId}/projects` as '/api/v1/admin/users/{user_id}/projects',
        method: 'get',
      }).then((res) => res.data.items),
    enabled: !!userId && userInfo?.role === 'admin',
  });

  const { mutate: changeUserRole } = useMutation({
    mutationFn: (data: { role: UserRole }) =>
      fetchApi({
        url: `/api/v1/admin/users/${userId}` as '/api/v1/admin/users/{user_id}',
        method: 'patch',
        params: {
          role: data.role,
        },
      }),
  });

  const { mutate: deleteUser } = useMutation({
    mutationFn: () =>
      fetchApi({ url: `/api/v1/admin/users/${userId}` as '/api/v1/admin/users/{user_id}', method: 'delete' }),
  });

  // const { mutate: addUserToProject } = useMutation({
  //   mutationFn: (data: { projectId: string }) =>
  //     fetchApi({
  //       url: `/api/v1/admin/users/${userId}/projects/${data.projectId}` as '/api/v1/admin/users/{user_id}/projects/{project_id}',
  //       method: 'post',
  //     }),
  // });

  // const { mutate: removeUserFromProject } = useMutation({
  //   mutationFn: (data: { projectId: string }) =>
  //     fetchApi({
  //       url: `/api/v1/admin/users/${userId}/projects/${data.projectId}` as '/api/v1/admin/users/{user_id}/projects/{project_id}',
  //       method: 'delete',
  //     }),
  // });

  return {
    user,
    userError,
    refetchUser,
    userProjects,
    refetchUserProjects,
    changeUserRole,
    deleteUser,
    // addUserToProject,
    // removeUserFromProject,
  };
}
