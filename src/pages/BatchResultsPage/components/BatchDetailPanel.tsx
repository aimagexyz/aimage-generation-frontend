import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import {
  LuCalendar,
  LuCheck,
  LuChevronLeft,
  LuChevronRight,
  LuClock,
  LuDownload,
  LuFileText,
  LuRefreshCw,
  LuTriangle,
  LuUser,
  LuX,
} from 'react-icons/lu';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import type { BatchProcessingRecord } from '@/types/batchResults';

interface BatchDetailPanelProps {
  record: BatchProcessingRecord;
}

export function BatchDetailPanel({ record }: BatchDetailPanelProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // 当 record 数据变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [record.id]);

  // 计算任务状态统计 - 基于实际的task_results数据
  const getTaskStatusStats = () => {
    // 从task_results中统计实际的状态
    const actualResults = record.task_results.reduce(
      (acc, task) => {
        if (task.status === 'success') {
          acc.successful++;
        } else if (task.status === 'failed') {
          acc.failed++;
        } else if (task.status === 'skipped') {
          acc.skipped++;
        }
        return acc;
      },
      { successful: 0, failed: 0, skipped: 0 },
    );

    // 实际已处理的任务数（有明确结果的）
    const actualCompleted = actualResults.successful + actualResults.failed + actualResults.skipped;

    // 待处理的任务数
    const pending = record.total_tasks - actualCompleted;

    // 智能估算正在处理的任务数
    let processing = 0;
    if (record.status === 'running' && pending > 0) {
      // 基于经验估算并发数（后端通常为5），但不超过待处理任务数
      const estimatedMaxConcurrent = 5; // 可通过后端API优化
      processing = Math.min(estimatedMaxConcurrent, pending);
    }

    const actualPending = Math.max(0, pending - processing);

    return {
      successful: actualResults.successful,
      failed: actualResults.failed,
      skipped: actualResults.skipped,
      processing,
      pending: actualPending,
      completed: actualCompleted,
    };
  };

  const taskStats = getTaskStatusStats();

  // 计算分页信息
  const totalItems = record.task_results.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = record.task_results.slice(startIndex, endIndex);

  // 计算显示的页码范围
  const getPageNumbers = () => {
    const delta = 2; // 当前页前后显示的页数
    const range = [];
    const rangeWithDots = [];

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    let prev = 0;
    for (const i of range) {
      if (prev + 1 !== i) {
        rangeWithDots.push('...');
      }
      rangeWithDots.push(i);
      prev = i;
    }

    return rangeWithDots;
  };

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
            <LuClock className="w-3 h-3 mr-1" />
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
      return `${hours}時間${minutes}分${remainingSeconds}秒`;
    }
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${remainingSeconds}秒`;
  };

  const successRate = record.total_tasks > 0 ? (record.successful_tasks / record.total_tasks) * 100 : 0;

  // 計算各severity的統計
  const severityStats = record.task_results.reduce(
    (acc, task) => {
      if (task.severity === 'high') {
        acc.high++;
      } else if (task.severity === 'medium') {
        acc.medium++;
      } else if (task.severity === 'low') {
        acc.low++;
      } else if (task.severity === 'failed') {
        acc.failed++;
      } else {
        acc.none++;
      }
      return acc;
    },
    { high: 0, medium: 0, low: 0, failed: 0, none: 0 },
  );

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="flex-shrink-0 p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">{record.batch_id}</h2>
            <p className="text-sm text-muted-foreground">{getProcessingTypeName()}</p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(record.status)}
            <Button variant="outline" size="sm">
              <LuDownload className="w-4 h-4 mr-2" />
              エクスポート
            </Button>
            {record.status === 'failed' && (
              <Button variant="outline" size="sm">
                <LuRefreshCw className="w-4 h-4 mr-2" />
                再実行
              </Button>
            )}
          </div>
        </div>

        {/* 進捗バー */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>処理進捗</span>
            <span>
              {taskStats.completed}/{record.total_tasks} 完了
              {taskStats.processing > 0 && <span className="text-blue-600 ml-2">({taskStats.processing}件処理中)</span>}
            </span>
          </div>
          <Progress value={(taskStats.completed / record.total_tasks) * 100} />
          <div className="flex justify-between text-xs text-muted-foreground flex-wrap gap-2">
            <span className="text-green-600">成功: {taskStats.successful}</span>
            <span className="text-red-600">失敗: {taskStats.failed}</span>
            {taskStats.skipped > 0 && <span className="text-gray-600">スキップ: {taskStats.skipped}</span>}
            {taskStats.processing > 0 && (
              <span className="text-blue-600 flex items-center">
                <LuClock className="w-3 h-3 mr-1 animate-spin" />
                処理中: {taskStats.processing}
              </span>
            )}
            {taskStats.pending > 0 && <span className="text-muted-foreground">待機中: {taskStats.pending}</span>}
          </div>
        </div>
      </div>

      {/* 詳細情報 */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          {/* 基本情報カード */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LuFileText className="w-5 h-5" />
                基本情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">申請者</label>
                  <div className="flex items-center gap-2 mt-1">
                    <LuUser className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{record.initiated_by_user_name || 'Unknown User'}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">開始時刻</label>
                  <div className="flex items-center gap-2 mt-1">
                    <LuCalendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(record.created_at), 'yyyy/MM/dd HH:mm:ss', { locale: ja })}
                    </span>
                  </div>
                </div>
                {record.completed_at && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">完了時刻</label>
                      <div className="flex items-center gap-2 mt-1">
                        <LuCalendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(record.completed_at), 'yyyy/MM/dd HH:mm:ss', { locale: ja })}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">処理時間</label>
                      <div className="flex items-center gap-2 mt-1">
                        <LuClock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{formatDuration(record.total_processing_time_seconds)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {record.error_summary && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{record.error_summary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 統計情報カード */}
          <Card>
            <CardHeader>
              <CardTitle>処理統計</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 基本統計 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{record.total_tasks}</div>
                  <div className="text-sm text-muted-foreground">総タスク数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{record.successful_tasks}</div>
                  <div className="text-sm text-muted-foreground">成功</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{record.failed_tasks}</div>
                  <div className="text-sm text-muted-foreground">失敗</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">成功率</div>
                </div>
              </div>

              {/* 検出結果統計 */}
              {(severityStats.high > 0 ||
                severityStats.medium > 0 ||
                severityStats.low > 0 ||
                severityStats.failed > 0) && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">検出結果分布</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-medium">High</span>
                      </div>
                      <div className="text-lg font-bold text-red-600">{severityStats.high}</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm font-medium">Medium</span>
                      </div>
                      <div className="text-lg font-bold text-yellow-600">{severityStats.medium}</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium">Low</span>
                      </div>
                      <div className="text-lg font-bold text-blue-600">{severityStats.low}</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                        <span className="text-sm font-medium">Failed</span>
                      </div>
                      <div className="text-lg font-bold text-gray-600">{severityStats.failed}</div>
                    </div>
                  </div>

                  {/* 視覚的な分布バー */}
                  <div className="mt-3">
                    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                      {severityStats.high > 0 && (
                        <div
                          className="bg-red-500"
                          style={{
                            width: `${(severityStats.high / (severityStats.high + severityStats.medium + severityStats.low + severityStats.failed)) * 100}%`,
                          }}
                        ></div>
                      )}
                      {severityStats.medium > 0 && (
                        <div
                          className="bg-yellow-500"
                          style={{
                            width: `${(severityStats.medium / (severityStats.high + severityStats.medium + severityStats.low + severityStats.failed)) * 100}%`,
                          }}
                        ></div>
                      )}
                      {severityStats.low > 0 && (
                        <div
                          className="bg-blue-500"
                          style={{
                            width: `${(severityStats.low / (severityStats.high + severityStats.medium + severityStats.low + severityStats.failed)) * 100}%`,
                          }}
                        ></div>
                      )}
                      {severityStats.failed > 0 && (
                        <div
                          className="bg-gray-500"
                          style={{
                            width: `${(severityStats.failed / (severityStats.high + severityStats.medium + severityStats.low + severityStats.failed)) * 100}%`,
                          }}
                        ></div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* タスク詳細テーブル */}
          <Card>
            <CardHeader>
              <CardTitle>タスク詳細</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>サブタスク名</TableHead>
                    <TableHead>処理状況</TableHead>
                    <TableHead>検出レベル</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPageData.map((task) => (
                    <TableRow key={task.task_id}>
                      <TableCell className="font-medium max-w-[300px] truncate" title={task.task_name}>
                        {task.parent_task_id && record.project_id ? (
                          <Link
                            to={`/projects/${record.project_id}/tasks/${task.parent_task_id}?subtaskId=${task.subtask_id}`}
                            className="text-primary hover:underline cursor-pointer"
                          >
                            {task.task_name}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-700">{task.task_name}</span>
                            {!task.parent_task_id && (
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">削除済み</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.severity === 'failed' ? (
                          <Badge variant="destructive">
                            <LuX className="w-3 h-3 mr-1" />
                            失敗
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                            <LuCheck className="w-3 h-3 mr-1" />
                            成功
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.severity === 'high' && <Badge variant="destructive">High</Badge>}
                        {task.severity === 'medium' && (
                          <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            Medium
                          </Badge>
                        )}
                        {task.severity === 'low' && (
                          <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                            Low
                          </Badge>
                        )}
                        {(task.severity === 'failed' || !task.severity) && '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分页控件 */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {totalItems}件中 {startIndex + 1}-{Math.min(endIndex, totalItems)}件を表示
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <LuChevronLeft className="w-4 h-4" />
                      前へ
                    </Button>
                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((page, index) =>
                        page === '...' ? (
                          <span key={`dots-${index}`} className="px-2 text-muted-foreground">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={page}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(page as number)}
                          >
                            {page}
                          </Button>
                        ),
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      次へ
                      <LuChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
