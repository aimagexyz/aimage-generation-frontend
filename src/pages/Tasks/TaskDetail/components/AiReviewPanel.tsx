import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  Bot,
  Check,
  Circle,
  Clock,
  Copy,
  Loader2,
  MessageSquare,
  Play,
  RefreshCw,
  Square,
  StopCircle,
  X,
} from 'lucide-react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

import { aiReviewsService } from '@/api/aiReviewsService';
import { RPDHistoryModal } from '@/components/aiReview/RPDHistoryModal';
import { AiReviewCitationDisplay } from '@/components/citations/AiReviewCitationDisplay';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import { useExecutionHistory } from '@/hooks/aiReview/useExecutionHistory';
import { useInitiateAiReview } from '@/hooks/aiReview/useInitiateAiReview';
import { useInterruptAiReview } from '@/hooks/aiReview/useInterruptAiReview';
import { useLatestExecutedRPDs } from '@/hooks/aiReview/useLatestExecutedRPDs';
import { useUpdateFindingFixedStatus } from '@/hooks/aiReview/useUpdateFindingFixedStatus';
import type { AiReviewResult, DetectedElement, DetectedElementType } from '@/types/aiReview';
import type { SubtaskType } from '@/types/AiReviewFinding';

import { TaskDetailContext } from '../context/TaskDetailContext';

// Local type for findings as displayed in this panel, matching the user provided structure
export type AiReviewPanelFinding = {
  id: string;
  description: string;
  severity: 'risk' | 'alert' | 'safe';
  suggestion?: string;
  area?: { x: number; y: number; width: number; height: number };
  reference_images?: string[];
  reference_source?: string;
  tag?: string[]; // 标签列表
  is_fixed?: boolean; // 标记该finding是否已被修复
  content_type?: SubtaskType; // 内容类型
  content_metadata?: Record<string, unknown>;
};

type FindingSeverity = AiReviewPanelFinding['severity']; // Use the renamed local type

// --- START DetectedElementItemSkeleton --- //
// function DetectedElementItemSkeleton() {
//   return (
//     <div className="p-3 mb-3 border rounded-lg shadow-sm bg-background animate-pulse last:mb-0">
//       {/* Element Name Skeleton */}
//       <div className="w-3/4 h-5 mb-2 rounded bg-muted"></div>
//       {/* Element Type and Confidence Skeleton / Action Buttons */}
//       <div className="flex items-center justify-between mb-3">
//         <div className="w-1/2 h-4 rounded bg-muted"></div> {/* Type & Confidence */}
//         {/* Action Buttons Skeleton */}
//         <div className="flex space-x-2">
//           <div className="rounded-full w-7 h-7 bg-muted"></div>
//           <div className="rounded-full w-7 h-7 bg-muted"></div>
//         </div>
//       </div>
//       {/* Confidence Bar Placeholder Skeleton */}
//       <div className="w-full h-3 rounded bg-muted"></div>
//     </div>
//   );
// }
// --- END DetectedElementItemSkeleton --- //

export type FindingInteractionType = 'enter' | 'leave' | 'click';

// New helper function for severity-based styling
interface SeverityStyleDetails {
  textColor: string;
  bgColorClass: string;
  borderColorClass: string;
  badgeClasses: string;
  summaryTextClass: string;
  pillTextColor: string;
  pillBgColor: string;
  pillSelectedBorderColor: string;
}

function getSeverityStyles(severity: FindingSeverity): SeverityStyleDetails {
  const commonPillTextColor = 'text-white';

  if (severity === 'risk') {
    return {
      textColor: 'text-red-700 dark:text-red-400',
      bgColorClass: 'bg-[#C53030]',
      borderColorClass: 'border-[#C53030]',
      badgeClasses:
        'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
      summaryTextClass: 'text-red-600 dark:text-red-500 font-medium',
      pillTextColor: commonPillTextColor,
      pillBgColor: 'bg-[#C53030]',
      pillSelectedBorderColor: 'border-[#C53030]',
    };
  }
  if (severity === 'alert') {
    return {
      textColor: 'text-yellow-700 dark:text-yellow-400',
      bgColorClass: 'bg-[#F7B32B]',
      borderColorClass: 'border-[#F7B32B]',
      badgeClasses:
        'bg-yellow-100 text-yellow-700 border border-yellow-400 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700',
      summaryTextClass: 'text-yellow-600 dark:text-yellow-500 font-medium',
      pillTextColor: commonPillTextColor,
      pillBgColor: 'bg-[#F7B32B]',
      pillSelectedBorderColor: 'border-[#F7B32B]',
    };
  }
  return {
    textColor: 'text-emerald-700 dark:text-emerald-400',
    bgColorClass: 'bg-[#208E3D]',
    borderColorClass: 'border-[#208E3D]',
    badgeClasses:
      'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700',
    summaryTextClass: 'text-emerald-600 dark:text-emerald-500 font-medium',
    pillTextColor: commonPillTextColor,
    pillBgColor: 'bg-[#208E3D]',
    pillSelectedBorderColor: 'border-[#208E3D]',
  };
}

const getSeverityPillTextAndShortCode = (severity: FindingSeverity): { text: string; shortCode: 'R' | 'A' | 'S' } => {
  if (severity === 'risk') {
    return { text: 'リスク', shortCode: 'R' };
  }
  if (severity === 'alert') {
    return { text: 'アラート', shortCode: 'A' };
  }
  return { text: 'セーフ', shortCode: 'S' };
};

// --- START NEW UI COMPONENTS AS PER SPEC ---

interface SeverityPillProps {
  severity: FindingSeverity;
  showShortCode?: boolean;
  className?: string;
}

function SeverityPill({ severity, showShortCode = true, className }: SeverityPillProps) {
  const styles = getSeverityStyles(severity);
  const { text, shortCode } = getSeverityPillTextAndShortCode(severity);

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center px-3 py-1 h-[24px] rounded-full text-xs font-medium whitespace-nowrap',
        styles.pillBgColor,
        styles.pillTextColor,
        className,
      )}
    >
      {text}
      {showShortCode && <span className="ml-1.5 font-semibold">{shortCode}</span>}
    </span>
  );
}

interface CountBadgeProps {
  count: number;
  className?: string;
}

function CountBadge({ count, className }: CountBadgeProps) {
  return (
    <span
      className={clsx(
        'flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-gray-700 rounded-full',
        className,
      )}
    >
      {count}
    </span>
  );
}

interface ResetButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

function ResetButton({ onClick, disabled }: ResetButtonProps) {
  return (
    <Button
      variant="link"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-auto p-0 text-xs text-blue-500 hover:text-blue-600 disabled:text-muted-foreground disabled:no-underline"
      aria-label="フィルターをリセット"
    >
      <X className="mr-1 size-3" />
      リセット
    </Button>
  );
}

// --- END NEW UI COMPONENTS ---

// Note: AI Review Mode Selector is now handled by UnifiedReviewModal

