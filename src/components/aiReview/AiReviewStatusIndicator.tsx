import { AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';

import { useAiReviewProcessingStatus } from '../../hooks/aiReview/useInitiateAiReview';
import type { AiReviewProcessingStatus } from '../../types/aiReview';

interface AiReviewStatusIndicatorProps {
  subtaskId: string;
  enabled?: boolean;
  onComplete?: (status: AiReviewProcessingStatus) => void;
  className?: string;
}

export function AiReviewStatusIndicator({
  subtaskId,
  enabled = true,
  onComplete,
  className,
}: AiReviewStatusIndicatorProps) {
  const {
    data: status,
    isLoading,
    error,
  } = useAiReviewProcessingStatus(subtaskId, {
    enabled,
    onComplete,
    pollingInterval: 10000, // 30秒間隔でポーリング
  });

  if (isLoading && !status) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        <span className="text-sm text-gray-600">処理状況を確認中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <AlertCircle className="w-4 h-4 text-red-500" />
        <span className="text-sm text-red-600">ステータス確認に失敗しました</span>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const getStatusIcon = () => {
    if (status.is_completed) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (status.is_processing) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    }
    return <Clock className="w-4 h-4 text-gray-500" />;
  };

  const getStatusBadge = () => {
    if (status.is_completed) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          完了
        </Badge>
      );
    }
    if (status.is_processing) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          処理中
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
        待機中
      </Badge>
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* ステータスヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">AI監修ステータス</span>
        </div>
        {getStatusBadge()}
      </div>

      {/* ステータスメッセージ */}
      <p className="text-sm text-gray-600">{status.message}</p>

      {/* 処理中の進捗表示 */}
      {status.is_processing && (
        <div className="space-y-2">
          <Progress value={undefined} className="w-full" />
          <p className="text-xs text-gray-500">AI分析を実行中です。しばらくお待ちください...</p>
        </div>
      )}
    </div>
  );
}

export default AiReviewStatusIndicator;
