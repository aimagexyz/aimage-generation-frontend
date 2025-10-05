import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import {
  LuActivity,
  LuChevronDown,
  LuChevronRight,
  LuClock,
  LuEye,
  LuFileText,
  LuHistory,
  LuMessageCircle,
} from 'react-icons/lu';

import { fetchApi } from '@/api/client';
import type { components } from '@/api/schemas';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import { ImagePreviewModal, type ImageViewModalState } from '@/pages/Tasks/TaskDetail/components/ImagePreviewModal';

import { SubtaskQuickPreviewSheet } from './SubtaskQuickPreviewSheet';
import { VideoPreviewModal } from './VideoPreviewModal';

// Assuming SubtaskOut is correctly typed and includes the 'content' field from your schema updates.
type SubtaskOut = components['schemas']['SubtaskOut'];

// Mock data for history and comments
interface SubtaskHistory {
  id: string;
  version: number;
  action: 'created' | 'updated' | 'commented' | 'status_changed';
  timestamp: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  changes?: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  comment?: string;
}

interface EnhancedSubtask extends Omit<SubtaskOut, 'version'> {
  history?: SubtaskHistory[];
  commentCount?: number;
  lastCommentAt?: string;
  version?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  progress?: number;
}

// Mock history data generator
function generateMockHistory(subtaskId: string): SubtaskHistory[] {
  const authors = [
    { id: '1', name: 'Xin Zhang' },
    { id: '2', name: 'Zikai Zhang' },
    { id: '3', name: 'AI Assistant' },
  ];

  const actions: SubtaskHistory['action'][] = ['created', 'updated', 'commented', 'status_changed'];
  const comments = [
    '初期バージョンを作成しました',
    '画像の品質を向上させました',
    'レビューコメントを反映しました',
    'ステータスを更新しました',
    'クライアントからのフィードバックを追加',
    'AIによる自動最適化を実行',
    'ユーザビリティテストの結果を反映',
    'パフォーマンスの改善を実施',
  ];

  // Use deterministic values based on subtaskId for consistent mock data
  const seed = subtaskId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const historyCount = (seed % 4) + 2; // 2-5 items

  return Array.from({ length: historyCount }, (_, index) => ({
    id: `${subtaskId}-history-${index}`,
    version: index + 1,
    action: actions[(seed + index) % actions.length],
    timestamp: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
    author: authors[(seed + index) % authors.length],
    comment: (seed + index) % 3 === 0 ? comments[(seed + index) % comments.length] : undefined,
    changes:
      (seed + index) % 5 === 0
        ? [
            {
              field: 'status',
              oldValue: 'TODO',
              newValue: 'IN_PROGRESS',
            },
          ]
        : undefined,
  })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// State for Image Preview Modal
type ImageModalState = ImageViewModalState;

// State for Video Preview Modal
interface VideoModalState {
  isOpen: boolean;
  videoUrl?: string;
  videoName?: string;
}

interface ExpandedSubtaskListProps {
  taskId: string;
  projectId: string;
}

export function ExpandedSubtaskList({ taskId, projectId }: Readonly<ExpandedSubtaskListProps>) {
  const {
    data: rawSubtasks,
    isLoading,
    isError,
    error,
  } = useQuery<SubtaskOut[], Error>({
    queryKey: ['task-subtasks', taskId], // 统一查询键，与TaskThumbnailPreview共享缓存
    queryFn: () =>
      fetchApi({
        // Cast the URL to the expected literal type from UrlPaths
        url: `/api/v1/tasks/${taskId}/subtasks` as '/api/v1/tasks/{task_id}/subtasks',
        method: 'get',
      }).then((res) => {
        // Cast res.data to the expected paginated type
        const responseData = res.data;
        if (!responseData || !Array.isArray(responseData.items)) {
          console.error('Unexpected response structure for subtasks:', responseData);
          throw new Error('サブタスクのデータ形式が正しくありません。');
        }
        return responseData.items;
      }),
    enabled: !!taskId,
    staleTime: 1000 * 60 * 5, // 5分内不重新获取 - 即使切换页面也保持缓存
    gcTime: 1000 * 60 * 30, // 30分钟垃圾回收 - 保持长时间缓存
    refetchOnWindowFocus: false, // 窗口焦点变化时不重新获取
    refetchOnMount: false, // 组件挂载时不重新获取（如果有缓存）
  });

  // Sort subtasks by oid to ensure proper ordering (1, 2, 3... instead of 10, 11, 1, 2...)
  const subtasks = rawSubtasks?.slice().sort((a, b) => a.oid - b.oid);

  const [imageModalState, setImageModalState] = useState<ImageModalState | null>(null);
  const [videoModalState, setVideoModalState] = useState<VideoModalState>({ isOpen: false });
  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    subtaskId: string | null;
  }>({ isOpen: false, subtaskId: null });
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  // Enhance subtasks with mock history data
  const enhancedSubtasks: EnhancedSubtask[] = useMemo(() => {
    return (
      subtasks?.map((subtask) => {
        const history = generateMockHistory(subtask.id);
        const seed = subtask.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const priorities: EnhancedSubtask['priority'][] = ['low', 'medium', 'high', 'urgent'];

        return {
          ...subtask,
          history,
          commentCount: history.filter((h) => h.comment).length,
          lastCommentAt: history.find((h) => h.comment)?.timestamp,
          version: history.length,
          priority: priorities[seed % priorities.length],
          progress: (seed % 10) * 10 + 10, // 10-100%
        };
      }) || []
    );
  }, [subtasks]);

  const handlePreviewClick = (subtaskId: string) => {
    setPreviewState({ isOpen: true, subtaskId });
  };

  const toggleHistoryExpansion = (subtaskId: string) => {
    setExpandedHistory((prev) => ({
      ...prev,
      [subtaskId]: !prev[subtaskId],
    }));
  };

  const handleCloseImageModal = () => {
    setImageModalState(null);
  };

  const handleCloseVideoModal = () => {
    setVideoModalState({ isOpen: false });
  };

  const handleClosePreview = () => {
    setPreviewState({ isOpen: false, subtaskId: null });
  };

  const getActionIcon = (action: SubtaskHistory['action']) => {
    switch (action) {
      case 'created':
        return <LuFileText className="size-3 text-blue-500" />;
      case 'updated':
        return <LuActivity className="size-3 text-orange-500" />;
      case 'commented':
        return <LuMessageCircle className="size-3 text-green-500" />;
      case 'status_changed':
        return <LuClock className="size-3 text-purple-500" />;
      default:
        return <LuFileText className="size-3 text-gray-500" />;
    }
  };

  const getActionLabel = (action: SubtaskHistory['action']) => {
    switch (action) {
      case 'created':
        return '作成';
      case 'updated':
        return '更新';
      case 'commented':
        return 'コメント';
      case 'status_changed':
        return 'ステータス変更';
      default:
        return '不明';
    }
  };

  const getPriorityColor = (priority: EnhancedSubtask['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
      default:
        return 'bg-green-500';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) {
      return 'bg-green-500';
    }
    if (progress >= 60) {
      return 'bg-blue-500';
    }
    if (progress >= 40) {
      return 'bg-yellow-500';
    }
    return 'bg-gray-400';
  };

  if (isLoading) {
    return (
      <div className="border-t bg-muted/5">
        <div className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-24"></div>
            </div>
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3 p-3 bg-background rounded-lg border">
                <div className="h-12 w-12 bg-muted rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                  <div className="h-2 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    console.error('Error fetching subtasks:', error);
    return (
      <div className="border-t bg-red-50/50">
        <div className="p-4 text-center">
          <div className="text-red-600 text-sm">
            <LuHistory className="size-4 mx-auto mb-1" />
            サブタスクの読み込みに失敗しました
          </div>
        </div>
      </div>
    );
  }

  if (!enhancedSubtasks || enhancedSubtasks.length === 0) {
    return (
      <div className="border-t bg-muted/5">
        <div className="p-4 text-center">
          <div className="text-muted-foreground text-sm">
            <LuHistory className="size-4 mx-auto mb-1 opacity-50" />
            サブタスクはありません
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t bg-muted/5">
      <div className="p-4 space-y-3">
        {/* Compact Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LuHistory className="size-4 text-primary" />
            <span className="font-medium text-sm">サブタスク履歴</span>
            <Badge variant="secondary" className="text-xs h-5">
              {enhancedSubtasks.length}
            </Badge>
          </div>
        </div>

        {/* Compact List Layout */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {enhancedSubtasks.map((subtask) => {
            const isHistoryExpanded = expandedHistory[subtask.id];

            return (
              <div
                key={subtask.id}
                className="group bg-background border border-border/50 rounded-lg hover:border-border hover:shadow-sm transition-all duration-200"
              >
                {/* Main Subtask Row */}
                <div className="flex items-center gap-3 p-3">
                  {/* Priority Indicator */}
                  <div className="flex-shrink-0 relative">
                    <div className="w-12 h-12 rounded-lg border border-border/20 bg-muted/30 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">サブタスク</span>
                    </div>
                    {/* Priority Dot */}
                    <div
                      className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${getPriorityColor(subtask.priority)}`}
                      title={`優先度: ${subtask.priority}`}
                    />
                  </div>

                  {/* Compact Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title and Status Row */}
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium text-sm truncate flex-1">{subtask.name}</h5>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge variant="outline" className="text-xs h-5 px-1.5">
                          {subtask.status || 'TODO'}
                        </Badge>
                        <Badge variant="secondary" className="text-xs h-5 px-1.5 font-mono">
                          v{subtask.version}
                        </Badge>
                      </div>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <LuMessageCircle className="size-3" />
                        <span>{subtask.commentCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>
                          {subtask.lastCommentAt
                            ? formatDistanceToNow(new Date(subtask.lastCommentAt), {
                                addSuffix: true,
                                locale: ja,
                              })
                            : '更新なし'}
                        </span>
                      </div>
                      {/* Progress */}
                      {subtask.progress != null && (
                        <div className="flex items-center gap-1">
                          <div className="w-8 h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getProgressColor(subtask.progress)}`}
                              style={{ width: `${subtask.progress}%` }}
                            />
                          </div>
                          <span className="text-xs">{subtask.progress}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Compact Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreviewClick(subtask.id)}
                            className="p-1 h-6 w-6 hover:bg-primary/10"
                          >
                            <LuEye className="size-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>プレビュー</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleHistoryExpansion(subtask.id)}
                      className="p-1 h-6 w-6 hover:bg-muted"
                    >
                      {isHistoryExpanded ? <LuChevronDown className="size-3" /> : <LuChevronRight className="size-3" />}
                    </Button>
                  </div>
                </div>

                {/* Compact History Section */}
                {isHistoryExpanded && subtask.history && (
                  <div className="border-t border-border/50 bg-muted/20">
                    <div className="p-3 space-y-2 max-h-[200px] overflow-y-auto">
                      {subtask.history.slice(0, 5).map((historyItem) => (
                        <div
                          key={historyItem.id}
                          className="flex items-start gap-2 p-2 bg-background/80 rounded border border-border/30"
                        >
                          <div className="flex-shrink-0 mt-0.5">{getActionIcon(historyItem.action)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs h-4 px-1">
                                {getActionLabel(historyItem.action)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(historyItem.timestamp), 'MM/dd HH:mm')}
                              </span>
                              <span className="text-xs text-muted-foreground font-medium">
                                {historyItem.author.name}
                              </span>
                            </div>
                            {historyItem.comment && (
                              <p className="text-xs text-foreground leading-relaxed">{historyItem.comment}</p>
                            )}
                            {historyItem.changes && (
                              <div className="text-xs mt-1">
                                {historyItem.changes.map((change, index) => (
                                  <span key={index} className="text-muted-foreground">
                                    {change.field}: <span className="text-red-600">{change.oldValue}</span> →{' '}
                                    <span className="text-green-600">{change.newValue}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {subtask.history.length > 5 && (
                        <div className="text-center">
                          <span className="text-xs text-muted-foreground">
                            他 {subtask.history.length - 5} 件の履歴
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {imageModalState?.imageUrl && <ImagePreviewModal modalState={imageModalState} onClose={handleCloseImageModal} />}
      {videoModalState.isOpen && videoModalState.videoUrl && (
        <VideoPreviewModal
          isOpen={videoModalState.isOpen}
          onClose={handleCloseVideoModal}
          videoUrl={videoModalState.videoUrl}
          videoName={videoModalState.videoName}
        />
      )}
      <SubtaskQuickPreviewSheet
        isOpen={previewState.isOpen}
        onOpenChange={handleClosePreview}
        subtaskId={previewState.subtaskId}
        projectId={projectId}
        taskId={taskId}
      />
    </div>
  );
}