// --- START Copy Button Component --- //
interface CopyButtonProps {
  text: string;
  size?: 'sm' | 'xs';
  className?: string;
}

function CopyButton({ text, size = 'xs', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // 防止触发父元素的点击事件
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(true);
          toast({
            title: 'コピーしました',
            description: 'テキストがクリップボードにコピーされました',
            duration: 2000,
          });
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          toast({
            title: 'エラー',
            description: 'コピーに失敗しました',
            variant: 'destructive',
            duration: 2000,
          });
        });
    },
    [text],
  );

  return (
    <Button
      size={size}
      variant="ghost"
      className={clsx(
        'transition-all duration-200 shrink-0',
        size === 'xs' ? 'h-6 w-6 p-0' : 'h-8 w-8 p-0',
        copied ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'hover:bg-slate-100 dark:hover:bg-slate-700',
        className,
      )}
      onClick={handleCopy}
      aria-label="テキストをコピー"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </Button>
  );
}
// --- END Copy Button Component --- //

// --- START Video Findings Grouping Logic --- //
interface VideoFindingGroup {
  timeRange: string;
  startTimestamp: number;
  endTimestamp?: number;
  findings: AiReviewPanelFinding[];
  sceneNumber?: number;
}

function groupVideoFindingsByTimestamp(findings: AiReviewPanelFinding[]): VideoFindingGroup[] {
  // 只处理视频类型的findings
  const videoFindings = findings.filter(
    (finding) => finding.content_type === 'video' && finding.content_metadata?.start_timestamp != null,
  );

  if (videoFindings.length === 0) {
    return [];
  }

  // 按开始时间戳分组
  const groups = new Map<string, VideoFindingGroup>();

  videoFindings.forEach((finding) => {
    const startTimestamp = finding.content_metadata?.start_timestamp as number;
    const endTimestamp = finding.content_metadata?.end_timestamp as number | undefined;
    const sceneNumber = finding.content_metadata?.scene_number as number | undefined;

    // 创建分组键，使用开始时间戳作为主要标识
    const groupKey = `${Math.floor(startTimestamp)}-${endTimestamp ? Math.floor(endTimestamp) : Math.floor(startTimestamp)}`;

    if (!groups.has(groupKey)) {
      // 格式化时间范围显示
      const formatTimestamp = (timestamp: number): string => {
        const minutes = Math.floor(timestamp / 60);
        const seconds = (timestamp % 60).toFixed(2);
        return `${minutes}:${seconds.padStart(5, '0')}`;
      };

      const timeRange =
        endTimestamp && endTimestamp !== startTimestamp
          ? `${formatTimestamp(startTimestamp)} - ${formatTimestamp(endTimestamp)}`
          : formatTimestamp(startTimestamp);

      groups.set(groupKey, {
        timeRange,
        startTimestamp,
        endTimestamp,
        findings: [],
        sceneNumber,
      });
    }

    groups.get(groupKey)!.findings.push(finding);
  });

  // 按时间戳排序并返回
  return Array.from(groups.values()).sort((a, b) => a.startTimestamp - b.startTimestamp);
}

// --- END Video Findings Grouping Logic --- //

// --- START Video Finding Group Component --- //
interface VideoFindingGroupProps {
  group: VideoFindingGroup;
  activeFindingId: string | null;
  onFindingInteraction: (action: FindingInteractionType, findingId: string) => void;
  onViewImageCitation: (imageUrl: string, sourceText?: string) => void;
  onFixStatusUpdate: (findingId: string, newIsFixed: boolean) => Promise<void>;
  isUpdatingFixStatus: boolean;
  // 新增：播放状态管理
  currentPlayingGroup: string | null;
  onPlaybackStateChange: (groupId: string | null) => void;
}

