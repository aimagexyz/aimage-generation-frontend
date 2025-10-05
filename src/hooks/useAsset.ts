import { useQuery } from '@tanstack/react-query';

import { fetchApi } from '@/api/client';

interface UseAssetOptions {
  forceRefresh?: number;
  disableCache?: boolean; // 新增选项：是否禁用缓存
}

export function useAsset(s3Path: string, options?: UseAssetOptions) {
  const { forceRefresh, disableCache = false } = options || {};

  const { data: s3Url, isLoading } = useQuery({
    queryKey: ['s3Url', s3Path, forceRefresh], // 添加forceRefresh参数确保获取新的签名URL
    queryFn: () =>
      fetchApi({
        url: '/api/v1/assets',
        method: 'get',
        params: { s3_path: s3Path },
      }).then((res) => res.data.url),
    enabled: !!s3Path,
    staleTime: disableCache ? 0 : 1000 * 60 * 60, // 根据选项决定缓存时间：禁用缓存或1小时
    gcTime: disableCache ? 0 : 1000 * 60 * 60 * 24, // 根据选项决定垃圾回收时间：立即回收或24小时
  });
  return { assetUrl: s3Url || '', isAssetLoading: isLoading };
}
