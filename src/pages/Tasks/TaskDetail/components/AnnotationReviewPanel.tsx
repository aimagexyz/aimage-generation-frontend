import clsx from 'clsx';
import { formatDate } from 'date-fns';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { LuBot } from 'react-icons/lu';

import { AiReviewCitationDisplay } from '@/components/citations/AiReviewCitationDisplay';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserAvatarNameLabel } from '@/components/UserAvatarNameLabel';

import { CountBadge, ResetButton, SeverityPill } from './shared/ReviewPanelComponents';
import type { AnnotationReviewFinding, ReviewInteractionType, ReviewSeverity } from './shared/ReviewPanelTypes';
import {
  calculateSeverityCounts,
  filterFindingsBySeverity,
  getSeverityStyles,
  mapLegacySeverity,
} from './shared/ReviewPanelUtils';

// 标注审查面板Header组件
interface AnnotationReviewPanelHeaderProps {
  onRefreshAnnotations?: () => Promise<void>;
  isRefreshing?: boolean;
  totalAnnotationsCount: number;
}

function AnnotationReviewPanelHeader({
  onRefreshAnnotations,
  isRefreshing,
  totalAnnotationsCount,
}: AnnotationReviewPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold">専門標注結果</h3>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">全{totalAnnotationsCount}件の標注</span>
        {onRefreshAnnotations && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void onRefreshAnnotations();
            }}
            disabled={isRefreshing}
            className="h-8 text-xs"
          >
            {isRefreshing ? (
              <AiOutlineLoading3Quarters className="mr-1.5 size-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 size-3" />
            )}
            更新
          </Button>
        )}
      </div>
    </div>
  );
}

// 标注审查摘要组件
interface AnnotationReviewSummaryProps {
  timestamp: string;
  riskSeverityCount: number;
  alertSeverityCount: number;
  safeSeverityCount: number;
  filterCounts: Record<ReviewSeverity, number>;
  selectedSeverities: ReviewSeverity[];
  onFilterChange: (severity: ReviewSeverity, isChecked: boolean) => void;
  onResetFilters: () => void;
  canResetFilters: boolean;
}

function AnnotationReviewSummary({
  timestamp,
  riskSeverityCount,
  alertSeverityCount,
  safeSeverityCount,
  filterCounts,
  selectedSeverities,
  onFilterChange,
  onResetFilters,
  canResetFilters,
}: AnnotationReviewSummaryProps) {
  const contextualMessage = () => {
    if (riskSeverityCount > 0) {
      return '専門標注でリスクの問題が検出されました。特に注意してください。';
    }
    if (riskSeverityCount === 0 && alertSeverityCount === 0 && safeSeverityCount === 0) {
      return '専門標注では明確な問題は見つかりませんでした。';
    }
    return '専門標注が完了しました。結果を確認してください。';
  };

  const totalSeverityCount = riskSeverityCount + alertSeverityCount + safeSeverityCount;
  const severitiesOrder: ReviewSeverity[] = ['risk', 'alert', 'safe'];

  return (
    <>
      {contextualMessage() && <p className="mb-2 text-xs text-muted-foreground">{contextualMessage()}</p>}

      {totalSeverityCount > 0 && (
        <div className="mb-2 h-2.5 w-full flex rounded-sm overflow-hidden bg-muted">
          {(riskSeverityCount / totalSeverityCount) * 100 > 0 && (
            <div
              className={getSeverityStyles('risk').bgColorClass}
              style={{
                width: `${(riskSeverityCount / totalSeverityCount) * 100}%`,
              }}
              title={`リスク: ${((riskSeverityCount / totalSeverityCount) * 100).toFixed(1)}%`}
            />
          )}
          {(alertSeverityCount / totalSeverityCount) * 100 > 0 && (
            <div
              className={getSeverityStyles('alert').bgColorClass}
              style={{
                width: `${(alertSeverityCount / totalSeverityCount) * 100}%`,
              }}
              title={`アラート: ${((alertSeverityCount / totalSeverityCount) * 100).toFixed(1)}%`}
            />
          )}
          {(safeSeverityCount / totalSeverityCount) * 100 > 0 && (
            <div
              className={getSeverityStyles('safe').bgColorClass}
              style={{
                width: `${(safeSeverityCount / totalSeverityCount) * 100}%`,
              }}
              title={`セーフ: ${((safeSeverityCount / totalSeverityCount) * 100).toFixed(1)}%`}
            />
          )}
        </div>
      )}

      {/* 过滤器部分 */}
      <div className="pt-2 mt-2 border-t border-border/60">
        <div className="flex flex-row items-center justify-start py-1 gap-x-2">
          {severitiesOrder.map((severity) => {
            const count = filterCounts[severity] || 0;
            const isChecked = selectedSeverities.includes(severity);
            const severityStyles = getSeverityStyles(severity);
            const uniqueId = `annotation-filter-item-${severity}`;
            const isDisabled = count === 0 && !isChecked;

            let itemClasses =
              'flex items-center justify-between group p-1.5 rounded-md transition-colors border-transparent';
            if (isDisabled) {
              itemClasses = clsx(itemClasses, 'opacity-60 cursor-not-allowed bg-muted/20');
            } else if (isChecked) {
              itemClasses = clsx(itemClasses, 'hover:border-muted-foreground/60 hover:bg-muted/30');
            } else {
              itemClasses = clsx(itemClasses, 'border-border hover:border-muted-foreground/60 hover:bg-muted/30');
            }

            return (
              <div key={severity} className={itemClasses}>
                <label
                  htmlFor={uniqueId}
                  className={clsx(
                    'flex items-center flex-grow gap-1 cursor-pointer',
                    isDisabled && 'cursor-not-allowed',
                  )}
                >
                  <Checkbox
                    id={uniqueId}
                    checked={isChecked}
                    onCheckedChange={(checked) => !isDisabled && onFilterChange(severity, !!checked)}
                    disabled={isDisabled}
                  />
                  <SeverityPill
                    severity={severity}
                    showShortCode={false}
                    className={clsx(
                      'transition-all group-hover:opacity-80 text-[9px] !h-5 !px-1.5',
                      isChecked && 'ring-2 ring-offset-1',
                      isChecked && severityStyles.pillSelectedBorderColor,
                    )}
                  />
                </label>
                <CountBadge count={count} className="text-[8px] !size-3" />
              </div>
            );
          })}
          <ResetButton onClick={onResetFilters} disabled={!canResetFilters} />
        </div>
      </div>
      <div className="pt-2 mt-2 text-xs border-t border-border/60 text-muted-foreground">
        標注日時: {new Date(timestamp).toLocaleString()}
      </div>
    </>
  );
}

