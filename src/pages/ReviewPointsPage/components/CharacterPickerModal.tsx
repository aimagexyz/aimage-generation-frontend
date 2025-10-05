import { motion } from 'framer-motion';
import { Check, Search, User } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { CharacterDetail } from '@/api/charactersService';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useListCharacters } from '@/hooks/useCharacters';

interface CharacterPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedCharacterIds: string[]) => void;
  projectId: string;
  initialSelectedIds?: string[];
}

export function CharacterPickerModal({
  isOpen,
  onClose,
  onConfirm,
  projectId,
  initialSelectedIds = [],
}: CharacterPickerModalProps) {
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(initialSelectedIds);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: characters = [], isLoading } = useListCharacters(projectId);

  const filteredCharacters = useMemo(() => {
    if (!searchTerm) {
      return characters;
    }

    const lowercaseSearch = searchTerm.toLowerCase();
    return characters.filter(
      (character: CharacterDetail) =>
        character.name.toLowerCase().includes(lowercaseSearch) ||
        character.alias?.toLowerCase().includes(lowercaseSearch) ||
        character.description?.toLowerCase().includes(lowercaseSearch),
    );
  }, [characters, searchTerm]);

  const handleToggleCharacter = (characterId: string) => {
    setSelectedCharacterIds((prev) => {
      if (prev.includes(characterId)) {
        return prev.filter((id) => id !== characterId);
      }
      return [...prev, characterId];
    });
  };

  const handleConfirm = () => {
    onConfirm(selectedCharacterIds);
  };

  const handleReset = () => {
    setSelectedCharacterIds(initialSelectedIds);
  };

  const selectedCount = selectedCharacterIds.length;
  const hasChanges =
    selectedCharacterIds.length !== initialSelectedIds.length ||
    !selectedCharacterIds.every((id) => initialSelectedIds.includes(id));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">キャラクター選択</h2>
              <p className="text-sm text-muted-foreground mt-1">Review Setに関連付けるキャラクターを選択してください</p>
            </div>
            {/* Dialog already has built-in close button */}
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="キャラクター名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Selected Count */}
          <div className="mb-4 text-sm text-muted-foreground">{selectedCount}件のキャラクターが選択されています</div>

          {/* Character List */}
          <ScrollArea className="h-96 mb-6">
            {(() => {
              if (isLoading) {
                return (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">読み込み中...</div>
                  </div>
                );
              }

              if (filteredCharacters.length === 0) {
                const emptyMessage = searchTerm
                  ? '検索条件に一致するキャラクターが見つかりませんでした'
                  : 'キャラクターがありません';

                return (
                  <div className="flex flex-col items-center justify-center py-8">
                    <User className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {filteredCharacters.map((character: CharacterDetail) => {
                    const isSelected = selectedCharacterIds.includes(character.id);

                    return (
                      <motion.div
                        key={character.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`
                      p-3 rounded-lg border cursor-pointer transition-all
                      ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }
                    `}
                        onClick={() => handleToggleCharacter(character.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {character.image_url ? (
                              <img
                                src={character.image_url}
                                alt={character.name}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{character.name}</h4>
                              {character.alias && (
                                <p className="text-xs text-muted-foreground truncate">別名: {character.alias}</p>
                              )}
                              {character.description && (
                                <p className="text-xs text-muted-foreground truncate mt-1">{character.description}</p>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <div className="flex-shrink-0 ml-2">
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-3 h-3 text-primary-foreground" />
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })()}
          </ScrollArea>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
              リセット
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button onClick={handleConfirm} disabled={!hasChanges}>
                確定 ({selectedCount}件)
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