function VideoFindingGroup({
  group,
  activeFindingId,
  onFindingInteraction,
  onViewImageCitation,
  onFixStatusUpdate,
  isUpdatingFixStatus,
  currentPlayingGroup,
  onPlaybackStateChange,
}: VideoFindingGroupProps) {
  // 生成唯一的组ID
  const groupId = useMemo(
    () => `${group.startTimestamp}-${group.endTimestamp || group.startTimestamp}`,
    [group.startTimestamp, group.endTimestamp],
  );

  // 当前组是否正在播放
  const isPlaying = currentPlayingGroup === groupId;

  // 存储当前的时间更新监听器
  const timeUpdateListenerRef = useRef<(() => void) | null>(null);

  // 清理时间监听器
  const clearTimeListener = useCallback(() => {
    if (timeUpdateListenerRef.current) {
      const videoElement = document.getElementById('annotation-video-player') as HTMLVideoElement;
      if (videoElement) {
        videoElement.removeEventListener('timeupdate', timeUpdateListenerRef.current);
      }
      timeUpdateListenerRef.current = null;
    }
  }, []);

  // 处理跳转到时间点（不播放）
  const handleJumpToTimestamp = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const videoElement = document.getElementById('annotation-video-player') as HTMLVideoElement;
      const audioElement = document.getElementById('annotation-audio-player') as HTMLAudioElement;

      if (!videoElement && !audioElement) {
        console.warn('Video/Audio player not found');
        return;
      }

      // 跳转到开始时间但不播放
      const targetElement = videoElement || audioElement;
      if (targetElement) {
        targetElement.currentTime = group.startTimestamp;

        // 如果当前正在播放，先暂停
        if (!targetElement.paused) {
          targetElement.pause();
        }

        // 清理之前的监听器
        clearTimeListener();

        // 不设置播放状态，保持暂停状态
        onPlaybackStateChange(null);
      }
    },
    [group.startTimestamp, clearTimeListener, onPlaybackStateChange],
  );

  // 处理播放/暂停切换
  const handlePlayPauseToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const videoElement = document.getElementById('annotation-video-player') as HTMLVideoElement;
      const audioElement = document.getElementById('annotation-audio-player') as HTMLAudioElement;

      if (!videoElement && !audioElement) {
        console.warn('Video/Audio player not found');
        return;
      }

      const targetElement = videoElement || audioElement;
      if (!targetElement) {
        return;
      }

      // 如果当前正在播放这个片段，则暂停
      if (isPlaying) {
        targetElement.pause();
        clearTimeListener();
        onPlaybackStateChange(null);
        return;
      }

      // 停止其他片段的播放
      if (currentPlayingGroup !== null) {
        clearTimeListener();
      }

      // 确保时间位置正确（如果不在区间内则跳转到开始时间）
      if (
        targetElement.currentTime < group.startTimestamp ||
        (group.endTimestamp && targetElement.currentTime >= group.endTimestamp)
      ) {
        targetElement.currentTime = group.startTimestamp;
      }

      // 设置播放状态
      onPlaybackStateChange(groupId);

      // 开始播放
      targetElement.play().catch((error) => {
        console.error('Failed to play video segment:', error);
        onPlaybackStateChange(null);
      });

      // 如果有结束时间，设置监听器在结束时间暂停
      if (group.endTimestamp && group.endTimestamp > group.startTimestamp) {
        const handleTimeUpdate = () => {
          if (targetElement.currentTime >= group.endTimestamp!) {
            targetElement.pause();
            clearTimeListener();
            onPlaybackStateChange(null);
          }
        };

        timeUpdateListenerRef.current = handleTimeUpdate;
        targetElement.addEventListener('timeupdate', handleTimeUpdate);
      }
    },
    [
      group.startTimestamp,
      group.endTimestamp,
      groupId,
      isPlaying,
      currentPlayingGroup,
      clearTimeListener,
      onPlaybackStateChange,
    ],
  );

  // 组件卸载时清理监听器
  useEffect(() => {
    return () => {
      clearTimeListener();
    };
  }, [clearTimeListener]);

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-2 px-2 py-1 border rounded-md transition-colors cursor-pointer text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:text-blue-800"
              onClick={handleJumpToTimestamp}
              title="クリックして該当の時間にジャンプ"
            >
              <Clock className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-medium">
                {group.timeRange}秒
                {group.sceneNumber != null && (
                  <span className="ml-2 text-xs opacity-75">（シーン{group.sceneNumber}）</span>
                )}
              </h4>
            </button>

            {/* 播放/暂停切换按钮 */}
            <button
              type="button"
              className={clsx(
                'flex items-center justify-center w-8 h-8 border rounded transition-colors',
                isPlaying
                  ? 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100'
                  : 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100',
              )}
              onClick={handlePlayPauseToggle}
              title={isPlaying ? '一時停止' : '再生'}
            >
              {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>
          <Badge variant="secondary" className="text-xs">
            {group.findings.length}件
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {group.findings.map((finding, index) => (
            <AiReviewFindingItem
              key={finding.id || index}
              finding={finding}
              isActive={activeFindingId === finding.id}
              onInteraction={onFindingInteraction}
              onViewImageCitation={onViewImageCitation}
              onFixStatusUpdate={onFixStatusUpdate}
              isUpdatingFixStatus={isUpdatingFixStatus}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
// --- END Video Finding Group Component --- //

// --- START Simple Loading Component --- //
function SimpleLoadingSpinner() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[400px] bg-background">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    </div>
  );
}
// --- END Simple Loading Component --- //

// --- START AiReviewPanelHeader --- //
interface AiReviewPanelHeaderProps {
  onRerunAll?: () => Promise<void>;
  isRerunningAll?: boolean;
  detectedElements?: AiReviewResult['detected_elements'] | null;
  isFetchingDetectedElements?: boolean;
  detectedElementsCount: number;
  onAddElementToReview: (element: DetectedElement) => void;
  onIgnoreElement: (elementId: string, elementType: DetectedElementType) => void;
  addingElementId?: string | null;
  ignoringElementId?: string | null;
  onViewHistory?: () => void;
  // 新增：中断相关props
  onInterrupt?: () => void;
  isInterrupting?: boolean;
  showInterruptButton?: boolean;
}

function AiReviewPanelHeader({
  onRerunAll,
  isRerunningAll,
  onViewHistory,
  onInterrupt,
  isInterrupting,
  showInterruptButton,
}: AiReviewPanelHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">AI監修結果</h3>
        <div className="flex items-center gap-2">
          {onViewHistory && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onViewHistory();
              }}
              className="h-8 text-xs"
            >
              <Clock className="mr-1.5 size-3" />
              履歴
            </Button>
          )}

          {/* 中断按钮 - 只在监修进行中且确认review存在时显示 */}
          {showInterruptButton && onInterrupt && (
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onInterrupt?.();
              }}
              disabled={isInterrupting}
              className="h-8 text-xs"
            >
              {isInterrupting ? (
                <>
                  <AiOutlineLoading3Quarters className="mr-1.5 size-3 animate-spin" />
                  中断中...
                </>
              ) : (
                <>
                  <StopCircle className="mr-1.5 size-3" />
                  中断
                </>
              )}
            </Button>
          )}

          {onRerunAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void onRerunAll();
              }}
              disabled={isRerunningAll}
              className="h-8 text-xs"
            >
              {isRerunningAll ? (
                <AiOutlineLoading3Quarters className="mr-1.5 size-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 size-3" />
              )}
              再監修
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface AiReviewSummaryProps {
  timestamp: string;
  riskSeverityCount: number;
  alertSeverityCount: number;
  safeSeverityCount: number;
  filterCounts: Record<FindingSeverity, number>;
  selectedSeverities: FindingSeverity[];
  onFilterChange: (severity: FindingSeverity, isChecked: boolean) => void;
  onResetFilters: () => void;
  canResetFilters: boolean;
}

