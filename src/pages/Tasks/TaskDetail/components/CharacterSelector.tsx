import { Search, User } from 'lucide-react';
import { useState } from 'react';

import type { CharacterDetail } from '@/api/charactersService';
import { LazyImage } from '@/components/ui/LazyImage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useCharacterGallery } from '@/hooks/useCharacters';

import { useCharacters } from '../hooks/useCharacters';

interface CharacterSelectorProps {
  projectId: string;
  selectedCharacter: CharacterDetail | null;
  onCharacterSelect: (character: CharacterDetail | null) => void;
  compact?: boolean;
}

interface CharacterSelectItemProps {
  character: CharacterDetail;
  showImageCount?: boolean;
  imageCount?: number;
  compact?: boolean;
}

function CharacterSelectItem({
  character,
  showImageCount = false,
  imageCount = 0,
  compact = false,
}: CharacterSelectItemProps) {
  return (
    <div className={`flex items-center gap-3 w-full ${compact ? 'py-1' : ''}`}>
      <div className={`rounded-full overflow-hidden bg-gray-100 flex-shrink-0 ${compact ? 'w-6 h-6' : 'w-8 h-8'}`}>
        {character.image_url ? (
          <LazyImage src={character.image_url} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className={`text-gray-400 ${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
          </div>
        )}
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className={`font-medium truncate ${compact ? 'text-xs' : 'text-sm'}`}>{character.name}</div>
        {character.alias && !compact && <div className="text-xs text-gray-500 truncate">{character.alias}</div>}
      </div>
      {showImageCount && (
        <div className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">{imageCount}枚</div>
      )}
    </div>
  );
}

function LoadingState({ compact }: { compact: boolean }) {
  return (
    <div className={`text-center ${compact ? 'py-2' : 'py-4'}`}>
      <div
        className={`mx-auto mb-2 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin ${compact ? 'w-4 h-4' : 'w-6 h-6'}`}
      />
      <p className={`font-medium text-gray-700 ${compact ? 'text-xs' : 'text-sm'}`}>読み込み中...</p>
    </div>
  );
}

function ErrorState({ compact }: { compact: boolean }) {
  return (
    <div className={`text-center text-red-600 ${compact ? 'py-2' : 'py-4'}`}>
      <p className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>読み込みエラー</p>
      {!compact && <p className="text-xs">キャラクターの読み込みに失敗しました</p>}
    </div>
  );
}

function EmptyState({ compact }: { compact: boolean }) {
  return (
    <div className={`text-center ${compact ? 'py-2' : 'py-4'}`}>
      <User className={`mx-auto mb-2 text-gray-300 ${compact ? 'w-6 h-6' : 'w-8 h-8'}`} />
      <p className={`font-medium text-gray-700 ${compact ? 'text-xs' : 'text-sm'}`}>キャラクターがありません</p>
      {!compact && <p className="text-xs text-gray-500">プロジェクト設定でキャラクターを追加してください</p>}
    </div>
  );
}

function NoSelectionItem() {
  return (
    <SelectItem value="__none__" className="p-3">
      <div className="flex items-center gap-3 w-full">
        <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
          <User className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="font-medium text-sm text-gray-500">選択なし</div>
        </div>
      </div>
    </SelectItem>
  );
}

function SearchInput({ searchTerm, onSearchChange }: { searchTerm: string; onSearchChange: (value: string) => void }) {
  return (
    <div className="sticky top-0 bg-white border-b p-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="キャラクター名で検索..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

function CharacterList({ characters, searchTerm }: { characters: CharacterDetail[]; searchTerm: string }) {
  const hasResults = characters.length > 0;

  return (
    <div className="max-h-[300px] overflow-y-auto">
      <NoSelectionItem />

      {hasResults ? (
        characters.map((character) => (
          <SelectItem key={character.id} value={character.id} className="p-3">
            <CharacterSelectItem character={character} compact={false} />
          </SelectItem>
        ))
      ) : (
        <div className="p-6 text-center text-sm text-gray-500">
          <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p>「{searchTerm}」に一致するキャラクターが見つかりません</p>
        </div>
      )}
    </div>
  );
}

export function CharacterSelector({
  projectId,
  selectedCharacter,
  onCharacterSelect,
  compact = false,
}: CharacterSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const { characters, isLoading: isCharactersLoading, isError: isCharactersError } = useCharacters({ projectId });

  // Fetch gallery images for the selected character to show count
  const { data: galleryData } = useCharacterGallery(selectedCharacter?.id || null, projectId);

  // Get gallery images from the API response
  const galleryImages = galleryData?.gallery_images || [];
  const totalImages = galleryImages.length;

  const filteredCharacters =
    characters?.filter(
      (character) =>
        character.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (character.alias && character.alias.toLowerCase().includes(searchTerm.toLowerCase())),
    ) || [];

  const handleValueChange = (value: string) => {
    if (value === '__none__') {
      onCharacterSelect(null);
    } else {
      const character = characters?.find((c) => c.id === value) || null;
      onCharacterSelect(character);
    }
  };

  // Early returns for different states
  if (isCharactersLoading) {
    return <LoadingState compact={compact} />;
  }

  if (isCharactersError) {
    return <ErrorState compact={compact} />;
  }

  if (!characters || characters.length === 0) {
    return <EmptyState compact={compact} />;
  }

  return (
    <div className="space-y-2">
      <Select value={selectedCharacter?.id || '__none__'} onValueChange={handleValueChange}>
        <SelectTrigger className={`text-left ${compact ? 'h-8 p-2 text-xs' : 'h-auto p-3'}`}>
          <SelectValue placeholder={compact ? 'キャラクターを選択' : 'キャラクターを選択してください'}>
            {selectedCharacter && (
              <CharacterSelectItem
                character={selectedCharacter}
                showImageCount={!compact}
                imageCount={totalImages}
                compact={compact}
              />
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          <SearchInput searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          <CharacterList characters={filteredCharacters} searchTerm={searchTerm} />
        </SelectContent>
      </Select>
    </div>
  );
}
