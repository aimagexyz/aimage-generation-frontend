import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useBatchDetail, useBatchList } from '@/hooks/batch/useBatchData';
import type { BatchProcessingFilters, BatchProcessingRecord } from '@/types/batchResults';

import { BatchDetailPanel } from './components/BatchDetailPanel';
import { BatchRecordList } from './components/BatchRecordList';
// 統計カード - 一時的にコメントアウト
// import { BatchStatsCards } from './components/BatchStatsCards';

export default function BatchResultsPage() {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const [selectedRecord, setSelectedRecord] = useState<BatchProcessingRecord | null>(null);
  const [filters, setFilters] = useState<BatchProcessingFilters>({});

  // 从URL查询参数获取要预选择的batchId
  const selectedBatchId = searchParams.get('selectedBatch');

  // 真实的API调用
  const { data: records = [], isLoading: recordsLoading, error: recordsError } = useBatchList(projectId);

  // 当数据加载完成且有指定的batchId时，自动选择对应的记录
  useEffect(() => {
    if (selectedBatchId && records.length > 0 && !selectedRecord) {
      const targetRecord = records.find((record) => record.batch_id === selectedBatchId);
      if (targetRecord) {
        setSelectedRecord(targetRecord);
      }
    }
  }, [selectedBatchId, records, selectedRecord]);
  // 統計情報のAPI調用 - 一時的にコメントアウト
  // const { data: stats, isLoading: statsLoading, error: statsError } = useBatchStats(projectId);
  const { data: detailRecord, isLoading: detailLoading } = useBatchDetail(selectedRecord?.id || null);

  // フィルタリング処理
  const filteredRecords = useMemo(() => {
    return records.filter((record): boolean => {
      if (filters.processing_type && record.processing_type !== filters.processing_type) {
        return false;
      }
      if (filters.status && record.status !== filters.status) {
        return false;
      }
      if (filters.search_query) {
        const query = filters.search_query.toLowerCase();
        return (
          record.batch_id.toLowerCase().includes(query) ||
          Boolean(record.initiated_by_user_name?.toLowerCase().includes(query)) ||
          Boolean(record.initiated_by_user_email?.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [records, filters]);

  const handleFilterChange = (key: keyof BatchProcessingFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value || undefined,
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const renderDetailPanel = () => {
    if (!selectedRecord) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-lg font-medium mb-2">バッチ処理結果を選択</p>
            <p className="text-sm">
              左側のリストから処理結果を選択すると、
              <br />
              詳細情報がここに表示されます
            </p>
          </div>
        </div>
      );
    }

    if (detailLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">詳細情報を読み込んでいます...</p>
          </div>
        </div>
      );
    }

    if (detailRecord) {
      return <BatchDetailPanel record={detailRecord} />;
    }

    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-lg font-medium mb-2">詳細情報の読み込みに失敗しました</p>
          <p className="text-sm">しばらく時間をおいてから再度お試しください</p>
        </div>
      </div>
    );
  };

  if (!projectId) {
    return <div>プロジェクトが見つかりません</div>;
  }

  // エラーハンドリング
  if (recordsError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">データの読み込みに失敗しました</h2>
          <p className="text-gray-600">しばらく時間をおいてから再度お試しください。</p>
        </div>
      </div>
    );
  }

  // ローディング状態
  if (recordsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ページヘッダー */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">バッチ処理結果</h1>
              <p className="text-muted-foreground">過去のバッチ処理の実行履歴と結果を確認できます</p>
            </div>
          </div>

          {/* 統計カード - 未来使用のため一時的にコメントアウト */}
          {/* <div className="mt-6">{stats && <BatchStatsCards stats={stats} />}</div> */}

          {/* フィルター */}
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="バッチID、申請者で検索..."
                value={filters.search_query || ''}
                onChange={(e) => handleFilterChange('search_query', e.target.value)}
              />
            </div>
            <Select
              value={filters.processing_type || undefined}
              onValueChange={(value) => handleFilterChange('processing_type', value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="処理タイプ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="copyright_check">コピーライトチェック</SelectItem>
                <SelectItem value="scenario_check">シナリオチェック</SelectItem>
                <SelectItem value="image_analysis">画像解析</SelectItem>
                <SelectItem value="content_review">コンテンツレビュー</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status || undefined} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="completed">完了</SelectItem>
                <SelectItem value="running">実行中</SelectItem>
                <SelectItem value="failed">失敗</SelectItem>
                <SelectItem value="partial_success">部分成功</SelectItem>
                <SelectItem value="pending">待機中</SelectItem>
              </SelectContent>
            </Select>
            {(filters.processing_type || filters.status || filters.search_query) && (
              <Button variant="outline" onClick={handleClearFilters}>
                フィルタークリア
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex min-h-0">
        {/* 左側：バッチ記録リスト */}
        <div className="w-1/2 border-r flex flex-col">
          <div className="flex-shrink-0 p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">処理履歴 ({filteredRecords.length}件)</h2>
              {filteredRecords.length !== records.length && (
                <Badge variant="secondary">
                  {records.length}件中{filteredRecords.length}件表示
                </Badge>
              )}
            </div>
          </div>
          <ScrollArea className="flex-1">
            <BatchRecordList
              records={filteredRecords}
              selectedRecord={selectedRecord}
              onSelectRecord={setSelectedRecord}
            />
          </ScrollArea>
        </div>

        {/* 右側：詳細パネル */}
        <div className="w-1/2 flex flex-col">{renderDetailPanel()}</div>
      </div>
    </div>
  );
}
