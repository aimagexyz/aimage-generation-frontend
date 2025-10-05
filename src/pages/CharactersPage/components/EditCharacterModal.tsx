import { Loader2 } from 'lucide-react';

import { type CharacterUpdate } from '@/api/charactersService';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { TextArea } from '@/components/ui/TextArea';

interface EditCharacterModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  editCharacter: CharacterUpdate;
  onEditCharacterChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleUpdateCharacter: () => void;
  isUpdating: boolean;
}

export function EditCharacterModal({
  isOpen,
  onOpenChange,
  editCharacter,
  onEditCharacterChange,
  handleUpdateCharacter,
  isUpdating,
}: EditCharacterModalProps): JSX.Element {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>キャラクターを編集</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">
              名前 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-name"
              name="name"
              value={editCharacter.name || ''}
              onChange={onEditCharacterChange}
              placeholder="キャラクターの名前"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-alias">別名</Label>
            <Input
              id="edit-alias"
              name="alias"
              value={editCharacter.alias || ''}
              onChange={onEditCharacterChange}
              placeholder="キャラクターの別名（任意）"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">説明</Label>
            <TextArea
              id="edit-description"
              name="description"
              value={editCharacter.description || ''}
              onChange={onEditCharacterChange}
              className="min-h-[100px]"
              placeholder="キャラクターの説明（任意）"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-features">特徴</Label>
            <TextArea
              id="edit-features"
              name="features"
              value={editCharacter.features || ''}
              onChange={onEditCharacterChange}
              className="min-h-[100px]"
              placeholder="キャラクターの特徴（任意）"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            キャンセル
          </Button>
          <Button onClick={handleUpdateCharacter} disabled={isUpdating}>
            {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isUpdating ? '更新中...' : '更新する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
