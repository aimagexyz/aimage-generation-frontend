import { motion } from 'framer-motion';
import { Clock, Copy, Edit3, GripVertical, Image, MoreHorizontal, Trash2, Users, X, Zap, ZapOff } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { useRemoveCharacterFromRPD, useRPDCharacterAssociations } from '@/hooks/useRPDCharacterAssociations';
import { cn } from '@/utils/utils';

import type { ReviewPointDefinitionSchema } from '../../../types/ReviewPointDefinition';
import { useDeleteRPD } from '../hooks/useDeleteRPD';
import { useDuplicateRPD } from '../hooks/useDuplicateRPD';
import DeleteRPDConfirmDialog from './DeleteRPDConfirmDialog';
import RPDHistoryModal from './RPDHistoryModal';

interface EnhancedRPDListItemProps {
  rpd: ReviewPointDefinitionSchema;
  isSelected: boolean;
  isBulkSelected: boolean;
  projectId: string;
  onSelect: () => void;
  onBulkSelect: (selected: boolean) => void;
  onStatusToggle: (newStatus: boolean) => Promise<void>;
  onEdit: () => void;
  showBulkSelect: boolean;
}

interface StatusIndicatorProps {
  isActive: boolean;
  isLoading: boolean;
  onToggle: (e: React.MouseEvent) => void;
}

interface ActionsMenuProps {
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onDuplicate: () => void;
  onViewHistory: () => void;
  isDuplicating: boolean;
  showBulkSelect?: boolean;
}

interface ReferenceImagesIndicatorProps {
  count: number;
}

interface KeyBadgeProps {
  keyType: string;
}

interface DragHandleProps {
  className?: string;
}

interface BulkSelectCheckboxProps {
  isSelected: boolean;
  title?: string;
  onSelect: (e: React.MouseEvent) => void;
}

/**
 * Status indicator component with loading state and toggle functionality
 */
function StatusIndicator({ isActive, isLoading, onToggle }: StatusIndicatorProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-shrink-0 h-9 w-9">
        <motion.div
          className="w-4 h-4 border-2 rounded-full border-primary border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          className="flex-shrink-0"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              'h-9 w-9 p-0 rounded-full transition-all duration-300 shadow-sm hover:shadow-md',
              'border-2 backdrop-blur-sm',
              isActive
                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 hover:from-emerald-100 hover:to-emerald-200 border-emerald-300'
                : 'bg-gradient-to-br from-muted/50 to-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground border-border',
            )}
            aria-label={`ステータス切り替え: 現在${isActive ? 'アクティブ' : '非アクティブ'}`}
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
              {isActive ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </motion.div>
          </Button>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="top" className="font-medium">
        <p>
          {isActive ? (
            <span className="text-emerald-700">
              アクティブ <span className="text-muted-foreground">- クリックで非アクティブ化</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              非アクティブ <span className="text-emerald-700">- クリックでアクティブ化</span>
            </span>
          )}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Actions dropdown menu component
 */
function ActionsMenu({
  onEdit,
  onDelete,
  onDuplicate,
  onViewHistory,
  isDuplicating,
  showBulkSelect,
}: ActionsMenuProps): JSX.Element {
  return (
    <div className="flex-shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              showBulkSelect
                ? 'h-7 w-7 p-0 opacity-60 group-hover:opacity-100 transition-all duration-200'
                : 'h-9 w-9 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200',
              'hover:bg-accent hover:text-accent-foreground',
            )}
            aria-label="More actions"
          >
            <MoreHorizontal className={cn(showBulkSelect ? 'w-3 h-3' : 'w-4 h-4')} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="font-medium cursor-pointer"
          >
            <Edit3 className="w-4 h-4 mr-2 text-blue-600" />
            RPD編集
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            disabled={isDuplicating}
            className="font-medium cursor-pointer"
          >
            <Copy className="w-4 h-4 mr-2 text-emerald-600" />
            {isDuplicating ? '複製中...' : 'RPD複製'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onViewHistory();
            }}
            className="font-medium cursor-pointer"
          >
            <Clock className="w-4 h-4 mr-2 text-purple-600" />
            履歴表示
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            className="font-medium cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            RPD削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * Reference images indicator component
 */
function ReferenceImagesIndicator({ count }: ReferenceImagesIndicatorProps): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center flex-shrink-0 gap-1 px-2 py-1 text-xs text-blue-700 border border-blue-200 rounded-md bg-blue-50">
          <Image className="w-3 h-3" />
          <span className="font-medium">{count}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{count}個の参照画像</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Key badge component with variant styling
 */
