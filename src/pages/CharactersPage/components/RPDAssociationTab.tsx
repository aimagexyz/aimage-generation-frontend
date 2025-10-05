import { Clock, FileText, Hash, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { CharacterRPD } from '@/api/rpdCharacterAssociationsService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  useCharacterRPDAssociations,
  useCreateRPDCharacterAssociation,
  useDeleteRPDCharacterAssociation,
} from '@/hooks/useRPDCharacterAssociations';
import type { ReviewPointDefinitionSchema } from '@/types/ReviewPointDefinition';

import { useReviewPointDefinitions } from '../../ReviewPointsPage/hooks/useReviewPointDefinitions';

interface RPDAssociationTabProps {
  characterId: string;
  projectId: string;
}

export function RPDAssociationTab({ characterId, projectId }: RPDAssociationTabProps): JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRPDId, setSelectedRPDId] = useState<string>('');

  // Hooks
  const { data: associationsData, isLoading: isLoadingAssociations } = useCharacterRPDAssociations(characterId);
  const { data: allRPDs = [], isLoading: isLoadingRPDs } = useReviewPointDefinitions({ projectId });
  const createAssociationMutation = useCreateRPDCharacterAssociation();
  const deleteAssociationMutation = useDeleteRPDCharacterAssociation();

  // Get associated RPDs from the response
  const associatedRPDs = associationsData?.rpds || [];

  // Filter available RPDs (not already associated)
  const associatedRPDIds = new Set(associatedRPDs.map((rpd) => rpd.id));
  const availableRPDs = allRPDs.filter(
    (rpd) =>
      !associatedRPDIds.has(rpd.id) &&
      (rpd.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rpd.current_version?.title || '').toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleCreateAssociation = async () => {
    if (!selectedRPDId) {
      return;
    }

    try {
      await createAssociationMutation.mutateAsync({
        characterId,
        rpdId: selectedRPDId,
      });

      // Reset form
      setSelectedRPDId('');
      setSearchTerm('');
    } catch (error) {
      console.error('Failed to create association:', error);
    }
  };

  const handleDeleteAssociation = async (rpdId: string) => {
    try {
      await deleteAssociationMutation.mutateAsync({
        characterId,
        rpdId,
      });
    } catch (error) {
      console.error('Failed to delete association:', error);
    }
  };

  if (isLoadingAssociations || isLoadingRPDs) {
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
          <FileText className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-medium text-gray-900">RPD連携管理</h3>
          <Badge variant="secondary" className="text-xs">
            {associatedRPDs.length} 件
          </Badge>
        </div>
      </div>

      {/* Add New Association */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          新しいRPD関連付けを追加
        </h4>

        <div className="space-y-4">
          {/* RPD Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">RPD検索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="RPDキーまたはタイトルで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* RPD Selection */}
            {searchTerm && (
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
                {availableRPDs.length > 0 ? (
                  availableRPDs.map((rpd) => (
                    <button
                      key={rpd.id}
                      onClick={() => {
                        setSelectedRPDId(rpd.id);
                        setSearchTerm(rpd.current_version?.title || rpd.key);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-sm">{rpd.current_version?.title || 'Untitled'}</div>
                      <div className="text-xs text-gray-500 font-mono">{rpd.key}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">該当するRPDがありません</div>
                )}
              </div>
            )}
          </div>

          <Button
            onClick={() => void handleCreateAssociation()}
            disabled={!selectedRPDId || createAssociationMutation.isPending}
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
          <FileText className="w-4 h-4 mr-2 text-blue-500" />
          現在の関連付け
        </h4>

        {associatedRPDs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">関連付けられたRPDがありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {associatedRPDs.map((rpd) => {
              // Find the full RPD data from allRPDs to get additional details
              const fullRPD = allRPDs.find((r) => r.id === rpd.id);
              return (
                <RPDAssociationItem
                  key={rpd.id}
                  rpd={rpd}
                  fullRPD={fullRPD}
                  onDelete={() => void handleDeleteAssociation(rpd.id)}
                  isDeleting={deleteAssociationMutation.isPending}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// RPD Association Item Component
interface RPDAssociationItemProps {
  rpd: CharacterRPD;
  fullRPD?: ReviewPointDefinitionSchema;
  onDelete: () => void;
  isDeleting: boolean;
}

function RPDAssociationItem({ rpd, fullRPD, onDelete, isDeleting }: RPDAssociationItemProps): JSX.Element {
  const rpdTitle = fullRPD?.current_version?.title || fullRPD?.versions?.[0]?.title || 'Unknown RPD';
  const rpdKey = rpd.key || 'unknown';
  const isActive = rpd.is_active;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h5 className="font-medium text-gray-900">{rpdTitle}</h5>
              <Badge variant="outline" className="text-xs font-mono bg-blue-50 border-blue-200 text-blue-700">
                {rpdKey}
              </Badge>
              <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                {isActive ? 'アクティブ' : '非アクティブ'}
              </Badge>
            </div>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Hash className="w-3 h-3" />
                <span>v{fullRPD?.current_version_num || '?'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(rpd.created_at).toLocaleDateString('ja-JP')}</span>
              </div>
            </div>
            {fullRPD?.current_version?.description_for_ai && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{fullRPD.current_version.description_for_ai}</p>
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
