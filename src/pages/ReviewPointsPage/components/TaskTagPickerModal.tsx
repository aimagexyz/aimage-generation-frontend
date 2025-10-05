import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useTaskTags } from '@/hooks/useTaskTags';

interface TaskTagPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tagIds: string[]) => void;
  projectId: string;
  initialSelectedIds: string[];
}

export function TaskTagPickerModal({
  isOpen,
  onClose,
  onConfirm,
  projectId,
  initialSelectedIds,
}: TaskTagPickerModalProps) {
  const { data: allTags = [], isLoading } = useTaskTags(projectId);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync state with props
  useEffect(() => {
    setSelectedIds(initialSelectedIds);
  }, [initialSelectedIds, isOpen]);

  const filteredTags = allTags.filter((tag) => tag.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleToggleSelect = (tagId: string) => {
    setSelectedIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const handleConfirm = () => {
    onConfirm(selectedIds);
    onClose();
  };

  const handleCancel = () => {
    // Reset to initial state on cancel
    setSelectedIds(initialSelectedIds);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>関連タスクタグを管理</DialogTitle>
        </DialogHeader>

        <div className="relative flex-shrink-0">
          <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
          <Input
            placeholder="タグ名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 py-4">
            {(() => {
              if (isLoading) {
                return <p className="text-muted-foreground">読み込み中...</p>;
              }

              if (filteredTags.length === 0) {
                const emptyMessage = searchQuery ? '検索結果がありません' : 'タスクタグがありません';
                return <p className="text-muted-foreground text-center py-8">{emptyMessage}</p>;
              }

              return (
                <AnimatePresence>
                  {filteredTags.map((tag) => (
                    <motion.div
                      key={tag.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex items-center p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleToggleSelect(tag.id)}
                    >
                      <Checkbox
                        id={`tag-${tag.id}`}
                        checked={selectedIds.includes(tag.id)}
                        onCheckedChange={() => handleToggleSelect(tag.id)}
                        className="mr-3"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <label htmlFor={`tag-${tag.id}`} className="font-medium cursor-pointer">
                          {tag.name}
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          作成日: {new Date(tag.created_at).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              );
            })()}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground">{selectedIds.length}件選択中</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                キャンセル
              </Button>
              <Button onClick={handleConfirm}>確定</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