// 标注查找项目组件
interface AnnotationReviewFindingItemProps {
  finding: AnnotationReviewFinding;
  isActive: boolean;
  onInteraction: (action: ReviewInteractionType, findingId: string) => void;
  onViewImageCitation: (imageUrl: string, sourceText?: string) => void;
  order?: number;
}

function AnnotationReviewFindingItem({
  finding,
  isActive,
  onInteraction,
  onViewImageCitation,
  order,
}: AnnotationReviewFindingItemProps) {
  const severityStyles = getSeverityStyles(finding.severity);

  const renderAuthorInfo = () => {
    if (finding.author) {
      return <UserAvatarNameLabel size="small" userId={finding.author} className="flex-shrink-0" />;
    }
    return (
      <div className="flex items-center flex-shrink-0 gap-1 text-muted-foreground">
        <LuBot className="size-4" />
        <span className="text-sm">AI標注</span>
      </div>
    );
  };

  const renderTypeAndTime = () => {
    let typeDisplay = 'AI標注';
    if (finding.type === 'annotation') {
      typeDisplay = 'マーク';
    } else if (finding.type === 'comment') {
      typeDisplay = 'コメント';
    }
    const timeDisplay = finding.timestamp ? formatDate(new Date(finding.timestamp), 'yyyy-MM-dd HH:mm') : '';

    return (
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {renderAuthorInfo()}
          {finding.type === 'annotation' && Boolean(order) && (
            <span className="text-xs text-green-600 font-semibold">
              {typeDisplay}
              {order}
              {finding.startAt !== undefined && finding.startAt !== null && (
                <span>（{finding.startAt.toFixed(2)}秒）</span>
              )}
            </span>
          )}
        </div>
        {timeDisplay && <span className="text-xs text-muted-foreground">{timeDisplay}</span>}
      </div>
    );
  };

  return (
    <div
      id={`annotation-finding-item-${finding.id}`}
      className={clsx(
        'p-3 rounded-md bg-muted/30 transition-all border-l-4 break-words overflow-hidden',
        severityStyles.borderColorClass,
        isActive && 'ring-2 ring-primary bg-primary/10 border-primary/50',
        finding.solved && 'opacity-75 bg-gray-100',
      )}
      onMouseEnter={() => onInteraction('enter', finding.id)}
      onMouseLeave={() => onInteraction('leave', finding.id)}
      onClick={() => onInteraction('click', finding.id)}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
    >
      {renderTypeAndTime()}

      <p className={clsx('text-sm mb-2', finding.solved && 'line-through text-muted-foreground')}>
        {finding.description}
      </p>

      <div className="flex items-center gap-2 mb-2">
        <SeverityPill severity={finding.severity} />
        {finding.solved && (
          <Badge variant="secondary" className="text-xs">
            解決済み
          </Badge>
        )}
        {finding.type && (
          <Badge variant="outline" className="text-xs">
            {(() => {
              if (finding.type === 'annotation') {
                return '標注';
              }
              if (finding.type === 'comment') {
                return 'コメント';
              }
              return 'AI標注';
            })()}
          </Badge>
        )}
      </div>

      {finding.suggestion && <p className="mt-1 text-xs text-muted-foreground">提案: {finding.suggestion}</p>}

      <AiReviewCitationDisplay
        referenceImages={finding.referenceImages}
        referenceSource={finding.referenceSource}
        onViewImageCitation={onViewImageCitation}
      />
    </div>
  );
}

