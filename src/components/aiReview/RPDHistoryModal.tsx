import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Clock, FileText, Hash, Settings, User } from 'lucide-react';

import type { ExecutionHistoryResponse, LatestExecutedRPDsResponse } from '@/api/aiReviewsService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Separator } from '@/components/ui/Separator';

interface RPDHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: LatestExecutedRPDsResponse | undefined;
  executionHistory: ExecutionHistoryResponse | undefined;
  isLoading: boolean;
  isLoadingHistory: boolean;
  subtaskId: string;
}

export function RPDHistoryModal({
  isOpen,
  onClose,
  data,
  executionHistory,
  isLoading,
  isLoadingHistory,
}: RPDHistoryModalProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) {
      return '未実行';
    }
    try {
      return format(new Date(dateString), 'yyyy/MM/dd HH:mm', { locale: ja });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            最新のAI監修実行履歴
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {(() => {
            if (isLoading || isLoadingHistory) {
              return (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">読み込み中...</div>
                </div>
              );
            }

            // 优先显示执行历史信息，如果没有则显示旧的RPD数据
            const hasExecutionHistory = executionHistory && executionHistory.execution_status;
            const hasRPDData = data && data.ai_review_version;

            if (!hasExecutionHistory && !hasRPDData) {
              return (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <div className="text-muted-foreground">このサブタスクではまだAI監修が実行されていません</div>
                </div>
              );
            }

            // 优先显示执行历史信息
            if (hasExecutionHistory) {
              return (
                <div className="space-y-6">
                  {/* 実行概要 */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      実行概要
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground mb-1">AI監修バージョン</div>
                        <div className="font-semibold">v{executionHistory.ai_review_version}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">実行日時</div>
                        <div className="font-semibold">
                          {formatDate(
                            executionHistory.execution_completed_at || executionHistory.execution_started_at || null,
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">実行RPD数</div>
                        <div className="font-semibold">{executionHistory.rpd_details.length}個</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">総発見数</div>
                        <div className="font-semibold">{executionHistory.execution_summary.total_findings || 0}件</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          実行ユーザー
                        </div>
                        <div className="font-semibold">{executionHistory.executed_by_user?.display_name || '不明'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">実行モード</div>
                        <div className="font-semibold">
                          <Badge
                            variant={executionHistory.execution_parameters.mode === 'quality' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {executionHistory.execution_parameters.mode === 'quality' ? '高品質モード' : '高速モード'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* 実行ステータス */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-muted-foreground text-xs mb-1">実行ステータス</div>
                      <Badge
                        variant={(() => {
                          if (executionHistory.execution_status === 'completed') {
                            return 'default';
                          }
                          if (executionHistory.execution_status === 'failed') {
                            return 'destructive';
                          }
                          return 'secondary';
                        })()}
                        className="text-xs"
                      >
                        {(() => {
                          if (executionHistory.execution_status === 'completed') {
                            return '完了';
                          }
                          if (executionHistory.execution_status === 'failed') {
                            return '失敗';
                          }
                          if (executionHistory.execution_status === 'cancelled') {
                            return 'キャンセル';
                          }
                          return executionHistory.execution_status;
                        })()}
                      </Badge>
                      {executionHistory.error_message && (
                        <div className="text-xs text-destructive mt-1">{executionHistory.error_message}</div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* RPD リスト */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      実行されたRPD ({executionHistory.rpd_details.length}個)
                    </h4>

                    {executionHistory.rpd_details.map((rpd, index) => (
                      <div
                        key={`${rpd.id}-${index}`}
                        className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-medium truncate">{rpd.title}</h5>
                              <Badge variant="secondary" className="text-xs">
                                <Hash className="h-3 w-3 mr-1" />v{rpd.version_number}
                              </Badge>
                              {rpd.is_active_version && (
                                <Badge variant="outline" className="text-xs">
                                  Active
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mb-1">
                              RPDキー:{' '}
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {rpd.review_point_definition.key}
                              </code>
                            </div>
                            <div className="text-xs text-muted-foreground">作成日時: {formatDate(rpd.created_at)}</div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {executionHistory.rpd_details.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">実行されたRPDがありません</div>
                    )}
                  </div>
                </div>
              );
            }

            // 回退到原有的显示逻辑（使用旧的RPD数据）
            return (
              <div className="space-y-4">
                {/* 実行概要 - 旧形式 */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground mb-1">AI監修バージョン</div>
                      <div className="font-semibold">v{data!.ai_review_version}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">実行日時</div>
                      <div className="font-semibold">{formatDate(data!.executed_at)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">実行RPD数</div>
                      <div className="font-semibold">{data!.executed_rpds.length}個</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">総発見数</div>
                      <div className="font-semibold">{data!.total_findings}件</div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* RPD リスト - 旧形式 */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    実行されたRPD ({data!.executed_rpds.length}個)
                  </h4>

                  {data!.executed_rpds.map((rpd, index) => (
                    <div
                      key={`${rpd.rpd_key}-${index}`}
                      className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-medium truncate">{rpd.rpd_title}</h5>
                            <Badge variant="secondary" className="text-xs">
                              <Hash className="h-3 w-3 mr-1" />v{rpd.version_number}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mb-1">
                            RPDキー: <code className="text-xs bg-muted px-1 py-0.5 rounded">{rpd.rpd_key}</code>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <Badge variant={rpd.finding_count > 0 ? 'destructive' : 'secondary'} className="mb-1">
                            {rpd.finding_count}件の発見
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {data!.executed_rpds.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">実行されたRPDがありません</div>
                )}
              </div>
            );
          })()}
        </ScrollArea>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
