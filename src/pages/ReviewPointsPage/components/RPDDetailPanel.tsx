import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, Edit3, FileText, Hash, RefreshCw, Users, X, Zap, ZapOff } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Separator } from '@/components/ui/Separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import {
  useAddCharacterToRPD,
  useRemoveCharacterFromRPD,
  useRPDCharacterAssociations,
} from '@/hooks/useRPDCharacterAssociations';

import type { ReviewPointDefinitionSchema } from '../../../types/ReviewPointDefinition';
import { CharacterPickerModal } from './CharacterPickerModal';
import { RPDReferenceImageDisplay } from './RPDReferenceImageDisplay';

interface RPDDetailPanelProps {
  rpd: ReviewPointDefinitionSchema;
  onEdit: () => void;
  onRefresh?: () => void;
}

/**
 * Enhanced detail panel with modern design and inline editing capabilities
 */
export default function RPDDetailPanel({ rpd, onEdit, onRefresh }: RPDDetailPanelProps): JSX.Element {
  const projectId = rpd.project_id ?? '';
  const [isExpanded, setIsExpanded] = useState({
    basicInfo: true,
    description: true,
    referenceImages: true,
    history: false,
    technical: false,
  });
  const [isCharacterPickerModalOpen, setIsCharacterPickerModalOpen] = useState(false);

  // Get associated characters
  const { data: charactersData, refetch: refetchCharacters } = useRPDCharacterAssociations(rpd.id);

  // Mutation hooks
  const addCharacterMutation = useAddCharacterToRPD();
  const removeCharacterMutation = useRemoveCharacterFromRPD();

  const currentVersion = rpd.versions?.find((v) => v.version === rpd.current_version_num) || rpd.current_version;
  const lastUpdated = new Date(rpd.updated_at);

  // Handler functions
  const handleManageCharacters = () => {
    setIsCharacterPickerModalOpen(true);
  };

  const handleCharacterSelectionConfirm = async (selectedCharacterIds: string[]) => {
    try {
      // Get current character IDs
      const currentCharacterIds = charactersData?.characters.map((char) => char.id) || [];

      // Find characters to add and remove
      const toAdd = selectedCharacterIds.filter((id) => !currentCharacterIds.includes(id));
      const toRemove = currentCharacterIds.filter((id) => !selectedCharacterIds.includes(id));

      // Execute mutations
      await Promise.all([
        ...toAdd.map((characterId) => addCharacterMutation.mutateAsync({ rpdId: rpd.id, characterId })),
        ...toRemove.map((characterId) => removeCharacterMutation.mutateAsync({ rpdId: rpd.id, characterId })),
      ]);

      await refetchCharacters();
      setIsCharacterPickerModalOpen(false);
    } catch (error) {
      console.error('Error updating character associations:', error);
    }
  };

  const handleRemoveCharacter = (characterId: string) => {
    removeCharacterMutation.mutate(
      { rpdId: rpd.id, characterId },
      {
        onSuccess: () => {
          void refetchCharacters();
        },
        onError: (error) => {
          console.error('Error removing character:', error);
        },
      },
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b bg-card">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border">
                <FileText className="w-5 h-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold leading-tight text-foreground">
                  {currentVersion?.title || 'タイトルなしRPD'}
                </h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {rpd.key}
                  </span>
                  <span>バージョン {rpd.current_version_num}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    更新 {lastUpdated.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={rpd.is_active ? 'default' : 'secondary'} className="text-xs">
                {rpd.is_active ? <Zap className="w-3 h-3 mr-1" /> : <ZapOff className="w-3 h-3 mr-1" />}
                {rpd.is_active ? 'アクティブ' : '非アクティブ'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onRefresh}
                  aria-label="RPDデータを更新"
                  disabled={!onRefresh}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>更新</p>
              </TooltipContent>
            </Tooltip>

            <Button onClick={onEdit} className="gap-2">
              <Edit3 className="w-4 h-4" />
              RPD編集
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="max-w-4xl space-y-4">
          {/* AI Description or Text Review Info */}
          {rpd.key === 'text_review' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  テキスト監修設定
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TextReviewDetailView currentVersion={currentVersion as unknown as Record<string, unknown>} />
              </CardContent>
            </Card>
          ) : (
            currentVersion?.description_for_ai && (
              <Collapsible
                open={isExpanded.description}
                onOpenChange={(open) => setIsExpanded((prev) => ({ ...prev, description: open }))}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          AI説明
                        </span>
                        {isExpanded.description ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <pre className="p-4 text-sm whitespace-pre-wrap font-sans rounded-md bg-muted/50 border">
                        {currentVersion.user_instruction || currentVersion.description_for_ai}
                      </pre>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          )}

          {/* Reference Images Section */}
          {currentVersion?.reference_images && currentVersion.reference_images.length > 0 && (
            <Collapsible
              open={isExpanded.referenceImages}
              onOpenChange={(open) => setIsExpanded((prev) => ({ ...prev, referenceImages: open }))}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        参照画像
                      </span>
                      {isExpanded.referenceImages ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <RPDReferenceImageDisplay referenceImages={currentVersion.reference_images} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Related Characters Section */}
          <Collapsible defaultOpen>
            <Card>
              <CollapsibleTrigger className="w-full p-4 text-left hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">関連キャラクター</h3>
                    <span className="text-sm text-muted-foreground">({charactersData?.characters.length || 0}件)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleManageCharacters();
                    }}
                    disabled={addCharacterMutation.isPending || removeCharacterMutation.isPending}
                  >
                    管理
                  </Button>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Separator />
                <div className="p-4">
                  {charactersData?.characters && charactersData.characters.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      <AnimatePresence>
                        {charactersData.characters.map((character) => (
                          <motion.div
                            key={character.id}
                            className="group inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 shadow-sm"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            whileHover={{ scale: 1.02 }}
                            layout
                          >
                            <span className="truncate max-w-[100px]" title={character.name}>
                              {character.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all duration-200 ml-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCharacter(character.id);
                              }}
                              disabled={removeCharacterMutation.isPending}
                              title={`${character.name}を削除`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      関連するキャラクターがいません。「管理」ボタンから追加してください。
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Modals */}
      <AnimatePresence>
        {isCharacterPickerModalOpen && (
          <CharacterPickerModal
            isOpen={isCharacterPickerModalOpen}
            onClose={() => setIsCharacterPickerModalOpen(false)}
            onConfirm={(ids) => void handleCharacterSelectionConfirm(ids)}
            projectId={projectId}
            initialSelectedIds={charactersData?.characters.map((char) => char.id) || []}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// TextReview专用详情视图组件
interface TextReviewDetailViewProps {
  currentVersion: Record<string, unknown> | null | undefined;
}

function TextReviewDetailView({ currentVersion }: TextReviewDetailViewProps) {
  if (!currentVersion) {
    return <div className="text-sm text-muted-foreground">テキスト監修の設定情報がありません。</div>;
  }

  const referenceFiles = (currentVersion.reference_files as string[]) || [];
  const specialRules =
    (currentVersion.special_rules as Array<{
      speaker: string;
      target: string;
      alias: string;
      conditions: string[];
    }>) || [];

  return (
    <div className="space-y-6">
      {/* 概要説明 */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          テキスト監修用のレビューポイント定義です。称呼表と特殊ルールに基づいてテキスト内容を監修します。
        </p>
      </div>

      {/* 称呼表文件信息 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          称呼表ファイル
        </h4>
        <div className="pl-5">
          {referenceFiles.length > 0 ? (
            <div className="space-y-2">
              {referenceFiles.map((filePath: string, index: number) => {
                const fileName = filePath.split('/').pop() || `ファイル${index + 1}`;
                const fileType = fileName.toLowerCase().includes('.xls') ? 'Excel' : 'JSON';
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-green-900">{fileName}</div>
                      <div className="text-xs text-green-700">{fileType}形式</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">称呼表ファイルが設定されていません</div>
          )}
        </div>
      </div>

      {/* 特殊规则信息 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          特殊ルール ({specialRules.length}件)
        </h4>
        <div className="pl-5">
          {specialRules.length > 0 ? (
            <div className="space-y-3">
              {specialRules.map((rule, index: number) => (
                <div key={index} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-sm font-medium text-purple-900 mb-1">
                    {rule.speaker || '未設定'} → {rule.target || '未設定'}: &ldquo;{rule.alias || '未設定'}&rdquo;
                  </div>
                  {rule.conditions && rule.conditions.length > 0 && rule.conditions[0].trim() && (
                    <div className="text-xs text-purple-700">
                      条件: {Array.isArray(rule.conditions) ? rule.conditions.join(', ') : rule.conditions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">特殊ルールが設定されていません</div>
          )}
        </div>
      </div>
    </div>
  );
}
