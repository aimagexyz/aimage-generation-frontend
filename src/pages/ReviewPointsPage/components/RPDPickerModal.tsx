import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useReviewPointDefinitions } from '@/pages/ReviewPointsPage/hooks/useReviewPointDefinitions';

interface RPDPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rpdIds: string[]) => void;
  projectId: string;
  initialSelectedIds: string[];
}

export function RPDPickerModal({ isOpen, onClose, onConfirm, projectId, initialSelectedIds }: RPDPickerModalProps) {
  const { data: allRpds = [], isLoading } = useReviewPointDefinitions({ projectId });
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync state with props
  useEffect(() => {
    setSelectedIds(initialSelectedIds);
  }, [initialSelectedIds, isOpen]);

  const filteredRpds = allRpds.filter(
    (rpd) =>
      rpd.current_version?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rpd.key?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleToggleSelect = (rpdId: string) => {
    setSelectedIds((prev) => (prev.includes(rpdId) ? prev.filter((id) => id !== rpdId) : [...prev, rpdId]));
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
          <DialogTitle>関連RPDを管理</DialogTitle>
        </DialogHeader>

        <div className="relative flex-shrink-0">
          <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
          <Input
            placeholder="タイトルやキーで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 py-4">
            {isLoading ? (
              <p className="text-muted-foreground">読み込み中...</p>
            ) : (
              <AnimatePresence>
                {filteredRpds.map((rpd) => (
                  <motion.div
                    key={rpd.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleToggleSelect(rpd.id)}
                  >
                    <Checkbox
                      id={`rpd-${rpd.id}`}
                      checked={selectedIds.includes(rpd.id)}
                      onCheckedChange={() => handleToggleSelect(rpd.id)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <label htmlFor={`rpd-${rpd.id}`} className="font-medium cursor-pointer">
                        {rpd.current_version?.title || 'タイトルなし'}
                      </label>
                      <p className="text-sm text-muted-foreground">キー: {rpd.key}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            キャンセル
          </Button>
          <Button onClick={handleConfirm}>決定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
