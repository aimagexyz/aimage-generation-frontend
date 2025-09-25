import { type QueryObserverResult, type RefetchOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchApi } from '@/api/client';
import type { components } from '@/api/schemas';
import { useQueryEvents } from '@/hooks/useQueryEvents';
import { getUserId, logout as authLogout } from '@/services/auth';
import { toUUID, UUID } from '@/types/common';

type Page_ProjectSimpleOut_ = components['schemas']['Page_ProjectSimpleOut_'];

interface UserInfo {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  role: 'admin' | 'user' | 'uploader';
}

interface AuthContextType {
  notSignedIn: boolean;
  loading: boolean;
  userInfo: UserInfo | undefined;
  projects: Page_ProjectSimpleOut_ | undefined;
  isLoadingProjects: boolean;
  currentProjectId: UUID | undefined;
  setCurrentProjectId: (id: UUID | undefined) => void;
  logout: () => Promise<void>;
  updateProjects: (options?: RefetchOptions) => Promise<QueryObserverResult<Page_ProjectSimpleOut_, Error>>;
  refreshUserInfo: (options?: RefetchOptions) => Promise<QueryObserverResult<UserInfo, Error>>;
}

const context = createContext<AuthContextType | undefined>(undefined);

interface Props {
  children: React.ReactNode;
}

export function AuthProvider(props: Props) {
  const { children } = props;
  const [currentProjectId, setCurrentProjectIdState] = useState<UUID | undefined>(() => {
    const storedId = localStorage.getItem('currentProjectId');
    return storedId ? toUUID(storedId) : undefined;
  });

  const setCurrentProjectId = useCallback((id: UUID | undefined) => {
    if (id) {
      localStorage.setItem('currentProjectId', id.toString());
    } else {
      localStorage.removeItem('currentProjectId');
    }
    setCurrentProjectIdState(id);
  }, []);

  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(getUserId());

  const logout = useCallback(async () => {
    try {
      await authLogout();
      queryClient.clear();
      setUserId(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [queryClient]);

  const userInfoQuery = useQuery<UserInfo>({
    queryKey: ['userInfo', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('ログインしていません');
      }

      try {
        // 获取用户信息
        const response = await fetchApi({
          url: '/api/v1/users/me',
          method: 'get',
        });

        const userData = response.data as unknown as {
          id: string;
          email: string;
          display_name: string;
          avatar_url?: string;
          role: 'admin' | 'user' | 'uploader' | null;
        };

        setLoading(false);

        return {
          id: userData.id,
          email: userData.email,
          name: userData.display_name,
          avatarUrl: userData.avatar_url || '',
          role: userData.role || 'user',
        };
      } catch (error) {
        console.error('Get user info failed:', error);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60,
  });

  const { data: userInfo, error: userError, refetch: refreshUserInfo } = userInfoQuery;

  useEffect(() => {
    if (userError) {
      console.warn('userInfo error:', userError);
      logout().catch(console.error);
      setLoading(false);
    }
  }, [userError, logout]);

  useEffect(() => {
    const storedUserId = getUserId();

    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProjectsQuery = useQuery({
    queryKey: ['projects', userId],
    queryFn: () => fetchApi({ url: '/api/v1/projects', method: 'get' }).then((res) => res.data),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

  const { data: projects, refetch: updateProjects, isLoading: isLoadingProjects } = fetchProjectsQuery;

  useQueryEvents(fetchProjectsQuery, {
    onSuccess: (data) => {
      if (data && data.items) {
        const hasCurrentProject = data.items.some(
          (project) => project.id && currentProjectId && toUUID(project.id) === currentProjectId,
        );
        if (!!data.items.length && (!currentProjectId || !hasCurrentProject)) {
          const firstProject = data.items[0];
          if (firstProject && firstProject.id) {
            setCurrentProjectId(toUUID(firstProject.id));
          }
        } else if (data.items.length === 0) {
          setCurrentProjectId(undefined);
        }
      }
    },
  });

  const notSignedIn = !userInfo && !isLoadingProjects;

  const contextValue = useMemo(
    () => ({
      notSignedIn,
      loading,
      userInfo,
      projects,
      isLoadingProjects,
      currentProjectId,
      setCurrentProjectId,
      logout,
      updateProjects,
      refreshUserInfo,
    }),
    [
      notSignedIn,
      loading,
      userInfo,
      projects,
      isLoadingProjects,
      currentProjectId,
      setCurrentProjectId,
      logout,
      updateProjects,
      refreshUserInfo,
    ],
  );

  return <context.Provider value={contextValue}>{children}</context.Provider>;
}

export function useAuth() {
  const ctx = useContext(context);
  if (!ctx) {
    throw new Error('useAuthはAuthProviderの中で使用する必要があります');
  }
  return ctx;
}
