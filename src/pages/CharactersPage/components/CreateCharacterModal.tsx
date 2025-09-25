import { Loader2 } from 'lucide-react';

import { type CharacterCreate } from '@/api/charactersService';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { TextArea } from '@/components/ui/TextArea';

interface CreateCharacterModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  newCharacter: Partial<CharacterCreate>;
  onNewCharacterChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleCreateCharacter: () => void;
  isCreating: boolean;
}

export function CreateCharacterModal({
  isOpen,
  onOpenChange,
  newCharacter,
  onNewCharacterChange,
  handleCreateCharacter,
  isCreating,
}: CreateCharacterModalProps): JSX.Element {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>新しいキャラクターを追加</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              名前 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              value={newCharacter.name || ''}
              onChange={onNewCharacterChange}
              placeholder="キャラクターの名前"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alias">別名</Label>
            <Input
              id="alias"
              name="alias"
              value={newCharacter.alias || ''}
              onChange={onNewCharacterChange}
              placeholder="キャラクターの別名（任意）"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <TextArea
              id="description"
              name="description"
              value={newCharacter.description || ''}
              onChange={onNewCharacterChange}
              className="min-h-[100px]"
              placeholder="キャラクターの説明（任意）"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="features">特徴</Label>
            <TextArea
              id="features"
              name="features"
              value={newCharacter.features || ''}
              onChange={onNewCharacterChange}
              className="min-h-[100px]"
              placeholder="キャラクターの特徴（任意）"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            キャンセル
          </Button>
          <Button onClick={handleCreateCharacter} disabled={isCreating}>
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isCreating ? '作成中...' : '作成する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