function KeyBadge({ keyType }: KeyBadgeProps): JSX.Element {
  const getKeyTypeVariant = (
    key: string,
  ): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string } => {
    const variantMap: Record<
      string,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
    > = {
      design_review: { variant: 'default' },
      copyright_review: { variant: 'secondary' },
      visual_review: { variant: 'outline' },
      content_review: { variant: 'default' },
      accuracy_review: { variant: 'secondary' },
      quality_review: { variant: 'default' },
      consistency_review: { variant: 'secondary' },
      technical_review: { variant: 'outline' },
      settings_review: { variant: 'secondary' },
    };
    return variantMap[key] || { variant: 'outline' };
  };

  const { variant, className: customClassName } = getKeyTypeVariant(keyType);

  return (
    <Badge
      variant={variant === 'default' ? 'outline' : variant}
      className={cn('text-xs font-medium px-2 py-1 transition-colors flex-shrink-0', customClassName)}
    >
      {keyType.replace(/_/g, ' ')}
    </Badge>
  );
}

/**
 * Drag handle component for reordering items
 */
function DragHandle({ className }: DragHandleProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center justify-center h-5 w-5 text-muted-foreground/60 hover:text-muted-foreground cursor-grab transition-colors touch-none flex-shrink-0',
        'group-hover:text-muted-foreground',
        className,
      )}
      aria-label="Drag to reorder"
    >
      <GripVertical className="w-4 h-4" />
    </div>
  );
}

/**
 * Bulk selection checkbox component
 */
function BulkSelectCheckbox({ isSelected, title, onSelect }: BulkSelectCheckboxProps): JSX.Element {
  return (
    <div className="flex-shrink-0">
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onSelect({} as React.MouseEvent)}
        onClick={onSelect}
        aria-label={`Select ${title || 'Untitled RPD'}`}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
    </div>
  );
}

/**
 * Enhanced RPD list item with modern design, drag-and-drop, and accessibility
 */