function AiReviewSummary({
  timestamp,
  riskSeverityCount,
  alertSeverityCount,
  safeSeverityCount,
  filterCounts,
  selectedSeverities,
  onFilterChange,
  onResetFilters,
  canResetFilters,
}: AiReviewSummaryProps) {
  const contextualMessage = () => {
    if (riskSeverityCount > 0) {
      return 'AI監修でリスクの問題が検出されました。特に注意してください。';
    }
    if (riskSeverityCount === 0 && alertSeverityCount === 0 && safeSeverityCount === 0) {
      return 'AI監修では明確な問題は見つかりませんでした。';
    }
    return 'AI監修が完了しました。結果を確認してください。';
  };

  const totalSeverityCount = riskSeverityCount + alertSeverityCount + safeSeverityCount;
  const severitiesOrder: FindingSeverity[] = ['risk', 'alert', 'safe'];

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

      {/* Integrated Filter Section */}
      <div className="pt-2 mt-2 border-t border-border/60">
        <div className="flex flex-wrap flex-row items-center justify-start py-1 gap-x-2">
          {severitiesOrder.map((severity) => {
            const count = filterCounts[severity] || 0;
            const isChecked = selectedSeverities.includes(severity);
            const severityInfo = getSeverityPillTextAndShortCode(severity);
            const severityStyles = getSeverityStyles(severity);
            const uniqueId = `summary-filter-item-${severity}`;
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
                    aria-label={`${severityInfo.text}フィルター (${count}件)`}
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
        監修日時: {new Date(timestamp).toLocaleString()}
      </div>
    </>
  );
}

// --- END AiReviewSummary --- //

// --- START AiReviewFindingItem --- //
interface AiReviewFindingItemProps {
  finding: AiReviewPanelFinding;
  isActive: boolean;
  onInteraction: (action: FindingInteractionType, findingId: string) => void;
  onViewImageCitation: (imageUrl: string, sourceText?: string) => void;
  onFixStatusUpdate: (findingId: string, newIsFixed: boolean) => Promise<void>;
  isUpdatingFixStatus: boolean;
}

function AiReviewFindingItem({
  finding,
  isActive,
  onInteraction,
  onViewImageCitation,
  onFixStatusUpdate,
  isUpdatingFixStatus,
}: AiReviewFindingItemProps) {
  const context = useContext(TaskDetailContext);
  const { openCommentModalWithText } = context;
  const severityStyles = getSeverityStyles(finding.severity);
  const { text: severityText } = getSeverityPillTextAndShortCode(finding.severity);

  // 记录传递给AiReviewFindingItem的finding对象

  // 构建要复制的文本内容 - 只复制描述
  const copyText = useMemo(() => {
    return (
      'コメント: ' +
      finding.description +
      '\n\n' +
      '提案: ' +
      finding.suggestion +
      '\n\n' +
      '参考元: ' +
      finding.reference_source
    );
  }, [finding.description, finding.suggestion, finding.reference_source]);

  // 处理fix/unfix按钮点击
  const handleFixToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // 防止触发父元素的点击事件
      const newIsFixed = !finding.is_fixed;
      onFixStatusUpdate(finding.id, newIsFixed).catch(console.error);
    },
    [finding.id, finding.is_fixed, onFixStatusUpdate],
  );

  // 处理评论按钮点击
  const handleCommentClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (finding.suggestion && typeof openCommentModalWithText === 'function') {
        (openCommentModalWithText as (text: string) => void)(
          'コメント: ' +
            finding.description +
            '\n\n' +
            '提案: ' +
            finding.suggestion +
            '\n\n' +
            '参考元: ' +
            finding.reference_source,
        );
      }
    },
    [finding.suggestion, finding.description, finding.reference_source, openCommentModalWithText],
  );

  return (
    <div
      id={`finding-item-${finding.id}`}
      className={clsx(
        'p-3 rounded-md bg-muted/30 transition-all border-l-4 break-words overflow-hidden relative group',
        severityStyles.borderColorClass,
        isActive && 'ring-2 ring-primary bg-primary/10 border-primary/50',
      )}
      onMouseEnter={() => onInteraction('enter', finding.id)}
      onMouseLeave={() => onInteraction('leave', finding.id)}
      onClick={() => {
        // 触发interaction事件
        onInteraction('click', finding.id);
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-label={`${severityText}: ${finding.description}`}
    >
      {/* 操作按钮区域 - 悬停时显示在右下角 */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
        {/* Fix/Unfix 按钮 */}
        <Button
          size="xs"
          variant={finding.is_fixed ? 'default' : 'outline'}
          className={clsx(
            'transition-all duration-200 shrink-0 h-6 text-[10px] px-2',
            finding.is_fixed
              ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
              : 'hover:bg-green-50 hover:border-green-300 hover:text-green-700',
            isUpdatingFixStatus && 'opacity-50 cursor-not-allowed',
          )}
          onClick={handleFixToggle}
          disabled={isUpdatingFixStatus}
          aria-label={finding.is_fixed ? '保留を解除' : '保留する'}
        >
          {isUpdatingFixStatus ? (
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
          ) : (
            <>
              {finding.is_fixed ? (
                <>
                  <Check className="w-2.5 h-2.5 mr-1" />
                  保留中
                </>
              ) : (
                <>
                  <Circle className="w-2.5 h-2.5 mr-1" />
                  保留
                </>
              )}
            </>
          )}
        </Button>

        {/* 复制按钮 */}
        <CopyButton text={copyText} size="xs" />

        {/* 评论按钮 - 放在编辑按钮的位置 */}
        {finding.suggestion && (
          <Button
            size="xs"
            variant="ghost"
            className="transition-all duration-200 shrink-0 h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={handleCommentClick}
            title="コメント欄にAI提案をコピーして、コメントモーダルを開きます"
          >
            <MessageSquare className="w-3 h-3" />
          </Button>
        )}
      </div>

      <p className="text-sm pr-16">{finding.description}</p>
      <div className="flex items-center gap-2 mt-1">
        <Badge className={clsx('text-xs', severityStyles.badgeClasses)}>{severityText}</Badge>

        {/* Tag 显示区域 - 与severity badge并排显示 */}
        {finding.tag && finding.tag.length > 0 && finding.tag.some((tag) => tag && tag.trim() !== '') && (
          <div className="flex flex-wrap gap-1">
            {finding.tag
              .filter((tag) => tag && tag.trim() !== '')
              .map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                  {tag}
                </Badge>
              ))}
          </div>
        )}

        {/* Fixed状态指示器 - 在badges之后显示 */}
        {finding.is_fixed && (
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
            <Check className="w-2.5 h-2.5 mr-1" />
            保留中
          </Badge>
        )}
      </div>
      {finding.suggestion && (
        <div className="mt-1 flex items-start gap-1">
          <p className="text-xs text-muted-foreground flex-1">提案: {finding.suggestion}</p>
        </div>
      )}

      <AiReviewCitationDisplay
        referenceImages={finding.reference_images}
        referenceSource={finding.reference_source}
        onViewImageCitation={onViewImageCitation}
      />
    </div>
  );
}
// --- END AiReviewFindingItem --- //

// 拆分成多个辅助函数以降低认知复杂度

// 处理单一属性的辅助函数
function getStringProperty(obj: Record<string, unknown>, key: string, defaultValue = ''): string {
  return typeof obj[key] === 'string' ? obj[key] : defaultValue;
}

function getSeverity(obj: Record<string, unknown>, defaultValue: FindingSeverity): FindingSeverity {
  const severity = obj.severity as string;
  if (typeof severity === 'string') {
    const severityMapping: Record<string, FindingSeverity> = {
      high: 'risk',
      medium: 'alert',
      low: 'safe',
      risk: 'risk',
      alert: 'alert',
      safe: 'safe',
    };
    return severityMapping[severity] || defaultValue;
  }
  return defaultValue;
}

// 处理area对象的辅助函数
function getAreaObject(
  obj: Record<string, unknown>,
): { x: number; y: number; width: number; height: number } | undefined {
  if (!obj.area || typeof obj.area !== 'object') {
    return undefined;
  }

  const areaObj = obj.area as Record<string, unknown>;
  // 验证area对象具有必要的属性
  if (
    typeof areaObj.x === 'number' &&
    typeof areaObj.y === 'number' &&
    typeof areaObj.width === 'number' &&
    typeof areaObj.height === 'number'
  ) {
    return {
      x: areaObj.x,
      y: areaObj.y,
      width: areaObj.width,
      height: areaObj.height,
    };
  }
  return undefined;
}

// 处理字符串数组的辅助函数
function getStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
  }
  return [];
}

// 从citation对象提取引用信息的辅助函数
function extractCitationInfo(citation: Record<string, unknown>): {
  referenceImages: string[];
  referenceSource: string;
} {
  const images = getStringArray(citation.reference_images);
  const source = getStringProperty(citation, 'reference_source');
  return { referenceImages: images, referenceSource: source };
}

