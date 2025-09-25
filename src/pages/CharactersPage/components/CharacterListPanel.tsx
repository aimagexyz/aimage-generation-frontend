import { AnimatePresence, motion } from 'framer-motion';
import { Filter, Loader2, Plus, Search, User } from 'lucide-react';

import type { CharacterDetail } from '@/api/charactersService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Input } from '@/components/ui/Input';
import { ScrollArea } from '@/components/ui/ScrollArea';

import { CharacterCard } from './CharacterCard';

type FilterStatus = 'all' | 'with-image' | 'without-image';

interface CharacterListPanelProps {
  isLoading: boolean;
  filteredCharacters: CharacterDetail[];
  selectedCharacter: CharacterDetail | null;
  characterImageUrls: Record<string, string>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: FilterStatus;
  setFilterStatus: (status: FilterStatus) => void;
  handleSelectCharacter: (character: CharacterDetail) => void;
  handleCreateCharacterClick: () => void;
  hasImage: (character: CharacterDetail) => boolean;
  getStatusText: (hasImg: boolean) => string;
  getStatusVariant: (hasImg: boolean) => 'default' | 'secondary';
}

export function CharacterListPanel({
  isLoading,
  filteredCharacters,
  selectedCharacter,
  characterImageUrls,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  handleSelectCharacter,
  handleCreateCharacterClick,
  hasImage,
  getStatusText,
  getStatusVariant,
}: CharacterListPanelProps) {
  const renderCharacterList = () => {
    if (isLoading) {
      return (
        <motion.div
          className="flex items-center justify-center p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="space-y-2 text-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader2 className="w-8 h-8 mx-auto text-muted-foreground" />
            </motion.div>
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          </div>
        </motion.div>
      );
    }

    if (filteredCharacters.length === 0) {
      return (
        <motion.div
          className="p-8 space-y-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-center w-16 h-16 mx-auto border rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border-primary/10">
            <User className="w-8 h-8 text-primary/60" />
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">
              {searchQuery || filterStatus !== 'all'
                ? '条件に一致するキャラクターがありません'
                : '最初のキャラクターを作成しましょう'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || filterStatus !== 'all'
                ? '検索条件やフィルターを調整して、お探しのキャラクターを見つけてください。すべてのキャラクターを表示するには、フィルターをクリアしてください。'
                : '新しいキャラクターを追加して、プロジェクトのキャラクター管理を始めましょう。効率的な管理システムでクリエイティブワークを向上させます。'}
            </p>
          </div>
          {!searchQuery && filterStatus === 'all' && (
            <Button onClick={handleCreateCharacterClick} size="lg" className="mt-6">
              <Plus className="w-5 h-5 mr-2" />
              最初のキャラクターを作成
            </Button>
          )}
          {(searchQuery || filterStatus !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
              }}
              className="mt-4"
            >
              フィルターをクリア
            </Button>
          )}
        </motion.div>
      );
    }

    return (
      <div className="space-y-2">
        <AnimatePresence>
          {filteredCharacters.map((character, index) => (
            <motion.div
              key={character.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <CharacterCard
                character={character}
                isSelected={selectedCharacter?.id === character.id}
                imageUrl={characterImageUrls[character.id] || ''}
                hasImage={hasImage(character)}
                onSelect={handleSelectCharacter}
                getStatusText={getStatusText}
                getStatusVariant={getStatusVariant}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      className="flex flex-col border-r bg-background/50 backdrop-blur-sm border-border/50 w-80 min-w-0"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="flex-shrink-0 p-4 space-y-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
            <Input
              placeholder="名前などで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50"
              aria-label="キャラクターを検索"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-background/50" aria-label="ステータスでフィルター">
                <Filter className="w-4 h-4 mr-2" />
                {filterStatus !== 'all' ? (
                  <Badge variant="secondary" className="text-xs">
                    {filterStatus === 'with-image' && '画像あり'}
                    {filterStatus === 'without-image' && '画像なし'}
                  </Badge>
                ) : (
                  'ステータス'
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuCheckboxItem checked={filterStatus === 'all'} onCheckedChange={() => setFilterStatus('all')}>
                すべてのキャラクター
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterStatus === 'with-image'}
                onCheckedChange={() => setFilterStatus('with-image')}
              >
                <User className="w-4 h-4 mr-2 text-green-600" />
                画像ありのみ
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterStatus === 'without-image'}
                onCheckedChange={() => setFilterStatus('without-image')}
              >
                <User className="w-4 h-4 mr-2 text-muted-foreground" />
                画像なしのみ
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="relative p-2">{renderCharacterList()}</div>
      </ScrollArea>
    </motion.div>
  );
}
