import { useState } from 'react';
import { LuPlus, LuX } from 'react-icons/lu';

import { type TaskTagCreate, type TaskTagOut, taskTagsService } from '@/api/taskTagsService';
import { toast } from '@/components/ui/use-toast';
import { useCreateTaskTag, useTaskTags } from '@/hooks/useTaskTags';

import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/Dialog';
import { Input } from './ui/Input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/Popover';

// Error type for API responses
interface ApiError {
  response?: {
    status?: number;
    data?: {
      detail?: string;
    };
  };
}

interface TaskTagsProps {
  taskId: string;
  projectId: string;
  initialTags?: TaskTagOut[];
  onTagsChange?: (tags: TaskTagOut[]) => void;
  editable?: boolean;
}

export function TaskTags({ taskId, projectId, initialTags = [], onTagsChange, editable = true }: TaskTagsProps) {
  const [tags, setTags] = useState<TaskTagOut[]>(initialTags);
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);
  const [isCreateTagOpen, setIsCreateTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [removingTagId, setRemovingTagId] = useState<string | null>(null);

  const { data: availableTags = [], refetch: refetchTags } = useTaskTags(projectId);
  const { mutate: createTag, isPending: isCreatingTag } = useCreateTaskTag();

  const filteredAvailableTags = availableTags.filter(
    (tag) => !tags.some((t) => t.id === tag.id) && tag.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAddTag = async (tag: TaskTagOut, skipToast = false) => {
    setIsAddingTag(true);
    try {
      await taskTagsService.addTagToTask(taskId, tag.id);

      const updatedTags = [...tags, tag];
      setTags(updatedTags);
      onTagsChange?.(updatedTags);
      setIsAddTagOpen(false);
      setSearchQuery('');

      // Only show toast if not called from create flow
      if (!skipToast) {
        toast({
          title: '成功',
          description: `タグ「${tag.name}」を追加しました`,
        });
      }
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
    const tagToRemove = tags.find((t) => t.id === tagId);
    setRemovingTagId(tagId);
    try {
      await taskTagsService.removeTagFromTask(taskId, tagId);

      const updatedTags = tags.filter((t) => t.id !== tagId);
      setTags(updatedTags);
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
        void handleAddTag(newTag, true).then(() => {
          // Pass true to skip the duplicate toast
          setIsCreateTagOpen(false);
          setNewTagName('');
          void refetchTags();
        });
      },
      onError: (err: unknown) => {
        const error = err as ApiError;
        // Check for 400 error (duplicate tag)
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
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <Badge key={tag.id} variant="secondary" className="flex items-center gap-1 px-2 py-1">
          <span className="text-xs">{tag.name}</span>
          {editable && (
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
          )}
        </Badge>
      ))}

      {editable && (
        <Popover open={isAddTagOpen} onOpenChange={setIsAddTagOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2">
              <LuPlus className="h-3 w-3 mr-1" />
              タグを追加
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-2">
              <Input
                placeholder="タグを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8"
              />
              <div className="border rounded-md scrollbar-thin">
                {filteredAvailableTags.length > 0 ? (
                  <div className="p-1 space-y-1">
                    {filteredAvailableTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => void handleAddTag(tag)}
                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded disabled:opacity-50"
                        disabled={isAddingTag}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground p-2">タグが見つかりません</div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setIsAddTagOpen(false);
                  setIsCreateTagOpen(true);
                }}
              >
                <LuPlus className="h-3 w-3 mr-1" />
                新しいタグを作成
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      <Dialog open={isCreateTagOpen} onOpenChange={setIsCreateTagOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しいタグを作成</DialogTitle>
            <DialogDescription>プロジェクト内で使用する新しいタグを作成します</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="タグ名を入力..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateAndAddTag();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateTagOpen(false);
                setNewTagName('');
              }}
            >
              キャンセル
            </Button>
            <Button onClick={handleCreateAndAddTag} disabled={!newTagName.trim() || isCreatingTag}>
              {isCreatingTag ? '作成中...' : '作成して追加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
