import { useEffect, useState } from 'react';
import { LuPlus, LuSearch, LuX } from 'react-icons/lu';

import { type TaskTagCreate, type TaskTagOut, taskTagsService } from '@/api/taskTagsService';
import { toast } from '@/components/ui/use-toast';
import { useCreateTaskTag, useTaskTags } from '@/hooks/useTaskTags';

import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/Dialog';
import { Input } from './ui/Input';
import { ScrollArea } from './ui/ScrollArea';

// Error type for API responses
interface ApiError {
  response?: {
    status?: number;
    data?: {
      detail?: string;
    };
  };
}

interface TaskTagsModalProps {
  taskId: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTags?: TaskTagOut[];
  onTagsChange?: (tags: TaskTagOut[]) => void;
}

export function TaskTagsModal({
  taskId,
  projectId,
  open,
  onOpenChange,
  initialTags = [],
  onTagsChange,
}: TaskTagsModalProps) {
  const [currentTags, setCurrentTags] = useState<TaskTagOut[]>(initialTags);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [removingTagId, setRemovingTagId] = useState<string | null>(null);
  const [showNewTagInput, setShowNewTagInput] = useState(false);

  const { data: availableTags = [], refetch: refetchTags } = useTaskTags(projectId);
  const { mutate: createTag, isPending: isCreatingTag } = useCreateTaskTag();

  // Update current tags when initial tags change
  useEffect(() => {
    setCurrentTags(initialTags);
  }, [initialTags]);

  // Filter available tags based on search and exclude already added tags
  const filteredAvailableTags = availableTags.filter(
    (tag) => !currentTags.some((t) => t.id === tag.id) && tag.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Filter current tags based on search
  const displayedCurrentTags = searchQuery
    ? currentTags.filter((tag) => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : currentTags;

  const handleAddTag = async (tag: TaskTagOut) => {
    setIsAddingTag(true);
    try {
      await taskTagsService.addTagToTask(taskId, tag.id);
      const updatedTags = [...currentTags, tag];
      setCurrentTags(updatedTags);
      onTagsChange?.(updatedTags);
      toast({
        title: '成功',
        description: `タグ「${tag.name}」を追加しました`,
      });
    } catch (err) {
      const error = err as ApiError;
      if (error?.response?.status === 400) {
        toast({
          title: 'エラー',
          description: 'このタグは既にタスクに追加されています',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'エラー',
          description: 'タグの追加に失敗しました',
          variant: 'destructive',
        });
      }
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    const tagToRemove = currentTags.find((t) => t.id === tagId);
    setRemovingTagId(tagId);
    try {
      await taskTagsService.removeTagFromTask(taskId, tagId);
      const updatedTags = currentTags.filter((t) => t.id !== tagId);
      setCurrentTags(updatedTags);
      onTagsChange?.(updatedTags);
      toast({
        title: '成功',
        description: `タグ「${tagToRemove?.name}」を削除しました`,
      });
    } catch (err) {
      const error = err as ApiError;
      if (error?.response?.status === 404) {
        toast({
          title: 'エラー',
          description: 'タグが見つかりません',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'エラー',
          description: 'タグの削除に失敗しました',
          variant: 'destructive',
        });
      }
    } finally {
      setRemovingTagId(null);
    }
  };

  const handleCreateAndAddTag = () => {
    if (!newTagName.trim()) {
      return;
    }

    const tagData: TaskTagCreate = {
      name: newTagName.trim(),
      project_id: projectId,
    };

    createTag(tagData, {
      onSuccess: (newTag) => {
        toast({
          title: '成功',
          description: `タグ「${newTag.name}」を作成してタスクに追加しました`,
        });
        void handleAddTag(newTag).then(() => {
          setNewTagName('');
          setShowNewTagInput(false);
          void refetchTags();
        });
      },
      onError: (err: unknown) => {
        const error = err as ApiError;
        if (error?.response?.status === 400) {
          const detail = error?.response?.data?.detail;
          if (detail && typeof detail === 'string' && detail.includes('already exists')) {
            toast({
              title: 'エラー',
              description: 'このタグ名は既に存在します',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'エラー',
              description: 'タグの作成に失敗しました: ' + (detail || 'Invalid tag name'),
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'エラー',
            description: 'タグの作成に失敗しました',
            variant: 'destructive',
          });
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>タグ管理</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Tags Section */}
          <div>
            <h3 className="text-sm font-medium mb-2">現在のタグ</h3>
            <div className="flex flex-wrap gap-2 min-h-[60px] p-3 border rounded-lg bg-muted/30">
              {displayedCurrentTags.length > 0 ? (
                displayedCurrentTags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="flex items-center gap-1 px-2 py-1 h-7">
                    <span className="text-xs">{tag.name}</span>
                    <button
                      onClick={() => void handleRemoveTag(tag.id)}
                      className="ml-1 hover:text-destructive disabled:opacity-50"
                      aria-label={`Remove ${tag.name} tag`}
                      disabled={removingTagId === tag.id}
                    >
                      {removingTagId === tag.id ? (
                        <span className="h-3 w-3 animate-spin">...</span>
                      ) : (
                        <LuX className="h-3 w-3" />
                      )}
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  {searchQuery ? 'フィルターに一致するタグがありません' : 'タグが追加されていません'}
                </span>
              )}
            </div>
          </div>

          {/* Search and Add Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="タグを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {!showNewTagInput && (
                <Button variant="outline" size="sm" onClick={() => setShowNewTagInput(true)}>
                  <LuPlus className="h-4 w-4 mr-1" />
                  新しいタグを作成
                </Button>
              )}
            </div>

            {/* New Tag Input */}
            {showNewTagInput && (
              <div className="flex items-center gap-2 mb-3 p-3 border rounded-lg bg-muted/30">
                <Input
                  placeholder="新しいタグ名を入力..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateAndAddTag();
                    }
                  }}
                  className="flex-1"
                  autoFocus
                />
                <Button size="sm" onClick={handleCreateAndAddTag} disabled={!newTagName.trim() || isCreatingTag}>
                  {isCreatingTag ? '作成中...' : '作成して追加'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNewTagInput(false);
                    setNewTagName('');
                  }}
                >
                  キャンセル
                </Button>
              </div>
            )}

            {/* Available Tags */}
            <div>
              <h3 className="text-sm font-medium mb-2">
                {searchQuery ? '検索結果からタグを追加' : '既存のタグから追加'}
              </h3>
              <ScrollArea className="h-[200px] border rounded-lg p-2">
                <div className="flex flex-wrap gap-2">
                  {filteredAvailableTags.length > 0 ? (
                    filteredAvailableTags.map((tag) => (
                      <Button
                        key={tag.id}
                        variant="outline"
                        size="sm"
                        onClick={() => void handleAddTag(tag)}
                        disabled={isAddingTag}
                        className="h-7"
                      >
                        <LuPlus className="h-3 w-3 mr-1" />
                        {tag.name}
                      </Button>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground p-2">
                      {searchQuery ? '検索に一致するタグがありません' : '追加可能なタグがありません'}
                    </span>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            完了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