// 主要的标注审查面板组件
export interface AnnotationReviewPanelProps {
  annotations: AnnotationReviewFinding[];
  activeFindingId: string | null;
  onFindingInteraction: (action: ReviewInteractionType, findingId: string) => void;
  onViewImageCitation: (imageUrl: string, sourceText?: string) => void;
  onRefreshAnnotations?: () => Promise<void>;
  isRefreshing?: boolean;
  isLoading?: boolean;
  timestamp?: string;
}

export function AnnotationReviewPanel({
  annotations,
  activeFindingId,
  onFindingInteraction,
  onViewImageCitation,
  onRefreshAnnotations,
  isRefreshing,
  isLoading,
  timestamp = new Date().toISOString(),
}: AnnotationReviewPanelProps) {
  const [selectedSeverities, setSelectedSeverities] = useState<ReviewSeverity[]>([]);

  // 处理旧的severity值，映射到新的值
  const processedAnnotations = useMemo(() => {
    return annotations.map((annotation) => ({
      ...annotation,
      severity: mapLegacySeverity(annotation.severity),
    }));
  }, [annotations]);

  // 计算严重程度计数
  const severityCounts = useMemo(() => calculateSeverityCounts(processedAnnotations), [processedAnnotations]);

  // 过滤后的标注
  const filteredAnnotations = useMemo(() => {
    return filterFindingsBySeverity(processedAnnotations, selectedSeverities);
  }, [processedAnnotations, selectedSeverities]);

  // 初始化选中的严重程度
  useEffect(() => {
    if (processedAnnotations.length > 0) {
      const initialSelected: ReviewSeverity[] = [];
      const severitiesOrder: ReviewSeverity[] = ['risk', 'alert']; // 默认勾选这些级别，保持显示状态和勾选状态同步

      severitiesOrder.forEach((severity) => {
        if (severityCounts[severity] > 0) {
          initialSelected.push(severity);
        }
      });
      setSelectedSeverities(initialSelected);
    } else {
      setSelectedSeverities([]);
    }
  }, [processedAnnotations.length, severityCounts]);

  const handleFilterChange = useCallback((severity: ReviewSeverity, isChecked: boolean) => {
    setSelectedSeverities((prev) => {
      if (isChecked) {
        return [...prev, severity];
      }
      return prev.filter((s) => s !== severity);
    });
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedSeverities([]);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <AiOutlineLoading3Quarters className="size-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">標注データを読み込み中...</span>
      </div>
    );
  }

  if (processedAnnotations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-full p-4 text-center bg-background">
        <div className="w-full max-w-md p-6 py-10 border rounded-lg shadow-md bg-card">
          <MessageSquare className="w-12 h-12 mx-auto mb-5 text-primary" />
          <h3 className="mb-2 text-xl font-semibold text-card-foreground">専門標注</h3>
          <p className="mb-6 text-sm text-muted-foreground">このサブタスクにはまだ専門標注がありません。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 整体状态卡片 */}
      <Card className="mb-4">
        <CardHeader className="p-4 pb-3">
          <AnnotationReviewPanelHeader
            onRefreshAnnotations={onRefreshAnnotations}
            isRefreshing={isRefreshing}
            totalAnnotationsCount={processedAnnotations.length}
          />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <AnnotationReviewSummary
            timestamp={timestamp}
            riskSeverityCount={severityCounts.risk}
            alertSeverityCount={severityCounts.alert}
            safeSeverityCount={severityCounts.safe}
            filterCounts={severityCounts}
            selectedSeverities={selectedSeverities}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            canResetFilters={selectedSeverities.length > 0}
          />
        </CardContent>
      </Card>

      {/* 标注列表 */}
      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {filteredAnnotations.map((annotation, index) => (
            <Card key={annotation.id} className="p-0 overflow-hidden">
              <CardContent className="p-3">
                <AnnotationReviewFindingItem
                  finding={annotation}
                  isActive={activeFindingId === annotation.id}
                  onInteraction={onFindingInteraction}
                  onViewImageCitation={onViewImageCitation}
                  order={annotation.order || index + 1}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