// 主要的enrichFinding函数现在简化了
function enrichFinding(rawFinding: unknown): AiReviewPanelFinding {
  // 定义一个安全解析对象的默认结构
  const defaultFinding: AiReviewPanelFinding = {
    id: '',
    description: '',
    severity: 'safe' as const,
    reference_images: [],
    reference_source: '',
  };

  // 安全地处理输入
  if (!rawFinding || typeof rawFinding !== 'object') {
    return defaultFinding;
  }

  // 类型安全地访问属性
  const typedFinding = rawFinding as Record<string, unknown>;

  // 获取基本属性
  const id = getStringProperty(typedFinding, 'id', defaultFinding.id);
  const description = getStringProperty(typedFinding, 'description', defaultFinding.description);
  const severity = getSeverity(typedFinding, defaultFinding.severity);
  const suggestion = getStringProperty(typedFinding, 'suggestion');
  const area = getAreaObject(typedFinding);
  const tag = getStringArray(typedFinding.tag); // 获取tag字段

  // 获取参考图片和源
  let referenceImages = getStringArray(typedFinding.reference_images);
  let referenceSource = getStringProperty(typedFinding, 'reference_source');

  // 从citation获取额外的引用信息
  if (typedFinding.citation && typeof typedFinding.citation === 'object') {
    const { referenceImages: citationImages, referenceSource: citationSource } = extractCitationInfo(
      typedFinding.citation as Record<string, unknown>,
    );

    // 只有在顶层缺少信息时才使用citation中的信息
    if (referenceImages.length === 0) {
      referenceImages = citationImages;
    }
    if (!referenceSource) {
      referenceSource = citationSource;
    }
  }

  // 获取is_fixed状态
  console.log('typedFinding.is_fixed:', typedFinding.is_fixed, 'type:', typeof typedFinding.is_fixed);
  const isFixed = typeof typedFinding.is_fixed === 'boolean' ? typedFinding.is_fixed : false;
  console.log('Final isFixed value:', isFixed);

  // 获取content_type和content_metadata
  const contentType = getStringProperty(typedFinding, 'content_type');
  const contentMetadata =
    typedFinding.content_metadata && typeof typedFinding.content_metadata === 'object'
      ? (typedFinding.content_metadata as Record<string, unknown>)
      : undefined;

  // 组合最终对象
  const enrichedFinding: AiReviewPanelFinding = {
    id,
    description,
    severity,
    suggestion: suggestion || undefined,
    area,
    reference_images: referenceImages,
    reference_source: referenceSource,
    tag: tag.length > 0 ? tag : undefined, // 只有当有tag时才包含
    is_fixed: isFixed,
    content_type: (contentType as AiReviewPanelFinding['content_type']) || undefined,
    content_metadata: contentMetadata,
  };
  return enrichedFinding;
}

interface NoFindingsCardProps {
  isProcessingReview: boolean;
  aiReviewResult: AiReviewResult | null;
  allFindings: AiReviewPanelFinding[];
}

