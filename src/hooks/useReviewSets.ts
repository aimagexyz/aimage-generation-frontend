import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  type ReviewSetCreate,
  type ReviewSetOut,
  reviewSetsService,
  type ReviewSetUpdate,
} from '@/api/reviewSetsService';

// Query Keys - 使用更精确的键结构
const REVIEW_SETS_QUERY_KEY = 'review-sets';

// 创建查询键工厂函数
export const reviewSetsQueryKeys = {
  all: () => [REVIEW_SETS_QUERY_KEY] as const,
  lists: () => [...reviewSetsQueryKeys.all(), 'list'] as const,
  list: (projectId: string) => [...reviewSetsQueryKeys.lists(), projectId] as const,
  details: () => [...reviewSetsQueryKeys.all(), 'detail'] as const,
  detail: (reviewSetId: string) => [...reviewSetsQueryKeys.details(), reviewSetId] as const,
};

/**
 * Hook to fetch review sets for a project with optimized caching
 */
export const useReviewSets = (projectId: string, enabled = true) => {
  return useQuery<ReviewSetOut[]>({
    queryKey: reviewSetsQueryKeys.list(projectId),
    queryFn: () => reviewSetsService.listReviewSets(projectId),
    enabled: !!projectId && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * Hook to fetch a single review set with optimized caching
 */
export function useReviewSet(reviewSetId: string) {
  return useQuery<ReviewSetOut>({
    queryKey: reviewSetsQueryKeys.detail(reviewSetId),
    queryFn: () => reviewSetsService.getReviewSet(reviewSetId),
    enabled: !!reviewSetId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to create a new review set with optimized cache updates
 */
export function useCreateReviewSet() {
  const queryClient = useQueryClient();

  return useMutation<ReviewSetOut, Error, ReviewSetCreate>({
    mutationFn: (data: ReviewSetCreate) => reviewSetsService.createReviewSet(data),
    onSuccess: (newReviewSet: ReviewSetOut) => {
      // 精确更新缓存而不是完全失效
      queryClient.setQueryData<ReviewSetOut[]>(reviewSetsQueryKeys.list(newReviewSet.project_id), (old = []) => [
        ...old,
        newReviewSet,
      ]);

      // 设置详情缓存
      queryClient.setQueryData(reviewSetsQueryKeys.detail(newReviewSet.id), newReviewSet);

      toast.success('レビューセットが作成されました');
    },
    onError: (error) => {
      console.error('Failed to create review set:', error);
      toast.error('レビューセットの作成に失敗しました');
    },
  });
}

/**
 * Hook to update a review set with optimized cache updates
 */
export function useUpdateReviewSet() {
  const queryClient = useQueryClient();

  return useMutation<ReviewSetOut, Error, { reviewSetId: string; data: ReviewSetUpdate }>({
    mutationFn: ({ reviewSetId, data }: { reviewSetId: string; data: ReviewSetUpdate }) =>
      reviewSetsService.updateReviewSet(reviewSetId, data),
    onSuccess: (updatedReviewSet: ReviewSetOut) => {
      // 精确更新缓存
      queryClient.setQueryData(reviewSetsQueryKeys.detail(updatedReviewSet.id), updatedReviewSet);

      // 更新列表中的项目
      queryClient.setQueryData<ReviewSetOut[]>(reviewSetsQueryKeys.list(updatedReviewSet.project_id), (old = []) =>
        old.map((item) => (item.id === updatedReviewSet.id ? updatedReviewSet : item)),
      );

      toast.success('レビューセットが更新されました');
    },
    onError: (error) => {
      console.error('Failed to update review set:', error);
      toast.error('レビューセットの更新に失敗しました');
    },
  });
}

/**
 * Hook to delete a review set with optimized cache updates
 */
export function useDeleteReviewSet() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, string>({
    mutationFn: async (reviewSetId: string) => {
      await reviewSetsService.deleteReviewSet(reviewSetId);
      return reviewSetId;
    },
    onSuccess: (deletedReviewSetId: string) => {
      // 获取要删除的项目信息以确定项目ID
      const allQueries = queryClient.getQueriesData<ReviewSetOut[]>({
        queryKey: reviewSetsQueryKeys.lists(),
      });

      // 从所有项目列表中移除该项目
      allQueries.forEach(([queryKey, data]) => {
        if (data) {
          const updatedData = data.filter((item) => item.id !== deletedReviewSetId);
          queryClient.setQueryData(queryKey, updatedData);
        }
      });

      // 移除详情缓存
      queryClient.removeQueries({
        queryKey: reviewSetsQueryKeys.detail(deletedReviewSetId),
      });

      toast.success('レビューセットが削除されました');
    },
    onError: (error) => {
      console.error('Failed to delete review set:', error);
      toast.error('レビューセットの削除に失敗しました');
    },
  });
}