export default function EnhancedRPDListItem({
  rpd,
  isSelected,
  isBulkSelected,
  projectId,
  onSelect,
  onBulkSelect,
  onStatusToggle,
  onEdit,
  showBulkSelect,
}: EnhancedRPDListItemProps): JSX.Element {
  const [statusLoading, setStatusLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Hooks for actions
  const duplicateRPDMutation = useDuplicateRPD();
  const deleteRPDMutation = useDeleteRPD();

  // Hooks for character associations
  const { data: associationsData } = useRPDCharacterAssociations(rpd.id);
  const deleteAssociationMutation = useRemoveCharacterFromRPD();

  const associatedCharacters = associationsData?.characters || [];

  const currentVersion = rpd.versions?.find((v) => v.version === rpd.current_version_num) || rpd.current_version;
  const isActive = rpd.is_active;
  const hasReferenceImages = currentVersion?.reference_images && currentVersion.reference_images.length > 0;
  const referenceImagesCount = currentVersion?.reference_images?.length || 0;

  // Format the update date
  const lastUpdated = new Date(rpd.updated_at);
  const formattedLastUpdated = lastUpdated.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleStatusToggle = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setStatusLoading(true);
    void onStatusToggle(!isActive).finally(() => {
      setStatusLoading(false);
    });
  };

  const handleBulkSelect = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onBulkSelect(!isBulkSelected);
  };

  const handleDuplicate = (): void => {
    duplicateRPDMutation.mutate({
      sourceRpd: rpd,
      projectId,
    });
  };

  const handleViewHistory = (): void => {
    setShowHistoryModal(true);
  };

  const handleDeleteClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = (): void => {
    deleteRPDMutation.mutate(rpd.id, {
      onSuccess: () => {
        setShowDeleteDialog(false);
      },
    });
  };

  const handleRemoveCharacter = (characterId: string) => {
    void deleteAssociationMutation
      .mutateAsync({
        rpdId: rpd.id,
        characterId,
      })
      .catch((error) => {
        console.error('Failed to remove character association:', error);
      });
  };

  const getItemClasses = (): string => {
    return cn(
      // Base styles
      'group relative rounded-xl border transition-all duration-300 cursor-pointer',
      'backdrop-blur-sm shadow-sm hover:shadow-md',
      // Interactive states
      'hover:shadow-lg focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
      'hover:scale-[1.02] active:scale-[0.98]',
      // Selection states
      isSelected && 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/50 shadow-lg ring-2 ring-primary/20',
      isBulkSelected && !isSelected && 'bg-gradient-to-r from-accent/30 to-accent/20 border-primary/30 shadow-md',
      !isSelected && !isBulkSelected && 'bg-card/80 border-border/50 hover:bg-card hover:border-border',
      // Padding and overflow - Adaptive for bulk mode
      showBulkSelect ? 'p-3 overflow-hidden' : 'p-4 overflow-hidden',
    );
  };

  return (
    <>
      <motion.div
        className={getItemClasses()}
        onClick={onSelect}
        role="button"
        aria-pressed={isSelected}
        tabIndex={0}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        {/* Main layout with improved bulk mode handling */}
        <div className="flex items-start w-full min-w-0 gap-1">
          {/* Left Controls - Compact in bulk mode */}
          <div className={cn('flex items-center flex-shrink-0', showBulkSelect ? 'gap-0.5' : 'gap-1.5')}>
            <DragHandle />
            {showBulkSelect && (
              <BulkSelectCheckbox
                isSelected={isBulkSelected}
                title={currentVersion?.title}
                onSelect={handleBulkSelect}
              />
            )}
            <StatusIndicator isActive={isActive} isLoading={statusLoading} onToggle={handleStatusToggle} />
          </div>

          {/* Content Area - Better responsive handling */}
          <div className="flex-1 min-w-0 overflow-hidden">
            {/* Title Row */}
            <div className="flex items-center gap-1 mb-1.5">
              <h3 className="flex-1 min-w-0 text-sm font-medium truncate text-foreground max-w-[200px]">
                {currentVersion?.title || 'Untitled RPD'}
              </h3>
              {hasReferenceImages && (
                <div className={cn(showBulkSelect ? 'hidden lg:block' : 'hidden sm:block')}>
                  <ReferenceImagesIndicator count={referenceImagesCount} />
                </div>
              )}
            </div>

            {/* Meta Information Row - Optimized for bulk mode */}
            <div className="flex flex-wrap items-center text-xs gap-x-2 gap-y-1 text-muted-foreground">
              {/* Conditional display based on bulk mode and screen size */}
              <div
                className={cn(
                  'flex items-center gap-1 flex-shrink-0',
                  showBulkSelect ? 'hidden lg:flex' : 'hidden sm:flex',
                )}
              >
                <span>v{rpd.current_version_num}</span>
              </div>

              <div className="flex items-center flex-shrink-0 gap-1">
                <Clock className="w-3 h-3" />
                <span className="whitespace-nowrap">
                  {showBulkSelect
                    ? formattedLastUpdated.replace('年', '/').replace('月', '/').replace('日', '').replace(' ', '')
                    : formattedLastUpdated}
                </span>
              </div>
            </div>

            {/* Associated Characters - Compact display */}
            {!showBulkSelect && associatedCharacters.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5">
                <Users className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                <div className="flex flex-wrap gap-1 min-w-0">
                  {associatedCharacters.slice(0, 2).map((character) => (
                    <Badge
                      key={character.id}
                      variant="outline"
                      className="text-xs bg-indigo-50 border-indigo-200 text-indigo-700 hover:border-red-300 transition-colors group/badge px-1.5 py-0.5"
                    >
                      <span className="group-hover/badge:text-red-500 transition-colors">
                        {character.name || 'Unknown'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCharacter(character.id);
                        }}
                        className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="関連付けを削除"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                  {associatedCharacters.length > 2 && (
                    <Badge variant="outline" className="text-xs text-gray-500 px-1.5 py-0.5">
                      +{associatedCharacters.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Controls - Adaptive for bulk mode */}
          <div className={cn('flex items-center flex-shrink-0', showBulkSelect ? 'gap-0.5' : 'gap-1.5')}>
            {/* Badge - Conditional visibility in bulk mode */}
            <div className={cn(showBulkSelect ? 'hidden xl:block' : 'block')}>
              <KeyBadge keyType={rpd.key} />
            </div>
            <ActionsMenu
              onEdit={onEdit}
              onDelete={handleDeleteClick}
              onDuplicate={handleDuplicate}
              onViewHistory={handleViewHistory}
              isDuplicating={duplicateRPDMutation.isPending}
              showBulkSelect={showBulkSelect}
            />
          </div>
        </div>
      </motion.div>

      {/* History Modal */}
      <RPDHistoryModal rpd={rpd} isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} />

      {/* Delete Confirmation Dialog */}
      <DeleteRPDConfirmDialog
        rpd={rpd}
        isOpen={showDeleteDialog}
        isDeleting={deleteRPDMutation.isPending}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