function NoFindingsCard({ isProcessingReview, aiReviewResult, allFindings }: NoFindingsCardProps) {
  // 检查是否所有findings都是safe类型
  const allFindingsAreSafe = allFindings.length > 0 && allFindings.every((finding) => finding.severity === 'safe');

  return (
    <Card>
      <CardContent className="flex items-center justify-center h-40 p-4">
        {isProcessingReview ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground text-center">AI監修を実行中...</p>
            <p className="text-xs text-muted-foreground text-center">しばらくお待ちください</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {(() => {
              if (allFindingsAreSafe) {
                return 'AI監修が完了しました。特に注意すべき検査項目は見つかりませんでした。';
              }
              if (aiReviewResult && allFindings.length === 0) {
                return 'AI監修が失敗しました、再監修をかけてください。';
              }
              return 'AI監修では検査結果は生成されませんでした。';
            })()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export interface AiReviewPanelProps {
  aiReviewResult: AiReviewResult | null;
  activeFindingId: string | null;
  onFindingInteraction: (action: FindingInteractionType, findingId: string) => void;
  onViewImageCitation: (imageUrl: string, sourceText?: string) => void;
  onRerunSectionReview: (sectionTitle: string) => Promise<void>;
  rerunningSectionTitle?: string | null;
  currentSubtaskId: string;
  projectId: string; // Added for RPD fetching
  isFetchingDetectedElements?: boolean;
  onAddElementToReview: (element: DetectedElement) => void;
  onIgnoreElement: (elementId: string, elementType: DetectedElementType) => void;
  addingElementId?: string | null;
  ignoringElementId?: string | null;
  isInitialReviewLoading: boolean;
  isSubtaskEmpty: boolean;
  onStartInitialReview: (subtaskId: string) => Promise<void>;
  // 新増：処理AI review完成後的回調
  onAiReviewCompleted?: (subtaskId: string) => void;
  // 新増：外部管理的処理状態
  isProcessingReview?: boolean;
  onProcessingStateChange?: (isProcessing: boolean) => void;
  // 新増：review启动时间，用于判断是否是新的完成状态
  reviewStartTime?: Date | null;
  // 新増：処理finding状態更新的回調
  onFindingStatusUpdate?: (findingId: string, isFixed: boolean) => void;
  // 新増：表示re-review modal的回調
  onShowReReviewModal?: () => void;
  // 新増：表示initial review modal的回調
  onShowInitialReviewModal?: () => void;
  // 新増：角色推荐功能
}

export function AiReviewPanel({
  aiReviewResult,
  activeFindingId,
  onFindingInteraction,
  onViewImageCitation,
  onRerunSectionReview,
  rerunningSectionTitle,
  currentSubtaskId,

  isFetchingDetectedElements,
  onAddElementToReview,
  onIgnoreElement,
  addingElementId,
  ignoringElementId,
  isInitialReviewLoading,
  isSubtaskEmpty,
  onAiReviewCompleted,
  isProcessingReview: externalIsProcessingReview,
  onProcessingStateChange,
  onFindingStatusUpdate,
  onShowReReviewModal,
  onShowInitialReviewModal,
}: AiReviewPanelProps) {
  const [selectedSeverities, setSelectedSeverities] = useState<FindingSeverity[]>([]);
  const [pollingIntervalId, setPollingIntervalId] = useState<number | null>(null);

  // State for RPD selection
  const [selectedRpdIds] = useState<string[]>([]);

  // State for RPD history modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // 视频片段播放状态管理
  const [currentPlayingGroup, setCurrentPlayingGroup] = useState<string | null>(null);

  // 新的服务端状态管理
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [serverProcessingStatus, setServerProcessingStatus] = useState<{
    isProcessing: boolean;
    isCompleted: boolean;
    is_cancelled?: boolean;
    latest_review_id?: string;
    errorMessage?: string;
  } | null>(null);

  // 使用 useRef 来保存回调函数，避免依赖不稳定导致重复调用
  const onProcessingStateChangeRef = useRef(onProcessingStateChange);
  const onAiReviewCompletedRef = useRef(onAiReviewCompleted);
  const lastSubtaskIdRef = useRef<string | null>(null);
  const isCheckingRef = useRef(false);

  // 更新 ref 中的回调函数
  useEffect(() => {
    onProcessingStateChangeRef.current = onProcessingStateChange;
  }, [onProcessingStateChange]);

  useEffect(() => {
    onAiReviewCompletedRef.current = onAiReviewCompleted;
  }, [onAiReviewCompleted]);

  // Note: RPD selection is now handled by UnifiedReviewModal

  // Note: AI Review Mode is now handled by UnifiedReviewModal

  // Transform RPDs to MultiSelectOption format with recommendations

  // 使用服务端状态作为唯一的真实来源
  const isProcessingReview =
    externalIsProcessingReview !== undefined
      ? externalIsProcessingReview
      : serverProcessingStatus?.isProcessing || false;

  // 如果外部提供了状态管理，使用外部的，否则使用内部的更新逻辑
  const updateProcessingState = useCallback((isProcessing: boolean) => {
    if (onProcessingStateChangeRef.current) {
      onProcessingStateChangeRef.current(isProcessing);
    } else {
      setServerProcessingStatus((prev) =>
        prev ? { ...prev, isProcessing } : { isProcessing, isCompleted: false, is_cancelled: false },
      );
    }
  }, []); // 空依赖数组，因为使用了 ref

  // 使用基础的AI review hook
  const initiateMutation = useInitiateAiReview();

  // 使用finding fixed状态更新hook
  const { updateFixedStatus, isUpdating } = useUpdateFindingFixedStatus();

  // 使用中断AI review hook
  const {
    interruptAiReview,
    cleanup: cleanupInterrupt,
    isInterrupting,
  } = useInterruptAiReview({
    onInterruptSuccess: (subtaskId) => {
      console.log(`AI review interrupted successfully for subtask: ${subtaskId}`);
      // 重置处理状态
      updateProcessingState(false);

      // 刷新AI监修数据，因为后端可能已经回退到上一个版本
      void queryClient.invalidateQueries({
        queryKey: ['latestAiReview', subtaskId],
      });

      // 触发完成回调，让父组件知道review已中断并可能已回退
      if (onAiReviewCompleted) {
        onAiReviewCompleted(subtaskId);
      }
    },
    onInterruptFailed: (subtaskId, error) => {
      console.error(`AI review interrupt failed for subtask: ${subtaskId}`, error);
      // 不重置处理状态，让用户知道监修可能仍在继续
    },
  });

  // Query client for manual data refresh
  const queryClient = useQueryClient();

  // 获取最新执行的RPD历史
  const { data: rpdHistoryData, isLoading: isLoadingHistory } = useLatestExecutedRPDs({
    subtaskId: currentSubtaskId,
    enabled: !!currentSubtaskId,
  });

  // 获取执行历史（新的详细信息）
  const { data: executionHistoryData, isLoading: isLoadingExecutionHistory } = useExecutionHistory({
    subtaskId: currentSubtaskId,
    enabled: !!currentSubtaskId,
  });

  // 查询服务端状态的核心逻辑
  const checkServerStatus = useCallback(
    async (subtaskId: string) => {
      if (!subtaskId) {
        return;
      }

      // 防抖：避免重复检查同一个 subtask
      if (isCheckingRef.current && lastSubtaskIdRef.current === subtaskId) {
        console.log(`Already checking status for subtask: ${subtaskId}, skipping...`);
        return;
      }

      lastSubtaskIdRef.current = subtaskId;
      isCheckingRef.current = true;
      setIsCheckingStatus(true);

      try {
        const status = await aiReviewsService.checkProcessingStatus(subtaskId);
        setServerProcessingStatus({
          isProcessing: status.is_processing,
          isCompleted: status.is_completed,
          is_cancelled: Boolean(status.is_cancelled),
          latest_review_id: status.latest_review_id,
          errorMessage: status.message || undefined,
        });

        console.log(`Subtask ${subtaskId} status:`, {
          isProcessing: status.is_processing,
          isCompleted: status.is_completed,
        });

        // 如果正在处理，启动轮询 - 使用 ref 来避免依赖不稳定
        if (status.is_processing) {
          setPollingIntervalId((currentIntervalId) => {
            if (!currentIntervalId) {
              console.log(`Starting polling for processing subtask: ${subtaskId}`);

              // 直接在这里实现轮询逻辑，使用 ref 访问回调
              if (onProcessingStateChangeRef.current) {
                // 父组件会处理轮询，这里只需要通知
                if (onAiReviewCompletedRef.current) {
                  setTimeout(() => {
                    // 这里可以做一些额外的检查或清理工作
                  }, 1000);
                }
                return currentIntervalId;
              }

              // 备用轮询逻辑，当没有父组件状态管理时使用
              const intervalId = setInterval(async () => {
                try {
                  const response = await aiReviewsService.checkProcessingStatus(subtaskId);

                  // 检查是否已完成、失败或取消
                  if (response.is_completed || response.is_cancelled || response.processing_status === 'FAILED') {
                    updateProcessingState(false);
                    clearInterval(intervalId);
                    setPollingIntervalId(null);

                    console.log('AI review finished via polling:', response);

                    // 如果是失败或取消，刷新数据以显示回退后的状态
                    if (response.is_cancelled || response.processing_status === 'FAILED') {
                      void queryClient.invalidateQueries({
                        queryKey: ['latestAiReview', subtaskId],
                      });
                    }

                    if (onAiReviewCompletedRef.current) {
                      onAiReviewCompletedRef.current(subtaskId);
                    }
                  }
                } catch (error) {
                  console.error('轮询AI review状态时出错:', error);
                  updateProcessingState(false);
                  clearInterval(intervalId);
                  setPollingIntervalId(null);
                }
              }, 10000); // 10秒轮询间隔

              return intervalId as unknown as number;
            }
            return currentIntervalId;
          });
        }
      } catch (error) {
        console.error('Failed to check processing status:', error);
        setServerProcessingStatus({
          isProcessing: false,
          isCompleted: false,
          is_cancelled: false,
          latest_review_id: undefined,
          errorMessage: error instanceof Error ? error.message : '状态查询失败',
        });
      } finally {
        isCheckingRef.current = false;
        setIsCheckingStatus(false);
      }
    },
    [updateProcessingState, queryClient],
  ); // 依赖稳定的 updateProcessingState 和 queryClient

  // 每次切换subtask时查询真实状态
  useEffect(() => {
    // 停止之前的轮询
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }

    // 重置防抖状态
    isCheckingRef.current = false;
    lastSubtaskIdRef.current = null;

    // 查询新subtask的状态
    if (currentSubtaskId) {
      // 只在真正开始查询时重置状态，避免不必要的闪烁
      setServerProcessingStatus(null);
      setIsCheckingStatus(false);
      void checkServerStatus(currentSubtaskId);
    } else {
      // 如果没有 subtaskId，直接重置状态
      setServerProcessingStatus(null);
      setIsCheckingStatus(false);
    }
  }, [currentSubtaskId, checkServerStatus, pollingIntervalId]); // 需要包含pollingIntervalId以正确清理

  // 处理finding固定状态更新
  const handleFindingFixedStatusUpdate = useCallback(
    async (findingId: string, newIsFixed: boolean) => {
      const success = await updateFixedStatus(findingId, newIsFixed);
      if (success && onFindingStatusUpdate) {
        onFindingStatusUpdate(findingId, newIsFixed);
      }
    },
    [updateFixedStatus, onFindingStatusUpdate],
  );

  const allFindings: AiReviewPanelFinding[] = useMemo(() => {
    // 记录整体结构
    console.log('aiReviewResult structure:', aiReviewResult);
    console.log('aiReviewResult.findings:', aiReviewResult?.findings);

    // 从顶层findings数组获取数据 (网络响应格式)
    if (aiReviewResult?.findings && Array.isArray(aiReviewResult.findings)) {
      return aiReviewResult.findings.map((rawFinding) => enrichFinding(rawFinding));
    }

    // 从reviewSections获取数据 (可能的替代格式)
    if (aiReviewResult?.reviewSections && Array.isArray(aiReviewResult.reviewSections)) {
      return aiReviewResult.reviewSections.flatMap((section) => {
        if (!section.findings) {
          return [];
        }

        return section.findings.map((rawFinding) => enrichFinding(rawFinding));
      });
    }

    return [];
  }, [aiReviewResult]);

  useEffect(() => {
    if (allFindings.length > 0) {
      const initialSelectedSeverities: FindingSeverity[] = [];
      const severitiesOrder: FindingSeverity[] = ['risk', 'alert']; // 默认勾选这些级别

      let risk = 0,
        alert = 0,
        safe = 0;
      allFindings.forEach((finding) => {
        if (finding.severity === 'risk') {
          risk++;
        } else if (finding.severity === 'alert') {
          alert++;
        } else if (finding.severity === 'safe') {
          safe++;
        }
      });
      const counts: Record<FindingSeverity, number> = { risk, alert, safe };

      // 默认勾选risk和alert（如果有数据），保持显示状态和勾选状态同步
      severitiesOrder.forEach((severity) => {
        if (counts[severity] > 0) {
          initialSelectedSeverities.push(severity);
        }
      });
      setSelectedSeverities(initialSelectedSeverities);
    } else {
      setSelectedSeverities([]);
    }
  }, [allFindings]);

  const handleFilterChange = useCallback((severity: FindingSeverity, isChecked: boolean) => {
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

  // 停止轮询的清理函数
  const stopPolling = useCallback(() => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
  }, [pollingIntervalId]);

  const handleRerunAllForHeader = useCallback(async () => {
    if (!currentSubtaskId) {
      return;
    }

    // Show modal for RPD selection instead of direct execution
    if (onShowReReviewModal) {
      onShowReReviewModal();
      return;
    }

    // Fallback to existing behavior if modal callback not provided
    if (onRerunSectionReview) {
      console.log('Using parent onRerunSectionReview handler');
      await onRerunSectionReview('__ALL_SECTIONS__');
      return;
    }

    console.log('Falling back to local handling');

    // 验证：如果没有选择RPD，警告用户但允许执行（使用所有可用的RPD）
    if (selectedRpdIds.length === 0) {
      console.log('No specific RPDs selected for re-review, will use all available RPDs');
    }

    try {
      // 设置处理状态，显示"监修中"
      updateProcessingState(true);

      // 启动AI review（再监修）- with selected mode and RPD IDs
      await initiateMutation.mutateAsync({
        subtaskId: currentSubtaskId,
        mode: 'quality', // Default mode, actual mode selection is handled by UnifiedReviewModal
        rpdIds: selectedRpdIds.length > 0 ? selectedRpdIds : undefined, // undefined means use all available RPDs
      });

      // 轮询会由 checkServerStatus 自动处理
    } catch (error) {
      console.error('Failed to start AI review rerun:', error);
      toast({
        title: 'エラー',
        description: `再監修の開始に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        variant: 'destructive',
        duration: 5000,
      });
      updateProcessingState(false);
    }
  }, [
    currentSubtaskId,
    onShowReReviewModal,
    onRerunSectionReview,
    initiateMutation,
    selectedRpdIds,
    updateProcessingState,
  ]);

  // 处理历史查看
  const handleViewHistory = useCallback(() => {
    // 手动刷新最新执行的RPD历史数据和执行历史数据
    if (currentSubtaskId) {
      void queryClient.invalidateQueries({
        queryKey: ['latestExecutedRPDs', currentSubtaskId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['executionHistory', currentSubtaskId],
      });
    }
    setIsHistoryModalOpen(true);
  }, [currentSubtaskId, queryClient]);

  // Note: Initial review logic is now handled by UnifiedReviewModal

  // 处理中断AI review
  const handleInterruptAiReview = useCallback(() => {
    if (!currentSubtaskId) {
      return;
    }

    interruptAiReview(currentSubtaskId);
  }, [currentSubtaskId, interruptAiReview]);

  // 检查是否应该显示中断按钮
  const shouldShowInterruptButton = useMemo(() => {
    // 简化逻辑：只要正在处理且没有正在中断，就显示中断按钮
    // 移除reviewConfirmedExists的限制，因为它可能导致按钮不显示
    const hasProcessingReview = isProcessingReview || serverProcessingStatus?.isProcessing;
    const hasActiveReview = serverProcessingStatus?.latest_review_id != null;

    // 调试日志（生产环境中可以移除）
    if (import.meta.env.DEV) {
      console.log('中断按钮显示条件检查:', {
        isProcessingReview,
        'serverProcessingStatus?.isProcessing': serverProcessingStatus?.isProcessing,
        hasProcessingReview,
        'serverProcessingStatus?.latest_review_id': serverProcessingStatus?.latest_review_id,
        hasActiveReview,
        isInterrupting,
        shouldShow: hasProcessingReview && hasActiveReview && !isInterrupting,
      });
    }

    return hasProcessingReview && hasActiveReview && !isInterrupting;
  }, [isProcessingReview, serverProcessingStatus, isInterrupting]);

  // 组件卸载时清理轮询和中断状态
  useEffect(() => {
    return () => {
      stopPolling();
      cleanupInterrupt();
    };
  }, [stopPolling, cleanupInterrupt]);

  const isHeaderRerunningAll = !!rerunningSectionTitle || isProcessingReview;

  // 调试日志
  console.log('AiReviewPanel render states:', {
    rerunningSectionTitle,
    isProcessingReview,
    externalIsProcessingReview,
    serverProcessingStatus,
    isCheckingStatus,
    isHeaderRerunningAll,
    currentSubtaskId,
    onProcessingStateChange: !!onProcessingStateChange,
  });

  if (isInitialReviewLoading || isCheckingStatus) {
    return <SimpleLoadingSpinner />;
  }

  // 如果正在处理review或确认正在处理，优先显示处理状态
  if (isProcessingReview) {
    // 如果正在中断，显示中断状态
    if (isInterrupting) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 h-full p-4 text-center bg-background">
          <div className="w-full max-w-md p-6 py-10 border rounded-lg shadow-md bg-card">
            <StopCircle className="w-12 h-12 mx-auto mb-5 text-destructive" />
            <div className="flex items-center justify-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 animate-spin text-destructive" />
              <h3 className="text-xl font-semibold text-card-foreground">AI監修を中断中</h3>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              AI監修の中断処理を実行中です。完了まで少しお待ちください。
            </p>
          </div>
        </div>
      );
    }

    // 正常的监修进行中状态
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-full p-4 text-center bg-background">
        <div className="w-full max-w-md p-6 py-10 border rounded-lg shadow-md bg-card">
          <Bot className="w-12 h-12 mx-auto mb-5 text-primary" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <h3 className="text-xl font-semibold text-card-foreground">AI監修実行中</h3>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">AI監修を実行しています。完了まで少しお待ちください。</p>

          {/* 如果有活跃的review，显示中断按钮 */}
          {shouldShowInterruptButton && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                handleInterruptAiReview();
              }}
              className="mt-4"
            >
              <StopCircle className="mr-2 w-4 h-4" />
              中断
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!aiReviewResult) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-full p-4 text-center bg-background">
        <div className="w-full max-w-md p-6 py-10 border rounded-lg shadow-md bg-card">
          <Bot className="w-12 h-12 mx-auto mb-5 text-primary" />
          <h3 className="mb-2 text-xl font-semibold text-card-foreground">監修を開始</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            レビューセットまたは個別のレビューポイントを選択して監修を開始できます。
          </p>

          <Button
            onClick={() => {
              if (currentSubtaskId && onShowInitialReviewModal) {
                onShowInitialReviewModal();
              }
            }}
            disabled={isSubtaskEmpty || !currentSubtaskId}
            className="w-full h-12 text-base"
            size="lg"
          >
            <Play className="w-5 h-5 mr-2" />
            監修設定を開く
          </Button>

          {isSubtaskEmpty && <p className="mt-4 text-xs text-destructive">ヒント: 空のタスクは監修できません。</p>}
        </div>
      </div>
    );
  }

  let risk = 0;
  let alert = 0;
  let safe = 0;

  if (allFindings.length > 0) {
    allFindings.forEach((finding) => {
      if (finding.severity === 'risk') {
        risk++;
      } else if (finding.severity === 'alert') {
        alert++;
      } else if (finding.severity === 'safe') {
        safe++;
      }
    });
  }

  const filterCounts = {
    risk,
    alert,
    safe,
  };

  const detectedElementsCount = aiReviewResult.detected_elements
    ? aiReviewResult.detected_elements.characters.length +
      aiReviewResult.detected_elements.objects.length +
      aiReviewResult.detected_elements.texts.length
    : 0;
  return (
    <div className="flex flex-col h-full">
      {/* Overall Status Card - Non-collapsible */}
      <Card className="mb-4">
        <CardHeader className="p-4 pb-3">
          <AiReviewPanelHeader
            onRerunAll={handleRerunAllForHeader}
            isRerunningAll={isHeaderRerunningAll}
            detectedElements={aiReviewResult.detected_elements}
            isFetchingDetectedElements={isFetchingDetectedElements}
            detectedElementsCount={detectedElementsCount}
            onAddElementToReview={onAddElementToReview}
            onIgnoreElement={onIgnoreElement}
            addingElementId={addingElementId}
            ignoringElementId={ignoringElementId}
            onViewHistory={handleViewHistory}
            onInterrupt={handleInterruptAiReview}
            isInterrupting={isInterrupting}
            showInterruptButton={shouldShowInterruptButton}
          />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <AiReviewSummary
            timestamp={aiReviewResult.timestamp}
            riskSeverityCount={risk}
            alertSeverityCount={alert}
            safeSeverityCount={safe}
            filterCounts={filterCounts}
            selectedSeverities={selectedSeverities}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            canResetFilters={selectedSeverities.length > 0}
          />
        </CardContent>
      </Card>

      {/* Review Section Cards - With Video Grouping */}
      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {(() => {
            // 过滤findings
            const filteredFindings = allFindings.filter((finding) => {
              if (selectedSeverities.length === 0) {
                return false;
              }
              return selectedSeverities.includes(finding.severity);
            });

            if (filteredFindings.length === 0) {
              return (
                <NoFindingsCard
                  isProcessingReview={isProcessingReview}
                  aiReviewResult={aiReviewResult}
                  allFindings={allFindings}
                />
              );
            }

            // 分离视频和非视频findings
            const videoFindings = filteredFindings.filter(
              (finding) => finding.content_type === 'video' && finding.content_metadata?.start_timestamp != null,
            );
            const nonVideoFindings = filteredFindings.filter(
              (finding) => !(finding.content_type === 'video' && finding.content_metadata?.start_timestamp != null),
            );

            // 对视频findings进行时间戳分组
            const videoGroups = groupVideoFindingsByTimestamp(videoFindings);

            // 对非视频findings进行排序
            const sortedNonVideoFindings = [...nonVideoFindings];
            sortedNonVideoFindings.sort((a, b) => {
              // 首先显示 is_fixed 为 true 的条目（保留中的结果）
              if (a.is_fixed && !b.is_fixed) {
                return -1; // a 排在前面
              }
              if (!a.is_fixed && b.is_fixed) {
                return 1; // b 排在前面
              }
              return 0;
            });

            return (
              <>
                {/* 视频findings - 按时间戳分组显示 */}
                {videoGroups.map((group, groupIndex) => (
                  <VideoFindingGroup
                    key={`video-group-${groupIndex}`}
                    group={group}
                    activeFindingId={activeFindingId}
                    onFindingInteraction={onFindingInteraction}
                    onViewImageCitation={onViewImageCitation}
                    onFixStatusUpdate={handleFindingFixedStatusUpdate}
                    isUpdatingFixStatus={isUpdating()}
                    currentPlayingGroup={currentPlayingGroup}
                    onPlaybackStateChange={setCurrentPlayingGroup}
                  />
                ))}

                {/* 非视频findings - 传统显示方式 */}
                {sortedNonVideoFindings.map((finding, index) => (
                  <Card key={finding.id || `non-video-${index}`} className="p-0 overflow-hidden">
                    <CardContent className="p-3">
                      <AiReviewFindingItem
                        finding={finding}
                        isActive={activeFindingId === finding.id}
                        onInteraction={onFindingInteraction}
                        onViewImageCitation={onViewImageCitation}
                        onFixStatusUpdate={handleFindingFixedStatusUpdate}
                        isUpdatingFixStatus={isUpdating()}
                      />
                    </CardContent>
                  </Card>
                ))}
              </>
            );
          })()}
        </div>
      </ScrollArea>

      {/* RPD History Modal */}
      <RPDHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        data={rpdHistoryData || undefined}
        executionHistory={executionHistoryData || undefined}
        isLoading={isLoadingHistory}
        isLoadingHistory={isLoadingExecutionHistory}
        subtaskId={currentSubtaskId}
      />
    </div>
  );
}
