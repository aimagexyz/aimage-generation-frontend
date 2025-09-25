import { FASTAPI_BASE_URL } from '@/constants/env';

// 定义 LoginResponse 类型
interface LoginResponse {
  user_id: string;
}

// 本地存储键名
const AUTH_USER_ID_KEY = 'auth_user_id';

/**
 * 使用 Google ID token 登录
 * @param token Google ID token
 * @returns 登录响应
 */
export async function loginWithGoogle(token: string): Promise<LoginResponse> {
  const requestUrl = `${FASTAPI_BASE_URL}/api/v1/auth/google`;

  // 创建请求配置
  const requestConfig = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
    mode: 'cors' as RequestMode,
    credentials: 'include' as RequestCredentials,
  };

  // 发送请求
  const response = await fetch(requestUrl, requestConfig);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`APIリクエストが失敗しました: ${response.status} ${errorText}`);
  }

  // 解析响应数据
  const data = (await response.json()) as LoginResponse;

  // 验证响应数据包含必要的字段
  if (data && typeof data === 'object' && 'user_id' in data) {
    const loginResponse = {
      user_id: String(data.user_id),
    };

    // 只存储用户ID
    localStorage.setItem(AUTH_USER_ID_KEY, loginResponse.user_id);

    return loginResponse;
  } else {
    throw new Error('無効なログイン応答データです');
  }
}

/**
 * 登出
 */
export async function logout(): Promise<void> {
  // 调用后端登出接口清除Cookie
  const requestUrl = `${FASTAPI_BASE_URL}/api/v1/auth/logout`;

  try {
    await fetch(requestUrl, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout API call failed:', error);
  }

  // 清除本地存储
  localStorage.removeItem(AUTH_USER_ID_KEY);
}

/**
 * 获取存储的用户 ID
 * @returns 用户 ID 或 null
 */
export function getUserId(): string | null {
  return localStorage.getItem(AUTH_USER_ID_KEY);
}

/**
 * 检查用户是否已登录
 * @returns 是否已登录
 */
export function isAuthenticated(): boolean {
  return !!getUserId();
}
