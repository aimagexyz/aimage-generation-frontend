import Axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

import {
  HttpMethods,
  HttpMethodsFilteredByPath,
  RequestData,
  RequestParameters,
  ResponseData,
  UrlPaths,
} from '@/api/helper';
import { FASTAPI_BASE_URL } from '@/constants/env';

export const client = Axios.create({
  baseURL: FASTAPI_BASE_URL,
  withCredentials: true,
});

type AxiosConfigWrapper<Path extends UrlPaths, Method extends HttpMethods> = Omit<
  AxiosRequestConfig,
  'url' | 'method' | 'params' | 'data'
> & {
  url: Path;
  method: Method & HttpMethodsFilteredByPath<Path> & string;
  params?: RequestParameters<Path, Method>;
  data?: RequestData<Path, Method>;
};

export const setAuthorizationHeader = (token: string) => {
  client.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const removeAuthorizationHeader = () => {
  delete client.defaults.headers.common.Authorization;
};

export function fetchApi<Path extends UrlPaths, Method extends HttpMethods>(config: AxiosConfigWrapper<Path, Method>) {
  return client.request<
    ResponseData<Path, Method>,
    AxiosResponse<ResponseData<Path, Method>>,
    AxiosConfigWrapper<Path, Method>['data']
  >(config);
}

export const uploadRPDReferenceImage = async (projectId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetchApi({
    url: `/api/v1/projects/${projectId}/rpd-reference-images` as UrlPaths,
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data as {
    s3_path: string;
    url: string;
    filename: string;
    size: number;
  };
};

export const uploadRPDReferenceImagesBatch = async (
  projectId: string,
  files: File[],
  onProgress?: (progress: number, status: string) => void,
) => {
  const formData = new FormData();

  // Add all files to FormData
  files.forEach((file) => {
    formData.append('files', file);
  });

  // Simulate progress if callback provided
  if (onProgress) {
    onProgress(10, 'Preparing upload...');
  }

  const response = await fetchApi({
    url: `/api/v1/projects/${projectId}/rpd-reference-images/batch` as UrlPaths,
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress, 'Uploading files...');
      }
    },
  });

  if (onProgress) {
    onProgress(100, 'Upload completed');
  }

  return response.data as {
    project_id: string;
    uploaded_count: number;
    failed_count: number;
    uploaded_files: Array<{
      filename: string;
      s3_path: string;
      url: string;
      size: number;
    }>;
    failed_files: Array<{
      filename: string;
      error: string;
    }>;
    total_uploaded: number;
  };
};
