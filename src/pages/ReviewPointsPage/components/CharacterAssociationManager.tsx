import { Loader2, Plus, Search, Trash2, Users } from 'lucide-react';
import { useState } from 'react';

import type { RPDCharacter } from '@/api/rpdCharacterAssociationsService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useListCharacters } from '@/hooks/useCharacters';
import {
  useAddCharacterToRPD,
  useRemoveCharacterFromRPD,
  useRPDCharacterAssociations,
} from '@/hooks/useRPDCharacterAssociations';

interface CharacterAssociationManagerProps {
  rpdId: string;
  projectId: string;
}

function CharacterAssociationManager({ rpdId, projectId }: CharacterAssociationManagerProps): JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');

  // Hooks
  const { data: associationsData, isLoading: isLoadingAssociations } = useRPDCharacterAssociations(rpdId);
  const { data: allCharacters = [], isLoading: isLoadingCharacters } = useListCharacters(projectId);
  const createAssociationMutation = useAddCharacterToRPD();
  const deleteAssociationMutation = useRemoveCharacterFromRPD();

  // Get associated characters from the response
  const associatedCharacters = associationsData?.characters || [];

  // Filter available characters (not already associated)
  const associatedCharacterIds = new Set(associatedCharacters.map((char) => char.id));
  const availableCharacters = allCharacters.filter(
    (character) =>
      !associatedCharacterIds.has(character.id) && character.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleCreateAssociation = async () => {
    if (!selectedCharacterId) {
      return;
    }

    try {
      await createAssociationMutation.mutateAsync({
        rpdId,
        characterId: selectedCharacterId,
      });

      // Reset form
      setSelectedCharacterId('');
      setSearchTerm('');
    } catch (error) {
      console.error('Failed to create association:', error);
    }
  };

  const handleDeleteAssociation = async (characterId: string) => {
    try {
      await deleteAssociationMutation.mutateAsync({
        rpdId,
        characterId,
      });
    } catch (error) {
      console.error('Failed to delete association:', error);
    }
  };

  if (isLoadingAssociations || isLoadingCharacters) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-medium text-gray-900">キャラクター関連付け管理</h3>
          <Badge variant="secondary" className="text-xs">
            {associatedCharacters.length} 件
          </Badge>
        </div>
      </div>

      {/* Add New Association */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          新しいキャラクター関連付けを追加
        </h4>

        <div className="space-y-4">
          {/* Character Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">キャラクター検索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="キャラクター名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Character Selection */}
            {searchTerm && (
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
                {availableCharacters.length > 0 ? (
                  availableCharacters.map((character) => (
                    <button
                      key={character.id}
                      onClick={() => {
                        setSelectedCharacterId(character.id);
                        setSearchTerm(character.name);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-sm">{character.name}</div>
                      {character.alias && <div className="text-xs text-gray-500">{character.alias}</div>}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">該当するキャラクターがありません</div>
                )}
              </div>
            )}
          </div>

          <Button
            onClick={() => void handleCreateAssociation()}
            disabled={!selectedCharacterId || createAssociationMutation.isPending}
            className="w-full"
          >
            {createAssociationMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            関連付けを追加
          </Button>
        </div>
      </div>

      {/* Current Associations */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center">
          <Users className="w-4 h-4 mr-2 text-blue-500" />
          現在の関連付け
        </h4>

        {associatedCharacters.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">関連付けられたキャラクターがありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {associatedCharacters.map((character) => (
              <CharacterAssociationItem
                key={character.id}
                character={character}
                onDelete={() => void handleDeleteAssociation(character.id)}
                isDeleting={deleteAssociationMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Character Association Item Component
interface CharacterAssociationItemProps {
  character: RPDCharacter;
  onDelete: () => void;
  isDeleting: boolean;
}

function CharacterAssociationItem({ character, onDelete, isDeleting }: CharacterAssociationItemProps): JSX.Element {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h5 className="font-medium text-gray-900">{character.name}</h5>
              {character.alias && (
                <Badge variant="outline" className="text-xs">
                  {character.alias}
                </Badge>
              )}
            </div>
            {character.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{character.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { CharacterAssociationManager };
