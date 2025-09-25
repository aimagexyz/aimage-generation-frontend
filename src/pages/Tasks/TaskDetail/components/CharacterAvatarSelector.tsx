import { Plus, X } from 'lucide-react';
import { useState } from 'react';

import type { CharacterDetail } from '@/api/charactersService';
import { LazyImage } from '@/components/ui/LazyImage';

import { CharacterSelector } from './CharacterSelector';

interface CharacterAvatarSelectorProps {
  projectId: string;
  predictedCharacters: CharacterDetail[];
  selectedCharacter: CharacterDetail | null;
  onCharacterSelect: (character: CharacterDetail | null) => void;
  onCharacterAdd?: (character: CharacterDetail) => void;
  onCharacterRemove?: (character: CharacterDetail) => void;
  showEmptyState?: boolean; // 是否显示空状态的加号圆圈
}

export function CharacterAvatarSelector({
  projectId,
  predictedCharacters,
  selectedCharacter,
  onCharacterSelect,
  onCharacterAdd,
  onCharacterRemove,
  showEmptyState = false,
}: CharacterAvatarSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleAvatarClick = (character: CharacterDetail) => {
    onCharacterSelect(character);
  };

  const handleAddClick = () => {
    setShowDropdown(true);
  };

  const handleDropdownSelect = (character: CharacterDetail | null) => {
    if (character && onCharacterAdd) {
      // 检查角色是否已经在预测列表中
      const isAlreadyAdded = predictedCharacters.some((c) => c.id === character.id);
      if (!isAlreadyAdded) {
        onCharacterAdd(character);
      }
      // 选中新添加的角色
      onCharacterSelect(character);
    } else {
      onCharacterSelect(character);
    }
    setShowDropdown(false);
  };

  const handleDropdownClose = () => {
    setShowDropdown(false);
  };

  const handleCharacterRemove = (character: CharacterDetail, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onCharacterRemove) {
      onCharacterRemove(character);
    }
    // 如果删除的是当前选中的角色，清空选择
    if (selectedCharacter?.id === character.id) {
      onCharacterSelect(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 头像选择区域 */}
      <div className="flex items-center gap-3 p-4 bg-muted/10 rounded-lg">
        {/* 预测的角色头像 */}
        {predictedCharacters.length > 0
          ? predictedCharacters.map((character) => (
              <button
                key={character.id}
                onClick={() => handleAvatarClick(character)}
                className={`relative w-12 h-12 rounded-full border-2 transition-all duration-200 hover:scale-105 ${
                  selectedCharacter?.id === character.id
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                title={character.name}
              >
                {character.image_url ? (
                  <LazyImage
                    src={character.image_url}
                    alt={character.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">{character.name?.charAt(0) || '?'}</span>
                  </div>
                )}
                {/* 选中状态指示器 */}
                {selectedCharacter?.id === character.id && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}

                {/* 删除按钮 */}
                {onCharacterRemove && (
                  <button
                    onClick={(e) => handleCharacterRemove(character, e)}
                    className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center hover:bg-red-600 transition-colors"
                    title="角色を削除"
                  >
                    <X className="w-2 h-2 text-white" />
                  </button>
                )}
              </button>
            ))
          : /* 没有预测角色时显示空的加号圆圈 */
            showEmptyState && (
              <button
                onClick={handleAddClick}
                className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 hover:border-blue-300 bg-gray-50 hover:bg-blue-50 transition-all duration-200 hover:scale-105 flex items-center justify-center group"
                title="角色を選択"
              >
                <Plus className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
              </button>
            )}

        {/* 添加按钮 - 只在有预测角色时显示 */}
        {predictedCharacters.length > 0 && (
          <button
            onClick={handleAddClick}
            className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 hover:border-blue-300 bg-gray-50 hover:bg-blue-50 transition-all duration-200 hover:scale-105 flex items-center justify-center group"
            title="他の角色を選択"
          >
            <Plus className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
          </button>
        )}
      </div>

      {/* 下拉选择器模态框 */}
      {showDropdown && (
        <div className="relative mt-2">
          <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">角色を選択</h3>
              <button onClick={handleDropdownClose} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>
            <CharacterSelector
              projectId={projectId}
              selectedCharacter={null}
              onCharacterSelect={handleDropdownSelect}
              compact={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
