import { zodResolver } from '@hookform/resolvers/zod';
import { Edit3, FileText, Image, Info, Loader2, Plus, Settings, Tags, Users, Wand2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import * as z from 'zod';

import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { TextArea } from '@/components/ui/TextArea';
import { toast } from '@/components/ui/use-toast';
import { useAsset } from '@/hooks/useAsset';

import { reviewPointDefinitionsService } from '../../../api/reviewPointDefinitionsService';
import {
  canConfirmEditGroup,
  canGenerateEditDescription,
  canSubmitEditForm,
  createEditErrorMessage,
  createEditSuccessMessage,
  EDIT_EMPTY_GROUP,
  EDIT_FORM_DEFAULTS,
  EDIT_LIMITS,
  validateEditGenerationInputs,
} from '../constants';
import { useEditGroupOperations, useEditModalReset, useEditTagManagement } from '../hooks/rpd-edit-hooks';
import { useCreateRPDVersion } from '../hooks/useCreateRPDVersion';
import { useReviewPointDefinition } from '../hooks/useReviewPointDefinition';
import type { DescriptionFormat } from '../types/rpd-create-types';
import type {
  CreateRPDVersionVariables,
  CurrentGroup,
  CurrentRPDData,
  EditFormType,
  ReviewPointDefinitionVersionBase,
  RPDEditModalProps,
  RPDVersionFormData,
} from '../types/rpd-edit-types';
import { initializeFormFromRPD, updateCurrentGroupFromResponse } from '../utils';
import { RPDReferenceImageUpload } from './RPDReferenceImageUpload';

// Schema 定义
const rpdVersionSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(EDIT_LIMITS.MAX_TITLE_LENGTH),
  description_for_ai: z.string().max(EDIT_LIMITS.MAX_DESCRIPTION_LENGTH).optional().default(''),
  reference_images: z.array(z.string()).default([]),
  tag_list: z.array(z.string()).default([]),
  ai_description_groups: z
    .array(
      z.object({
        tag: z.string(),
        visual_characteristics: z.string(),
        key_considerations: z.string(),
      }),
    )
    .default([]),
  is_active: z.boolean().default(true),
});

