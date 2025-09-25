import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { LuCheck, LuClock, LuFileText, LuLoader, LuTriangle, LuUser, LuX } from 'react-icons/lu';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { BatchProcessingRecord } from '@/types/batchResults';

interface BatchRecordListProps {
  records: BatchProcessingRecord[];
  selectedRecord: BatchProcessingRecord | null;
  onSelectRecord: (record: BatchProcessingRecord) => void;
}

export function BatchRecordList({ records, selectedRecord, onSelectRecord }: BatchRecordListProps) {
  const getStatusBadge = (status: BatchProcessingRecord['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <LuCheck className="w-3 h-3 mr-1" />
            完了
          </Badge>
        );
      case 'running':
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
            <LuLoader className="w-3 h-3 mr-1 animate-spin" />
            実行中
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <LuX className="w-3 h-3 mr-1" />
            失敗
          </Badge>
        );
      case 'partial_success':
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <LuTriangle className="w-3 h-3 mr-1" />
            部分成功
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <LuClock className="w-3 h-3 mr-1" />
            待機中
          </Badge>
        );
      default:
        return null;
    }
  };

  const getProcessingTypeName = () => {
    // 所有处理类型统一显示为"バッチ処理"
    return 'バッチ処理';
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    }
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${remainingSeconds}秒`;
  };

  if (records.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <LuFileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">バッチ処理記録がありません</p>
        <p className="text-sm">フィルター条件を変更してみてください</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {records.map((record) => (
        <Button
          key={record.id}
          variant="ghost"
          className={`w-full p-4 h-auto justify-start text-left hover:bg-muted/50 ${
            selectedRecord?.id === record.id ? 'bg-muted border-l-4 border-l-primary' : ''
          }`}
          onClick={() => onSelectRecord(record)}
        >
          <div className="w-full space-y-3">
            {/* ヘッダー行 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">{record.batch_id}</span>
                {getStatusBadge(record.status)}
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(record.created_at), 'MM/dd HH:mm', { locale: ja })}
              </span>
            </div>

            {/* 処理タイプと申請者 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LuFileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{getProcessingTypeName()}</span>
              </div>
              <div className="flex items-center gap-1">
                <LuUser className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{record.initiated_by_user_name || 'Unknown User'}</span>
              </div>
            </div>

            {/* 統計情報 */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>総数: {record.total_tasks}</span>
                <span className="text-green-600">成功: {record.successful_tasks}</span>
                {record.failed_tasks > 0 && <span className="text-red-600">失敗: {record.failed_tasks}</span>}
              </div>
              {record.completed_at && (
                <div className="flex items-center gap-1">
                  <LuClock className="w-3 h-3" />
                  <span>{formatDuration(record.total_processing_time_seconds)}</span>
                </div>
              )}
            </div>
          </div>
        </Button>
      ))}
    </div>
  );
}
