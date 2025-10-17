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