// 图片选择器组件
function ReferenceImageSelector({
  imagePath,
  index,
  isSelected,
  onSelect,
}: {
  imagePath: string;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { assetUrl, isAssetLoading } = useAsset(imagePath);
  const borderClasses = isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300';

  return (
    <div
      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all w-12 h-12 ${borderClasses}`}
      onClick={onSelect}
    >
      <div className="w-full h-full bg-gray-100 overflow-hidden relative">
        {isAssetLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          </div>
        )}
        {!isAssetLoading && assetUrl && (
          <img src={assetUrl} alt={`参考图片 ${index + 1}`} className="w-full h-full object-cover" />
        )}
        {isSelected && (
          <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-[10px]">✓</span>
          </div>
        )}
      </div>
    </div>
  );
}

// 自定义状态管理 Hook
function useRPDEditState() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [tagInput, setTagInput] = React.useState('');
  const [hasUploadedImages, setHasUploadedImages] = React.useState(false);
  const [uploadedImages, setUploadedImages] = React.useState<string[]>([]);
  const [currentGroup, setCurrentGroup] = React.useState<CurrentGroup>(EDIT_EMPTY_GROUP);
  const [confirmedGroups, setConfirmedGroups] = React.useState<CurrentGroup[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState<number | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [descriptionFormat, setDescriptionFormat] = React.useState<DescriptionFormat>('traditional');
  const [isFormatLocked, setIsFormatLocked] = React.useState(false);

  return {
    isSubmitting,
    setIsSubmitting,
    tagInput,
    setTagInput,
    hasUploadedImages,
    setHasUploadedImages,
    uploadedImages,
    setUploadedImages,
    currentGroup,
    setCurrentGroup,
    confirmedGroups,
    setConfirmedGroups,
    selectedImageIndex,
    setSelectedImageIndex,
    isGenerating,
    setIsGenerating,
    descriptionFormat,
    setDescriptionFormat,
    isFormatLocked,
    setIsFormatLocked,
  };
}

// ==================== 主组件 ====================
function RPDEditModal({ rpdId, isOpen, onClose, projectId }: RPDEditModalProps): JSX.Element | null {
  const state = useRPDEditState();
  const form = useForm<RPDVersionFormData>({
    resolver: zodResolver(rpdVersionSchema),
    defaultValues: EDIT_FORM_DEFAULTS,
    mode: 'onChange',
  });

  const { data: currentRPD, isLoading: isLoadingRPD } = useReviewPointDefinition(rpdId || undefined, {
    enabled: !!rpdId && isOpen,
  });

  const createRPDVersionMutation = useCreateRPDVersion();

  // 自定义 Hooks
  const { resetEditState } = useEditModalReset(form, state);
  const { confirmGroup, removeGroup } = useEditGroupOperations(form, state);
  const { addTag, removeTag, handleTagKeyPress } = useEditTagManagement(form, state);

  // 事件处理
  const handleClose = (): void => {
    resetEditState();
    onClose();
  };

  const handleSubmit = (formData: RPDVersionFormData): void => {
    if (!rpdId) {
      return;
    }

    state.setIsSubmitting(true);
    const finalTagList =
      currentRPD?.key === 'general_ng_review'
        ? processGeneralNgReviewTagList(formData, state.descriptionFormat, state.confirmedGroups)
        : formData.tag_list || [];

    const variables: CreateRPDVersionVariables = {
      rpdId,
      data: {
        title: formData.title,
        user_instruction: formData.user_instruction || '',
        reference_images: formData.reference_images || [],
        tag_list: finalTagList,
      } as ReviewPointDefinitionVersionBase,
    };

    createRPDVersionMutation.mutate(variables, {
      onSuccess: (newVersion) => {
        const { title, description } = createEditSuccessMessage(currentRPD?.key || rpdId, newVersion.version);
        toast({ title, description, variant: 'default' });
        state.setIsSubmitting(false);
        onClose();
      },
      onError: (error) => {
        const { title, description } = createEditErrorMessage(error);
        toast({ title, description, variant: 'destructive' });
        state.setIsSubmitting(false);
      },
    });
  };

  const handleGenerateDescription = async (): Promise<void> => {
    if (
      !validateEditGenerationInputs(
        state.currentGroup,
        state.selectedImageIndex,
        state.hasUploadedImages,
        form.getValues('reference_images') || [],
      )
    ) {
      return;
    }

    const referenceImages = form.getValues('reference_images');
    const selectedImageUrl = referenceImages[state.selectedImageIndex!];

    state.setIsGenerating(true);
    try {
      const response = await reviewPointDefinitionsService.generateDescription({
        tag: state.currentGroup.tag.trim(),
        image_url: selectedImageUrl,
      });

      state.setCurrentGroup((prev) => updateCurrentGroupFromResponse(prev, response));
    } catch (error) {
      toast({
        title: 'AI生成失败',
        description: error instanceof Error ? error.message : '生成描述时发生未知错误',
        variant: 'destructive',
      });
    } finally {
      state.setIsGenerating(false);
    }
  };

  // 初始化效果
  useInitializationEffect(isOpen, currentRPD, form, state);

  if (!isOpen) {
    return null;
  }

  const uiState = {
    isLoading: state.isSubmitting || createRPDVersionMutation.isPending,
    canConfirm: canConfirmEditGroup(state.currentGroup),
    canGenerate: canGenerateEditDescription(state.hasUploadedImages, state.selectedImageIndex, state.currentGroup.tag),
    canSubmit: canSubmitEditForm(currentRPD, state, form),
    hasChanges: form.formState.isDirty,
  };

  return (
    <Dialog open={isOpen} onOpenChange={(isNowOpen) => !isNowOpen && handleClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <EditModalHeader currentRPD={currentRPD} />
        <EditModalContent
          form={form}
          state={state}
          uiState={uiState}
          currentRPD={currentRPD}
          isLoading={isLoadingRPD}
          projectId={projectId}
          rpdId={rpdId}
          onConfirmGroup={confirmGroup}
          onRemoveGroup={removeGroup}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onTagKeyPress={handleTagKeyPress}
          onGenerateAI={handleGenerateDescription}
        />
        <EditModalFooter
          onCancel={handleClose}
          onSubmit={() => void form.handleSubmit(handleSubmit)()}
          isLoading={uiState.isLoading}
          canSubmit={uiState.canSubmit}
          hasChanges={uiState.hasChanges}
        />
      </DialogContent>
    </Dialog>
  );
}

// ==================== 头部组件 ====================
interface EditModalHeaderProps {
  currentRPD: CurrentRPDData | null | undefined;
}

function EditModalHeader({ currentRPD }: EditModalHeaderProps): JSX.Element {
  return (
    <DialogHeader>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Edit3 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <DialogTitle className="text-xl font-semibold">レビューポイント定義の改善</DialogTitle>
          {currentRPD && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="font-mono">
                {currentRPD.key}
              </Badge>
              <Badge variant={currentRPD.is_active ? 'default' : 'secondary'}>
                {currentRPD.is_active ? 'アクティブ' : '非アクティブ'}
              </Badge>
            </div>
          )}
        </div>
      </div>
      {currentRPD && (
        <DialogDescription>
          RPD: <span className="font-medium">{currentRPD.key}</span> の新しいバージョンを作成
          <span className="text-muted-foreground ml-2">(現在のバージョン: v{currentRPD.current_version_num})</span>
        </DialogDescription>
      )}
    </DialogHeader>
  );
}

// ==================== 内容组件 ====================
interface EditModalContentProps {
  form: EditFormType;
  state: ReturnType<typeof useRPDEditState>;
  uiState: {
    isLoading: boolean;
    canConfirm: boolean;
    canGenerate: boolean;
    canSubmit: boolean;
    hasChanges: boolean;
  };
  currentRPD: CurrentRPDData | null | undefined;
  isLoading: boolean;
  projectId: string;
  rpdId: string | null;
  onConfirmGroup: () => void;
  onRemoveGroup: (index: number) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onTagKeyPress: (e: React.KeyboardEvent) => void;
  onGenerateAI: () => Promise<void>;
}

function EditModalContent(props: EditModalContentProps): JSX.Element {
  const { form, state, uiState, currentRPD, isLoading, projectId, rpdId } = props;
  const [activeTab, setActiveTab] = useState('basic');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">RPD情報を読み込み中...</p>
      </div>
    );
  }

  if (!currentRPD) {
    return <div>RPD情報が見つかりません</div>;
  }

  const isGeneralNgReview = currentRPD.key === 'general_ng_review';

  return (
    <div className="max-h-[60vh] overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            基本情報
          </TabsTrigger>
          <TabsTrigger value="characters" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            キャラクター連携
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="flex-1 overflow-y-auto mt-0">
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <InfoAlert />
              <TitleField form={form} />
              {isGeneralNgReview && state.isFormatLocked && <FormatInfoAlert format={state.descriptionFormat} />}

              {isGeneralNgReview && state.descriptionFormat === 'grouped' ? (
                <GroupedDescriptionSection
                  form={form}
                  state={state}
                  uiState={uiState}
                  onConfirmGroup={props.onConfirmGroup}
                  onRemoveGroup={props.onRemoveGroup}
                  onGenerateAI={props.onGenerateAI}
                />
              ) : (
                <TraditionalDescriptionField form={form} isGeneralNgReview={isGeneralNgReview} />
              )}

              <ReferenceImagesField
                form={form}
                projectId={projectId}
                onImagesChange={state.setHasUploadedImages}
                onUploadedImagesChange={state.setUploadedImages}
              />

              {isGeneralNgReview && (
                <TagListField
                  form={form}
                  state={state}
                  onAddTag={props.onAddTag}
                  onRemoveTag={props.onRemoveTag}
                  onTagKeyPress={props.onTagKeyPress}
                />
              )}

              {uiState.hasChanges && <ChangesAlert />}
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="characters" className="flex-1 overflow-y-auto mt-0">
          <CharacterAssociationTab rpdId={rpdId || ''} projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== 字段组件 ====================
function InfoAlert(): JSX.Element {
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertDescription>
        新しいバージョンを作成すると、このRPDの最新バージョンとして設定されます。
        古いバージョンは保持されますが、AIレビューには最新バージョンのみが使用されます。
      </AlertDescription>
    </Alert>
  );
}

function TitleField({ form }: { form: UseFormReturn<RPDVersionFormData> }): JSX.Element {
  const currentTitle = form.watch('title');

  return (
    <FormField
      control={form.control}
      name="title"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              新バージョンのタイトル
            </div>
            <span className="text-xs text-muted-foreground">
              {currentTitle.length}/{EDIT_LIMITS.MAX_TITLE_LENGTH}
            </span>
          </FormLabel>
          <FormControl>
            <Input placeholder="新しいタイトルを入力" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function FormatInfoAlert({ format }: { format: DescriptionFormat }): JSX.Element {
  return (
    <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
      <div className="flex items-center gap-2 text-blue-700">
        <Settings className="h-4 w-4" />
        <span className="text-sm font-medium">{format === 'grouped' ? 'タググループ形式' : '従来の説明形式'}</span>
      </div>
      <p className="text-xs text-blue-600 mt-1">
        {format === 'grouped'
          ? '既存のバージョンがタググループ形式を使用しているため、新しいバージョンも同じ形式で作成されます。'
          : '既存のバージョンが従来の説明形式を使用しているため、新しいバージョンも同じ形式で作成されます。'}
      </p>
    </div>
  );
}

function GroupedDescriptionSection({
  form,
  state,
  uiState,
  onConfirmGroup,
  onRemoveGroup,
  onGenerateAI,
}: {
  form: UseFormReturn<RPDVersionFormData>;
  state: ReturnType<typeof useRPDEditState>;
  uiState: { canConfirm: boolean; canGenerate: boolean };
  onConfirmGroup: () => void;
  onRemoveGroup: (index: number) => void;
  onGenerateAI: () => Promise<void>;
}): JSX.Element {
  return (
    <>
      {state.confirmedGroups.length > 0 && <ExistingGroupsDisplay form={form} />}
      <NewGroupEditor
        state={state}
        form={form}
        uiState={uiState}
        onConfirmGroup={onConfirmGroup}
        onRemoveGroup={onRemoveGroup}
        onGenerateAI={onGenerateAI}
      />
    </>
  );
}

function ExistingGroupsDisplay({ form }: { form: UseFormReturn<RPDVersionFormData> }): JSX.Element {
  return (
    <div className="space-y-4">
      <FormLabel className="flex items-center gap-2">
        <Wand2 className="w-4 h-4" />
        現在のAI説明 (既存のグループ)
      </FormLabel>
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
          {form.watch('user_instruction')}
        </div>
      </div>
    </div>
  );
}

function NewGroupEditor({
  state,
  form,
  uiState,
  onConfirmGroup,
  onRemoveGroup,
  onGenerateAI,
}: {
  state: ReturnType<typeof useRPDEditState>;
  form: UseFormReturn<RPDVersionFormData>;
  uiState: { canConfirm: boolean; canGenerate: boolean };
  onConfirmGroup: () => void;
  onRemoveGroup: (index: number) => void;
  onGenerateAI: () => Promise<void>;
}): JSX.Element {
  // 从表单获取最新的图片数据
  const referenceImages = form.watch('reference_images') || [];

  return (
    <div className="relative rounded-lg border bg-card p-6">
      <GroupEditorHeader
        isGenerating={state.isGenerating}
        canGenerate={uiState.canGenerate}
        onGenerate={onGenerateAI}
      />

      <ConfirmedGroupsTags groups={state.confirmedGroups} onRemoveGroup={onRemoveGroup} />

      <div className="space-y-6">
        <ImageSelector
          images={referenceImages}
          selectedIndex={state.selectedImageIndex}
          onSelectImage={state.setSelectedImageIndex}
        />

        <GroupInputFields currentGroup={state.currentGroup} onUpdateGroup={state.setCurrentGroup} />

        <GroupActions
          canConfirm={uiState.canConfirm}
          groupCount={state.confirmedGroups.length}
          onConfirm={onConfirmGroup}
        />
      </div>
    </div>
  );
}

function GroupEditorHeader({
  isGenerating,
  canGenerate,
  onGenerate,
}: {
  isGenerating: boolean;
  canGenerate: boolean;
  onGenerate: () => Promise<void>;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <Wand2 className="w-5 h-5" />
        <h3 className="text-lg font-medium">新しいタググループを追加</h3>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canGenerate || isGenerating}
        onClick={() => void onGenerate()}
      >
        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {isGenerating ? 'Generating...' : 'Generate using image'}
      </Button>
    </div>
  );
}

function ConfirmedGroupsTags({
  groups,
  onRemoveGroup,
}: {
  groups: CurrentGroup[];
  onRemoveGroup: (index: number) => void;
}): JSX.Element | null {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <h4 className="text-xs font-medium mb-2 text-gray-600">
        既存のグループ ({groups.length}/{EDIT_LIMITS.MAX_GROUPS}):
      </h4>
      <div className="flex flex-wrap gap-2">
        {groups.map((group, index) => (
          <div key={index} className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full text-xs">
            <span>{group.tag}</span>
            <button
              type="button"
              onClick={() => onRemoveGroup(index)}
              className="text-blue-600 hover:text-blue-800 ml-1"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageSelector({
  images,
  selectedIndex,
  onSelectImage,
}: {
  images: string[];
  selectedIndex: number | null;
  onSelectImage: (index: number | null) => void;
}): JSX.Element {
  // 改进显示逻辑：基于实际的图片数组
  const shouldShow = images && images.length > 0;

  if (!shouldShow) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <FormLabel className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium">選択された参考画像</span>
          <span className="text-xs text-muted-foreground">(請先上傳圖片)</span>
        </FormLabel>
        <div className="text-center text-gray-500 text-sm">
          暂无上传的图片，请先在&quot;新バージョンの参照画像&quot;区域上传图片
        </div>
      </div>
    );
  }

  return (
    <div>
      <FormLabel className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium">選択された参考画像</span>
        <span className="text-xs text-muted-foreground">(選択用于生成AI描述的图片)</span>
      </FormLabel>
      <div className="grid grid-cols-8 gap-2 p-3 border rounded-lg bg-gray-50">
        {images.map((imagePath, index) => (
          <ReferenceImageSelector
            key={`${imagePath}-${index}`}
            imagePath={imagePath}
            index={index}
            isSelected={selectedIndex === index}
            onSelect={() => onSelectImage(index)}
          />
        ))}
      </div>
    </div>
  );
}

function GroupInputFields({
  currentGroup,
  onUpdateGroup,
}: {
  currentGroup: CurrentGroup;
  onUpdateGroup: React.Dispatch<React.SetStateAction<CurrentGroup>>;
}): JSX.Element {
  return (
    <>
      <div>
        <FormLabel className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium">Tag</span>
          <span className="text-xs text-muted-foreground">{currentGroup.tag.length}/100</span>
        </FormLabel>
        <Input
          placeholder="単一のタグを入力してください..."
          value={currentGroup.tag}
          onChange={(e) => onUpdateGroup((prev) => ({ ...prev, tag: e.target.value }))}
        />
        <FormDescription className="mt-2">この RPD を識別するための単一のタグを入力してください。</FormDescription>
      </div>

      <div>
        <FormLabel className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium">Key Visual Characteristics</span>
          <span className="text-xs text-muted-foreground">
            {currentGroup.visual_characteristics.length}/{EDIT_LIMITS.MAX_VISUAL_CHARS}
          </span>
        </FormLabel>
        <TextArea
          placeholder="画像の視覚的特徴を記述してください（色、形、テクスチャ、パターンなど）..."
          rows={4}
          value={currentGroup.visual_characteristics}
          onChange={(e) => onUpdateGroup((prev) => ({ ...prev, visual_characteristics: e.target.value }))}
        />
        <FormDescription className="mt-2">この画像の主要な視覚的特徴を詳しく説明してください。</FormDescription>
      </div>

      <div>
        <FormLabel className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium">Key Considerations & What to Look For</span>
          <span className="text-xs text-muted-foreground">
            {currentGroup.key_considerations.length}/{EDIT_LIMITS.MAX_CONSIDERATIONS_CHARS}
          </span>
        </FormLabel>
        <TextArea
          placeholder="AIがレビュー時に注意深く確認すべき重要なポイントや考慮事項を記述してください..."
          rows={4}
          value={currentGroup.key_considerations}
          onChange={(e) => onUpdateGroup((prev) => ({ ...prev, key_considerations: e.target.value }))}
        />
        <FormDescription className="mt-2">
          AIがこの画像をレビューする際に特に注意すべき点を明確に記述してください。
        </FormDescription>
      </div>
    </>
  );
}

function GroupActions({
  canConfirm,
  groupCount,
  onConfirm,
}: {
  canConfirm: boolean;
  groupCount: number;
  onConfirm: () => void;
}): JSX.Element {
  return (
    <div className="flex gap-3 pt-4 border-t items-center">
      <Button
        type="button"
        onClick={onConfirm}
        disabled={!canConfirm || groupCount >= EDIT_LIMITS.MAX_GROUPS}
        size="sm"
        variant="default"
      >
        確認
      </Button>
      <span className="text-xs text-muted-foreground">
        {groupCount}/{EDIT_LIMITS.MAX_GROUPS} 組
      </span>
    </div>
  );
}

function TraditionalDescriptionField({
  form,
  isGeneralNgReview,
}: {
  form: UseFormReturn<RPDVersionFormData>;
  isGeneralNgReview: boolean;
}): JSX.Element {
  const currentDescription = form.watch('user_instruction');

  return (
    <FormField
      control={form.control}
      name="user_instruction"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              新バージョンのAI説明
            </div>
            <span className="text-xs text-muted-foreground">
              {currentDescription.length}/{EDIT_LIMITS.MAX_DESCRIPTION_LENGTH}
            </span>
          </FormLabel>
          <FormControl>
            <TextArea placeholder="AIモデルのための詳細な説明を入力してください..." rows={8} {...field} />
          </FormControl>
          <FormDescription>
            AI説明はAIモデルがレビューを行う際の指示として使用されます。
            詳細かつ明確な説明を提供することで、より良いレビュー結果が得られます。
            {isGeneralNgReview && (
              <>
                <br />
                <span className="text-xs text-blue-600">💡 ヒント: タイトルが自動的にタグリストとして保存されます</span>
              </>
            )}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ReferenceImagesField({
  form,
  projectId,
  onImagesChange,
  onUploadedImagesChange,
}: {
  form: UseFormReturn<RPDVersionFormData>;
  projectId: string;
  onImagesChange: (has: boolean) => void;
  onUploadedImagesChange?: (images: string[]) => void;
}): JSX.Element {
  const currentReferenceImages = form.watch('reference_images');

  return (
    <FormField
      control={form.control}
      name="reference_images"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              新バージョンの参照画像
            </div>
            <span className="text-xs text-muted-foreground">{currentReferenceImages?.length || 0} 画像</span>
          </FormLabel>
          <div className="rounded-lg border bg-card p-4">
            <FormDescription className="mb-4">
              参照画像を追加・変更・削除して、AIレビューの精度を向上させましょう。
              画像は比較検出や判定基準として使用されます。
            </FormDescription>
            <RPDReferenceImageUpload
              key={`images-${currentReferenceImages?.length || 0}`} // 强制重新渲染
              projectId={projectId}
              onImagesChange={(s3Paths: string[]) => {
                field.onChange(s3Paths);
                onImagesChange(s3Paths.length > 0);

                // 同时通知实际上传的图片信息
                if (onUploadedImagesChange) {
                  onUploadedImagesChange(s3Paths);
                }
              }}
              value={currentReferenceImages || []}
            />
          </div>
        </FormItem>
      )}
    />
  );
}

function TagListField({
  form,
  state,
  onAddTag,
  onRemoveTag,
  onTagKeyPress,
}: {
  form: UseFormReturn<RPDVersionFormData>;
  state: ReturnType<typeof useRPDEditState>;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onTagKeyPress: (e: React.KeyboardEvent) => void;
}): JSX.Element {
  const tagList = form.watch('tag_list');

  return (
    <FormField
      control={form.control}
      name="tag_list"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              タグリスト
            </div>
            <span className="text-xs text-muted-foreground">{field.value?.length || 0} タグ</span>
          </FormLabel>
          <div className="rounded-lg border bg-card p-4">
            <FormDescription className="mb-4">
              タグを追加・削除して、RPDの管理を容易にしましょう。
              {state.confirmedGroups.length > 0 && ' 既存のグループのタグは自動的に含まれます。'}
            </FormDescription>
            <div className="flex items-center gap-2">
              <Input
                placeholder="新しいタグを入力"
                value={state.tagInput}
                onChange={(e) => state.setTagInput(e.target.value)}
                onKeyDown={onTagKeyPress}
              />
              <Button type="button" variant="outline" size="icon" onClick={onAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2">
              {tagList?.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="mr-2 mb-2 flex items-center gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                >
                  {tag}
                  <X className="h-3 w-3" onClick={() => onRemoveTag(tag)} />
                </Badge>
              ))}
            </div>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ChangesAlert(): JSX.Element {
  return (
    <Alert className="border-amber-200 bg-amber-50">
      <Info className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        変更を保存すると、このRPDの新しいバージョンが作成されます。この操作は元に戻せません。
      </AlertDescription>
    </Alert>
  );
}

// ==================== 底部组件 ====================
function EditModalFooter({
  onCancel,
  onSubmit,
  isLoading,
  canSubmit,
  hasChanges,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  canSubmit: boolean;
  hasChanges: boolean;
}): JSX.Element {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel}>
        キャンセル
      </Button>
      <Button type="submit" disabled={isLoading || !canSubmit || !hasChanges} onClick={onSubmit}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            作成中...
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            新バージョン作成
          </>
        )}
      </Button>
    </DialogFooter>
  );
}

// ==================== 辅助Hook ====================
function useInitializationEffect(
  isOpen: boolean,
  currentRPD: CurrentRPDData | null | undefined,
  form: UseFormReturn<RPDVersionFormData>,
  state: ReturnType<typeof useRPDEditState>,
): void {
  useEffect(() => {
    if (isOpen && currentRPD) {
      const { formData, detectedFormat, initialGroups } = initializeFormFromRPD(currentRPD);

      state.setDescriptionFormat(detectedFormat);
      state.setIsFormatLocked(true);
      form.reset(formData as RPDVersionFormData);
      state.setConfirmedGroups(initialGroups);

      const referenceImages = formData.reference_images || [];

      state.setHasUploadedImages(referenceImages.length > 0);
      state.setUploadedImages(referenceImages);
    }
  }, [isOpen, currentRPD?.key, currentRPD?.current_version_num]); // 只依赖真正需要的值

  useEffect(() => {
    if (!isOpen) {
      form.reset(EDIT_FORM_DEFAULTS);
      state.setCurrentGroup(EDIT_EMPTY_GROUP);
      state.setConfirmedGroups([]);
      state.setSelectedImageIndex(null);
      state.setIsGenerating(false);
      state.setHasUploadedImages(false);
      state.setUploadedImages([]);
      state.setDescriptionFormat('traditional');
      state.setIsFormatLocked(false);
    }
  }, [isOpen]); // 只依赖 isOpen
}

// 处理general_ng_review的tag_list
function processGeneralNgReviewTagList(
  formData: RPDVersionFormData,
  descriptionFormat: DescriptionFormat,
  confirmedGroups: CurrentGroup[],
): string[] {
  if (descriptionFormat === 'grouped' && confirmedGroups.length > 0) {
    return confirmedGroups.map((group) => group.tag);
  }
  if (descriptionFormat === 'traditional' && formData.title.trim()) {
    return [formData.title.trim()];
  }
  return formData.tag_list || [];
}

// ==================== Character Association Tab ====================
interface CharacterAssociationTabProps {
  rpdId: string;
  projectId: string;
}

function CharacterAssociationTab({ rpdId, projectId }: CharacterAssociationTabProps): JSX.Element {
  // Import the full CharacterAssociationManager component
  const CharacterAssociationManager = React.lazy(() =>
    import('./CharacterAssociationManager').then((module) => ({ default: module.CharacterAssociationManager })),
  );

  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">読み込み中...</span>
        </div>
      }
    >
      <CharacterAssociationManager rpdId={rpdId} projectId={projectId} />
    </React.Suspense>
  );
}

export default RPDEditModal;
