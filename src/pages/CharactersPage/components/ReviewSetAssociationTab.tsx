import { Clock, Loader2, Package, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useReviewSets } from '@/hooks/reviewSets/useReviewSets';
import {
  useCharacterReviewSetAssociations,
  useCreateReviewSetCharacterAssociation,
  useDeleteReviewSetCharacterAssociation,
} from '@/hooks/useReviewSetCharacterAssociations';
import type { ReviewSetCharacterAssociationWithDetails } from '@/types/ReviewSetCharacterAssociation';

interface ReviewSetAssociationTabProps {
  characterId: string;
  projectId: string;
}

export function ReviewSetAssociationTab({ characterId, projectId }: ReviewSetAssociationTabProps): JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReviewSetId, setSelectedReviewSetId] = useState<string>('');

  // Hooks
  const { data: allReviewSets = [], isLoading: isLoadingReviewSets } = useReviewSets(projectId);
  const { data: associations = [], isLoading: isLoadingAssociations } = useCharacterReviewSetAssociations(characterId);
  const createAssociationMutation = useCreateReviewSetCharacterAssociation();
  const deleteAssociationMutation = useDeleteReviewSetCharacterAssociation();

  // Transform associations to ReviewSet format for easier usage
  const associatedReviewSets = associations.map((association) => association.review_set);

  // Filter available ReviewSets (not already associated)
  const associatedReviewSetIds = new Set(associatedReviewSets.map((rs) => rs.id));
  const availableReviewSets = allReviewSets.filter(
    (reviewSet) =>
      !associatedReviewSetIds.has(reviewSet.id) && reviewSet.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleCreateAssociation = async () => {
    if (!selectedReviewSetId) {
      return;
    }

    try {
      await createAssociationMutation.mutateAsync({
        review_set_id: selectedReviewSetId,
        character_id: characterId,
      });

      // Reset form
      setSelectedReviewSetId('');
      setSearchTerm('');
    } catch (error) {
      console.error('Failed to create association:', error);
    }
  };

  const handleDeleteAssociation = async (association: ReviewSetCharacterAssociationWithDetails) => {
    try {
      await deleteAssociationMutation.mutateAsync({
        reviewSetId: association.review_set_id,
        characterId: association.character_id,
      });
    } catch (error) {
      console.error('Failed to delete association:', error);
    }
  };

  if (isLoadingAssociations || isLoadingReviewSets) {
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
          <Package className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-medium text-gray-900">レビューセット連携管理</h3>
          <Badge variant="secondary" className="text-xs">
            {associatedReviewSets.length} 件
          </Badge>
        </div>
      </div>

      {/* Add New Association */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          新しいレビューセット関連付けを追加
        </h4>

        <div className="space-y-4">
          {/* ReviewSet Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">レビューセット検索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="レビューセット名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* ReviewSet Selection */}
            {searchTerm && (
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
                {availableReviewSets.length > 0 ? (
                  availableReviewSets.map((reviewSet) => (
                    <button
                      key={reviewSet.id}
                      onClick={() => {
                        setSelectedReviewSetId(reviewSet.id);
                        setSearchTerm(reviewSet.name);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-sm">{reviewSet.name}</div>
                      {reviewSet.description && <div className="text-xs text-gray-500">{reviewSet.description}</div>}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">該当するレビューセットがありません</div>
                )}
              </div>
            )}
          </div>

          <Button
            onClick={() => void handleCreateAssociation()}
            disabled={!selectedReviewSetId || createAssociationMutation.isPending}
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
          <Package className="w-4 h-4 mr-2 text-blue-500" />
          現在の関連付け
        </h4>

        {associations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">関連付けられたレビューセットがありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {associations.map((association) => (
              <ReviewSetAssociationItem
                key={association.review_set_id}
                association={association}
                onDelete={() => void handleDeleteAssociation(association)}
                isDeleting={deleteAssociationMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ReviewSet Association Item Component
interface ReviewSetAssociationItemProps {
  association: ReviewSetCharacterAssociationWithDetails;
  onDelete: () => void;
  isDeleting: boolean;
}

function ReviewSetAssociationItem({ association, onDelete, isDeleting }: ReviewSetAssociationItemProps): JSX.Element {
  const reviewSet = association.review_set;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h5 className="font-medium text-gray-900">{reviewSet.name}</h5>
              <Badge variant="outline" className="text-xs">
                関連付け済み
              </Badge>
            </div>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(reviewSet.created_at).toLocaleDateString('ja-JP')}</span>
              </div>
            </div>
            {reviewSet.description && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{reviewSet.description}</p>
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
