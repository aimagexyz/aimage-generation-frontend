// Basic API client structure. Replace with your actual client if available.

const API_BASE_URL = (import.meta.env.VITE_FASTAPI_BASE_URL as string | undefined) || '/api/v1';

interface ApiErrorDetailItem {
  msg: string;
  type: string;
  loc?: (string | number)[];
}
interface ApiErrorData {
  detail?: string | ApiErrorDetailItem[];
}

export class ApiError extends Error {
  status: number;
  data: ApiErrorData;

  constructor(message: string, status: number, data: ApiErrorData) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('accessToken'); // Example: get token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.headers) {
    // Merge provided headers
    Object.assign(headers, options.headers as Record<string, string>);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: ApiErrorData = {};
    let errorMessage = response.statusText || 'API request failed';

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const parsedError = (await response.json()) as ApiErrorData;
        errorData = parsedError;
        if (typeof parsedError.detail === 'string') {
          errorMessage = parsedError.detail;
        } else if (Array.isArray(parsedError.detail) && parsedError.detail.length > 0) {
          errorMessage = parsedError.detail.map((d) => d.msg).join(', ');
        }
      } catch (parseError) {
        console.error('Failed to parse JSON error response:', parseError);
        // errorMessage remains response.statusText or default
      }
    }
    // For non-JSON responses, errorMessage will be response.statusText or the default.
    throw new ApiError(errorMessage, response.status, errorData);
  }

  if (response.status === 204) {
    // No Content
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(url: string, options?: RequestInit) => request<T>(url, { ...options, method: 'GET' }),
  post: <TData = unknown, TResponse = unknown>(url: string, data: TData, options?: RequestInit) =>
    request<TResponse>(url, { ...options, method: 'POST', body: JSON.stringify(data) }),
  put: <TData = unknown, TResponse = unknown>(url: string, data: TData, options?: RequestInit) =>
    request<TResponse>(url, { ...options, method: 'PUT', body: JSON.stringify(data) }),
  patch: <TData = unknown, TResponse = unknown>(url: string, data: TData, options?: RequestInit) =>
    request<TResponse>(url, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
  delete: <TResponse = unknown>(url: string, options?: RequestInit) =>
    request<TResponse>(url, { ...options, method: 'DELETE' }),
};
