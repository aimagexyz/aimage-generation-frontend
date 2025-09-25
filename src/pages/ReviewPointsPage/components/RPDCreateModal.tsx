import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Hash, Image, Loader2, Plus, Settings, Wand2 } from 'lucide-react';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { TextArea } from '@/components/ui/TextArea';
import { toast } from '@/components/ui/use-toast';
import { PREDEFINED_RPD_KEYS, type PredefinedRPDKey } from '@/constants/rpdKeys';
import { useAsset } from '@/hooks/useAsset';

import { reviewPointDefinitionsService } from '../../../api/reviewPointDefinitionsService';
import type { PromptRewriteResponse } from '../../../types/ReviewPointDefinition';
import { canGenerateWithImage, canSubmitForm, FORM_DEFAULTS, isValidGroup, LIMITS } from '../constants';
import { useAIGeneration, useFormSubmission, useGroupOperations, useModalReset } from '../hooks/rpd-modal-hooks';
// import type { ReviewPointDefinitionCreate } from '../../../types/ReviewPointDefinition';
import { useCreateRPD } from '../hooks/useCreateRPD';
import type {
  AIGenerateRequest,
  DescriptionFormat,
  GroupInfo,
  RPDCreateFormData,
  RPDCreateModalProps,
  ToastOptions,
} from '../types/rpd-create-types';
import { RPDReferenceImageUpload } from './RPDReferenceImageUpload';

// 定义单组数据的schema
const aiDescriptionGroupSchema = z.object({
  tag: z.string().min(1, 'タグは必須です'),
  visual_characteristics: z.string().min(1, '視覚的特徴は必須です'),
  key_considerations: z.string().min(1, '考慮事項は必須です'),
});

const rpdCreateSchema = z
  .object({
    key: z
      .string()
      .min(1, 'RPDキーが必要です。一つ選択してください。')
      .refine((val) => PREDEFINED_RPD_KEYS.includes(val as PredefinedRPDKey), {
        message: '無効または未定義のキーが選択されました。',
      }),
    title: z.string().min(1, 'タイトルは必須です').max(255),
    user_instruction: z.string().max(5000),
    ai_description_groups: z.array(aiDescriptionGroupSchema).optional().default([]),
    is_active: z.boolean().default(true),
    reference_images: z.array(z.string()).optional().default([]),
  })
  .refine(
    (data) => {
      // For non-general_ng_review types, user_instruction is required
      return data.key === 'general_ng_review' || data.user_instruction.trim();
    },
    {
      message: 'AI用説明は必須です',
      path: ['user_instruction'],
    },
  );
// 图片选择器中的单个图片组件
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
  const [imageError, setImageError] = useState(false);

  const borderClasses = isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300';

  const handleImageError = () => {
    setImageError(true);
    console.error(`Failed to load image ${index}:`, imagePath);
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  return (
    <div
      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all w-12 h-12 ${borderClasses}`}
      onClick={onSelect}
      title={`图片 ${index + 1}: ${imagePath}`}
    >
      <div className="w-full h-full bg-gray-100 overflow-hidden relative">
        {/* 加载状态 */}
        {isAssetLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 成功加载的图片 */}
        {!isAssetLoading && assetUrl && !imageError && (
          <img
            src={assetUrl}
            alt={`参考图片 ${index + 1}`}
            className="w-full h-full object-cover object-center"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}

        {/* 错误状态或无图片 */}
        {!isAssetLoading && (!assetUrl || imageError) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[8px] text-gray-500 mb-1">{imageError ? '❌' : '📷'}</span>
            <span className="text-[8px] text-gray-500 text-center px-1">
              {imageError ? 'Error' : `图片 ${index + 1}`}
            </span>
          </div>
        )}
      </div>

      {/* 选中状态指示器 */}
      {isSelected && (
        <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-[10px]">✓</span>
        </div>
      )}
    </div>
  );
}

// 自定义Hook：管理RPD创建状态
function useRPDCreateState() {
  const [selectedKey, setSelectedKey] = useState<string>(PREDEFINED_RPD_KEYS[0]);
  const [hasUploadedImages, setHasUploadedImages] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [currentGroup, setCurrentGroup] = useState<GroupInfo>({
    tag: '',
    visual_characteristics: '',
    key_considerations: '',
  });
  const [confirmedGroups, setConfirmedGroups] = useState<GroupInfo[]>([]);
  const [engDescriptionGroups, setEngDescriptionGroups] = useState<
    Array<{
      tag: string;
      visual_characteristics: string;
      key_considerations: string;
    }>
  >([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [descriptionFormat, setDescriptionFormat] = useState<DescriptionFormat>('traditional');
  // Visual Review Prompt转写相关状态
  const [visualPromptState, setVisualPromptState] = useState({
    originalPrompt: '',
    rewrittenPrompt: '',
    rewrittenPromptEng: '', // 存储英语版本
    confidence: 0,
    isRewriting: false,
    selectedImageIndex: null as number | null,
  });
  // 包装setHasUploadedImages以添加调试信息
  const setHasUploadedImagesWithDebug = (hasImages: boolean) => {
    setHasUploadedImages(hasImages);
  };

  // 包装setDescriptionFormat以添加调试信息
  const setDescriptionFormatWithDebug = (format: DescriptionFormat) => {
    setDescriptionFormat(format);
  };

  return {
    selectedKey,
    setSelectedKey,
    hasUploadedImages,
    setHasUploadedImages: setHasUploadedImagesWithDebug,
    uploadedImages,
    setUploadedImages,
    currentGroup,
    setCurrentGroup,
    confirmedGroups,
    setConfirmedGroups,
    engDescriptionGroups,
    setEngDescriptionGroups,
    selectedImageIndex,
    setSelectedImageIndex,
    isGenerating,
    setIsGenerating,
    descriptionFormat,
    setDescriptionFormat: setDescriptionFormatWithDebug,
    visualPromptState,
    setVisualPromptState,
  };
}
// ==================== 主组件（复杂度：5） ====================
function RPDCreateModal({ isOpen, onClose, projectId }: RPDCreateModalProps): JSX.Element | null {
  // 状态管理
  const state = useRPDCreateState();
  const form = useForm<RPDCreateFormData>({
    resolver: zodResolver(rpdCreateSchema),
    defaultValues: { ...FORM_DEFAULTS, key: PREDEFINED_RPD_KEYS[0] },
    mode: 'onChange',
  });
  const createRPDMutation = useCreateRPD();

  // 自定义Hook
  const modalSetters = {
    setSelectedKey: state.setSelectedKey,
    setHasUploadedImages: state.setHasUploadedImages,
    setUploadedImages: state.setUploadedImages,
    setCurrentGroup: state.setCurrentGroup,
    setConfirmedGroups: state.setConfirmedGroups,
    setEngDescriptionGroups: state.setEngDescriptionGroups,
    setSelectedImageIndex: state.setSelectedImageIndex,
    setIsGenerating: state.setIsGenerating,
    setDescriptionFormat: state.setDescriptionFormat,
  };

  const groupOperationState = {
    currentGroup: state.currentGroup,
    confirmedGroups: state.confirmedGroups,
    setCurrentGroup: state.setCurrentGroup,
    setConfirmedGroups: state.setConfirmedGroups,
    setSelectedImageIndex: state.setSelectedImageIndex,
  };

  const { resetAllState } = useModalReset(form, modalSetters, PREDEFINED_RPD_KEYS[0]);
  const { confirmCurrentGroup, removeGroup } = useGroupOperations(form, groupOperationState);
  const { generateDescription } = useAIGeneration(
    state.currentGroup,
    state.setCurrentGroup,
    state.setEngDescriptionGroups,
    state.setIsGenerating,
    form,
    state.selectedImageIndex,
    state.hasUploadedImages,
  );
  const { submitForm } = useFormSubmission(projectId, createRPDMutation, () => {
    resetAllState();
    onClose();
  });

  // 事件处理
  const handleClose = (): void => {
    resetAllState();
    onClose();
  };

  const handleSubmit = (formData: RPDCreateFormData): void => {
    submitForm(
      formData,
      state.descriptionFormat,
      state.confirmedGroups,
      state.engDescriptionGroups,
      state.visualPromptState,
    );
  };

  const handleAIGenerate = async (): Promise<void> => {
    const params = generateDescription();
    if (!params) {
      return;
    }

    try {
      const response = await reviewPointDefinitionsService.generateDescription({
        tag: params.tag,
        image_url: params.imageUrl,
      } as AIGenerateRequest);

      params.onSuccess(response);
    } catch (error) {
      params.onError(error);

      toast({
        title: 'AI生成失败',
        description: error instanceof Error ? error.message : '生成描述时发生未知错误',
        variant: 'destructive',
      } as ToastOptions);
    } finally {
      params.onFinally();
    }
  };

  // 副作用
  useKeyChangeEffect(state.selectedKey, state, form);
  useModalOpenEffect(isOpen, resetAllState);

  if (!isOpen) {
    return null;
  }

  // 计算状态
  const uiState = {
    isLoading: form.formState.isSubmitting || createRPDMutation.isPending,
    canConfirm: isValidGroup(state.currentGroup),
    canGenerate: canGenerateWithImage(state.hasUploadedImages, state.selectedImageIndex, state.currentGroup.tag),
    canSubmit: canSubmitForm(
      state.selectedKey,
      state.confirmedGroups,
      form.watch('title'),
      form.formState.isValid,
      state.descriptionFormat,
      form.watch('user_instruction') || '',
    ),
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <ModalHeader />
        <ModalContent
          form={form}
          state={state}
          uiState={uiState}
          onConfirmGroup={confirmCurrentGroup}
          onRemoveGroup={removeGroup}
          onGenerateAI={handleAIGenerate}
          projectId={projectId}
        />
        <ModalFooter
          onCancel={handleClose}
          onSubmit={() => void form.handleSubmit(handleSubmit)()}
          isLoading={uiState.isLoading}
          canSubmit={uiState.canSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}

// ==================== 头部组件（复杂度：0） ====================
function ModalHeader(): JSX.Element {
  return (
    <DialogHeader>
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
          <Plus className="w-5 h-5" />
        </div>
        <div>
          <DialogTitle className="text-xl font-semibold">新しいレビューポイント定義を作成</DialogTitle>
          <DialogDescription className="mt-1">
            AIレビューシステム用の新しいRPDを定義します。既にプロジェクトに存在するキーでも使用できます。
          </DialogDescription>
        </div>
      </div>
    </DialogHeader>
  );
}

// ==================== 内容组件（复杂度：2） ====================
interface ModalContentProps {
  form: ReturnType<typeof useForm<RPDCreateFormData>>;
  state: ReturnType<typeof useRPDCreateState>;
  uiState: {
    isLoading: boolean;
    canConfirm: boolean;
    canGenerate: boolean;
    canSubmit: boolean;
  };
  onConfirmGroup: () => void;
  onRemoveGroup: (index: number) => void;
  onGenerateAI: () => Promise<void>;
  projectId: string;
}

function ModalContent({
  form,
  state,
  uiState,
  onConfirmGroup,
  onRemoveGroup,
  onGenerateAI,
  projectId,
}: ModalContentProps): JSX.Element {
  return (
    <div className="max-h-[60vh] overflow-y-auto">
      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <KeyField form={form} onKeyChange={state.setSelectedKey} />
          <TitleField form={form} />
          <DescriptionFields
            form={form}
            state={state}
            uiState={uiState}
            onConfirmGroup={onConfirmGroup}
            onRemoveGroup={onRemoveGroup}
            onGenerateAI={onGenerateAI}
          />
          <ReferenceImagesField
            form={form}
            onImagesChange={state.setHasUploadedImages}
            onUploadedImagesChange={state.setUploadedImages}
            projectId={projectId}
          />
          <ActivationField form={form} />
        </form>
      </Form>
    </div>
  );
}

// ==================== Key选择字段（复杂度：1） ====================
interface KeyFieldProps {
  form: ReturnType<typeof useForm<RPDCreateFormData>>;
  onKeyChange: (key: string) => void;
}

function KeyField({ form, onKeyChange }: KeyFieldProps): JSX.Element {
  return (
    <FormField
      control={form.control}
      name="key"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            <Hash className="w-4 h-4" />
            RPDキー
          </FormLabel>
          <Select
            onValueChange={(value: string) => {
              field.onChange(value);
              onKeyChange(value);
            }}
            value={field.value}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="RPDキーを選択..." />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {PREDEFINED_RPD_KEYS.map((k: string) => (
                <SelectItem key={k} value={k} className="font-mono">
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ==================== 标题字段（复杂度：0） ====================
interface TitleFieldProps {
  form: ReturnType<typeof useForm<RPDCreateFormData>>;
}

function TitleField({ form }: TitleFieldProps): JSX.Element {
  const currentTitle = form.watch('title');

  return (
    <FormField
      control={form.control}
      name="title"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              タイトル
            </div>
            <span className="text-xs text-muted-foreground">
              {currentTitle.length}/{LIMITS.MAX_TITLE_LENGTH}
            </span>
          </FormLabel>
          <FormControl>
            <Input placeholder="明確で説明的なタイトルを入力..." {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ==================== 描述字段集合（复杂度：2） ====================
interface DescriptionFieldsProps {
  form: ReturnType<typeof useForm<RPDCreateFormData>>;
  state: ReturnType<typeof useRPDCreateState>;
  uiState: { canConfirm: boolean; canGenerate: boolean };
  onConfirmGroup: () => void;
  onRemoveGroup: (index: number) => void;
  onGenerateAI: () => Promise<void>;
}

function DescriptionFields({
  form,
  state,
  uiState,
  onConfirmGroup,
  onRemoveGroup,
  onGenerateAI,
}: DescriptionFieldsProps): JSX.Element {
  if (state.selectedKey === 'general_ng_review') {
    return (
      <>
        <FormatSelector selectedFormat={state.descriptionFormat} onFormatChange={state.setDescriptionFormat} />
        {state.descriptionFormat === 'grouped' ? (
          <GroupedSection
            form={form}
            state={state}
            uiState={uiState}
            onConfirmGroup={onConfirmGroup}
            onRemoveGroup={onRemoveGroup}
            onGenerateAI={onGenerateAI}
          />
        ) : (
          <TraditionalSection form={form} />
        )}
      </>
    );
  }

  if (state.selectedKey === 'visual_review') {
    return <VisualReviewSection form={form} state={state} uiState={uiState} />;
  }

  return <StandardSection form={form} selectedKey={state.selectedKey} />;
}

// ==================== 格式选择器（复杂度：1） ====================
interface FormatSelectorProps {
  selectedFormat: DescriptionFormat;
  onFormatChange: (format: DescriptionFormat) => void;
}

function FormatSelector({ selectedFormat, onFormatChange }: FormatSelectorProps): JSX.Element {
  return (
    <div className="p-3 border rounded-lg bg-gray-50 border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <Settings className="h-4 w-4" />
        <span className="text-sm font-medium">説明形式を選択</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormatOption
          selected={selectedFormat === 'grouped'}
          onClick={() => onFormatChange('grouped')}
          title="タググループ形式"
          description="各タグに対して視覚的特徴と考慮事項を個別に定義し、AIが画像を使用して内容を生成できます。"
        />
        <FormatOption
          selected={selectedFormat === 'traditional'}
          onClick={() => onFormatChange('traditional')}
          title="従来の説明形式"
          description="単一のテキストボックスでAI説明を直接編集します。シンプルで従来通りの入力方法です。"
        />
      </div>
    </div>
  );
}

// ==================== 格式选项（复杂度：0） ====================
interface FormatOptionProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}

function FormatOption({ selected, onClick, title, description }: FormatOptionProps): JSX.Element {
  return (
    <div
      className={`cursor-pointer p-3 border rounded-lg transition-all ${
        selected ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-1">
        <RadioIndicator selected={selected} />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="text-xs text-gray-600">{description}</p>
    </div>
  );
}

function RadioIndicator({ selected }: { selected: boolean }): JSX.Element {
  return (
    <div className={`w-3 h-3 rounded-full border-2 ${selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
      {selected && <div className="w-1 h-1 bg-white rounded-full mx-auto mt-0.5" />}
    </div>
  );
}

// ==================== 分组部分（复杂度：3） ====================
interface GroupedSectionProps {
  form: ReturnType<typeof useForm<RPDCreateFormData>>;
  state: ReturnType<typeof useRPDCreateState>;
  uiState: { canConfirm: boolean; canGenerate: boolean };
  onConfirmGroup: () => void;
  onRemoveGroup: (index: number) => void;
  onGenerateAI: () => Promise<void>;
}

function GroupedSection({
  state,
  uiState,
  onConfirmGroup,
  onRemoveGroup,
  onGenerateAI,
}: GroupedSectionProps): JSX.Element {
  return (
    <div className="relative rounded-lg border bg-card p-6">
      <GroupedHeader canGenerate={uiState.canGenerate} isGenerating={state.isGenerating} onGenerate={onGenerateAI} />
      <ConfirmedGroups groups={state.confirmedGroups} onRemoveGroup={onRemoveGroup} />
      <div className="space-y-6">
        <ImageSelector
          hasImages={state.hasUploadedImages}
          images={state.uploadedImages}
          selectedIndex={state.selectedImageIndex}
          onSelectImage={state.setSelectedImageIndex}
        />
        <GroupEditor currentGroup={state.currentGroup} onUpdateGroup={state.setCurrentGroup} />
        <GroupActions
          canConfirm={uiState.canConfirm}
          groupCount={state.confirmedGroups.length}
          onConfirm={onConfirmGroup}
        />
      </div>
    </div>
  );
}

// ==================== 分组头部（复杂度：1） ====================
interface GroupedHeaderProps {
  canGenerate: boolean;
  isGenerating: boolean;
  onGenerate: () => Promise<void>;
}

function GroupedHeader({ canGenerate, isGenerating, onGenerate }: GroupedHeaderProps): JSX.Element {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <Wand2 className="w-5 h-5" />
        <h3 className="text-lg font-medium">AI Description Fields</h3>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canGenerate || isGenerating}
        onClick={() => void onGenerate()}
        className={`flex items-center gap-2 ${
          !canGenerate || isGenerating
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-primary hover:text-primary-foreground'
        }`}
      >
        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {isGenerating ? 'Generating...' : 'Generate using image'}
      </Button>
    </div>
  );
}

// ==================== 已确认组（复杂度：1） ====================
interface ConfirmedGroupsProps {
  groups: GroupInfo[];
  onRemoveGroup: (index: number) => void;
}

function ConfirmedGroups({ groups, onRemoveGroup }: ConfirmedGroupsProps): JSX.Element | null {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <h4 className="text-xs font-medium mb-2 text-gray-600">
        已确认的组 ({groups.length}/{LIMITS.MAX_GROUPS}):
      </h4>
      <div className="flex flex-wrap gap-2">
        {groups.map((group, index) => (
          <GroupTag key={index} tag={group.tag} onRemove={() => onRemoveGroup(index)} />
        ))}
      </div>
    </div>
  );
}

function GroupTag({ tag, onRemove }: { tag: string; onRemove: () => void }): JSX.Element {
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full text-xs">
      <span>{tag}</span>
      <button type="button" onClick={onRemove} className="text-blue-600 hover:text-blue-800 ml-1">
        ×
      </button>
    </div>
  );
}

// ==================== 图片选择器（复杂度：1） ====================
interface ImageSelectorProps {
  hasImages: boolean;
  images: string[];
  selectedIndex: number | null;
  onSelectImage: (index: number | null) => void;
}

function ImageSelector({ images, selectedIndex, onSelectImage }: ImageSelectorProps): JSX.Element | null {
  // 改进显示逻辑：基于实际的图片数组而不是hasImages状态
  const shouldShow = images && images.length > 0;

  if (!shouldShow) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <FormLabel className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium">参考画像を選択</span>
          <span className="text-xs text-muted-foreground">(AI生成用・任意)</span>
        </FormLabel>
        <div className="text-center text-gray-500 text-sm">
          アップロードされた画像がありません。画像なしでもAI生成は利用できます。
        </div>
      </div>
    );
  }

  return (
    <div>
      <FormLabel className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium">参考画像を選択</span>
        <span className="text-xs text-muted-foreground">(AI説明生成用の画像を選択)</span>
      </FormLabel>
      <div className="grid grid-cols-8 gap-2 p-3 border rounded-lg bg-gray-50">
        {images.map((imagePath, index) => (
          <ReferenceImageSelector
            key={index}
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

// ==================== 组编辑器（复杂度：1） ====================
interface GroupEditorProps {
  currentGroup: GroupInfo;
  onUpdateGroup: (updater: (prev: GroupInfo) => GroupInfo) => void;
}

function GroupEditor({ currentGroup, onUpdateGroup }: GroupEditorProps): JSX.Element {
  return (
    <>
      <GroupField
        label="Tag"
        value={currentGroup.tag}
        maxLength={100}
        placeholder="単一のタグを入力してください..."
        description="この RPD を識別するための単一のタグを入力してください。"
        onChange={(value) => onUpdateGroup((prev) => ({ ...prev, tag: value }))}
      />
      <GroupTextArea
        label="Key Visual Characteristics"
        value={currentGroup.visual_characteristics}
        maxLength={LIMITS.MAX_VISUAL_CHARS}
        placeholder="画像の視覚的特徴を記述してください（色、形、テクスチャ、パターンなど）..."
        description="この画像の主要な視覚的特徴を詳しく説明してください。"
        onChange={(value) => onUpdateGroup((prev) => ({ ...prev, visual_characteristics: value }))}
      />
      <GroupTextArea
        label="Key Considerations & What to Look For"
        value={currentGroup.key_considerations}
        maxLength={LIMITS.MAX_CONSIDERATIONS_CHARS}
        placeholder="AIがレビュー時に注意深く確認すべき重要なポイントや考慮事項を記述してください..."
        description="AIがこの画像をレビューする際に特に注意すべき点を明確に記述してください。"
        onChange={(value) => onUpdateGroup((prev) => ({ ...prev, key_considerations: value }))}
      />
    </>
  );
}

// ==================== 组字段（复杂度：0） ====================
interface GroupFieldProps {
  label: string;
  value: string;
  maxLength: number;
  placeholder: string;
  description: string;
  onChange: (value: string) => void;
}

function GroupField({ label, value, maxLength, placeholder, description, onChange }: GroupFieldProps): JSX.Element {
  return (
    <div>
      <FormLabel className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {value.length}/{maxLength}
        </span>
      </FormLabel>
      <Input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      <FormDescription className="mt-2">{description}</FormDescription>
    </div>
  );
}

function GroupTextArea({ label, value, maxLength, placeholder, description, onChange }: GroupFieldProps): JSX.Element {
  return (
    <div>
      <FormLabel className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {value.length}/{maxLength}
        </span>
      </FormLabel>
      <TextArea placeholder={placeholder} rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
      <FormDescription className="mt-2">{description}</FormDescription>
    </div>
  );
}

// ==================== 组操作（复杂度：1） ====================
interface GroupActionsProps {
  canConfirm: boolean;
  groupCount: number;
  onConfirm: () => void;
}

function GroupActions({ canConfirm, groupCount, onConfirm }: GroupActionsProps): JSX.Element {
  return (
    <div className="flex gap-3 pt-4 border-t items-center">
      <Button
        type="button"
        onClick={onConfirm}
        disabled={!canConfirm || groupCount >= LIMITS.MAX_GROUPS}
        size="sm"
        variant="default"
      >
        確認
      </Button>
      <span className="text-xs text-muted-foreground">
        {groupCount}/{LIMITS.MAX_GROUPS} 組
      </span>
    </div>
  );
}

// ==================== 传统格式部分（复杂度：0） ====================
function TraditionalSection({ form }: { form: ReturnType<typeof useForm<RPDCreateFormData>> }): JSX.Element {
  const currentDescription = form.watch('user_instruction') || '';

  return (
    <FormField
      control={form.control}
      name="user_instruction"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              AI用説明 (従来形式)
            </div>
            <span className="text-xs text-muted-foreground">
              {currentDescription.length}/{LIMITS.MAX_DESCRIPTION_LENGTH}
            </span>
          </FormLabel>
          <FormControl>
            <TextArea
              placeholder="AIモデルが何をレビューし、どのように評価するかを理解するための詳細な指示を提供してください..."
              rows={8}
              {...field}
            />
          </FormControl>
          <FormDescription>
            従来の形式でAI説明を入力してください。AIがレビュー時に何を探すべきかを明確に記述してください。
            <br />
            <span className="text-xs text-blue-600">💡 ヒント: タイトルが自動的にタグリストとして保存されます</span>
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ==================== Visual Review部分（复杂度：2） ====================
interface VisualReviewSectionProps {
  form: ReturnType<typeof useForm<RPDCreateFormData>>;
  state: ReturnType<typeof useRPDCreateState>;
  uiState: { canConfirm: boolean; canGenerate: boolean };
}

function VisualReviewSection({ form, state }: VisualReviewSectionProps): JSX.Element {
  const handlePromptRewrite = async (): Promise<void> => {
    if (!state.visualPromptState.originalPrompt.trim()) {
      return;
    }

    // 获取选中图片的S3路径（可选）
    const selectedImagePath =
      state.visualPromptState.selectedImageIndex !== null
        ? state.uploadedImages[state.visualPromptState.selectedImageIndex]
        : null;

    state.setVisualPromptState((prev) => ({ ...prev, isRewriting: true }));

    try {
      const response: PromptRewriteResponse = await reviewPointDefinitionsService.rewritePrompt({
        original_prompt: state.visualPromptState.originalPrompt,
        context: `Visual review for ${form.watch('title')}`,
        target_language: 'english',
        ...(selectedImagePath && { image_url: selectedImagePath }),
      });

      state.setVisualPromptState((prev) => ({
        ...prev,
        rewrittenPrompt: '', // 不需要单独显示
        rewrittenPromptEng: response.rewritten_prompt, // 保存英语版本
        confidence: response.confidence,
      }));

      // 直接填入日文版本到表单，并触发验证
      form.setValue('user_instruction', response.rewritten_prompt_jpn, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });

      toast({
        title: 'プロンプト転写成功',
        description: `日本語版プロンプトを生成し、フォームに自動入力しました（信頼度: ${(response.confidence * 100).toFixed(1)}%）`,
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'プロンプト転写失敗',
        description: error instanceof Error ? error.message : '転写処理中に不明なエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      state.setVisualPromptState((prev) => ({ ...prev, isRewriting: false }));
    }
  };

  const currentDescription = form.watch('user_instruction') || '';

  return (
    <div className="space-y-6">
      {/* 图片选择区域 */}
      <VisualReviewImageSelector
        hasImages={state.hasUploadedImages}
        images={state.uploadedImages}
        selectedIndex={state.visualPromptState.selectedImageIndex}
        onSelectImage={(index) => state.setVisualPromptState((prev) => ({ ...prev, selectedImageIndex: index }))}
      />

      {/* Prompt输入和转写区域 */}
      <div className="relative rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            <h3 className="text-lg font-medium">AIプロンプト転写</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!state.visualPromptState.originalPrompt.trim() || state.visualPromptState.isRewriting}
            onClick={() => void handlePromptRewrite()}
            className="flex items-center gap-2"
          >
            {state.visualPromptState.isRewriting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            {state.visualPromptState.isRewriting ? '転写中...' : 'プロンプト転写'}
          </Button>
        </div>

        {/* 原始Prompt输入 */}
        <div className="space-y-4">
          <div>
            <FormLabel className="text-sm font-medium">元のプロンプト</FormLabel>
            <TextArea
              placeholder="転写したいシンプルなプロンプトを入力してください..."
              rows={3}
              value={state.visualPromptState.originalPrompt}
              onChange={(e) => state.setVisualPromptState((prev) => ({ ...prev, originalPrompt: e.target.value }))}
            />
            <FormDescription className="mt-2">
              あなたの基本的なアイデアを入力してください。AIが詳細な日本語プロンプトを生成し、下のフォームに自動入力します。画像を選択した場合は、その画像の内容に基づいて最適化されます。
            </FormDescription>
          </div>
        </div>
      </div>

      {/* 标准AI描述字段 */}
      <FormField
        control={form.control}
        name="user_instruction"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                AI用説明
              </div>
              <span className="text-xs text-muted-foreground">
                {currentDescription.length}/{LIMITS.MAX_DESCRIPTION_LENGTH}
              </span>
            </FormLabel>
            <FormControl>
              <TextArea
                placeholder="AIモデルが何をレビューし、どのように評価するかを理解するための詳細な指示を提供してください..."
                rows={6}
                {...field}
                required
              />
            </FormControl>
            <FormDescription>
              AIがレビュー時に何を探すべきかを明確に記述してください。上記のプロンプト転写機能を使用して日本語版の最適化された内容を自動入力できます。
            </FormDescription>
            <FormMessage />
            {typeof field.value === 'string' && !field.value.trim() && (
              <p className="text-sm text-red-600">AI用説明は必須です</p>
            )}
          </FormItem>
        )}
      />
    </div>
  );
}

// ==================== Visual Review图片选择器（复杂度：1） ====================
interface VisualReviewImageSelectorProps {
  hasImages: boolean;
  images: string[];
  selectedIndex: number | null;
  onSelectImage: (index: number | null) => void;
}

function VisualReviewImageSelector({
  images,
  selectedIndex,
  onSelectImage,
}: VisualReviewImageSelectorProps): JSX.Element | null {
  const shouldShow = images && images.length > 0;

  if (!shouldShow) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <FormLabel className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium">参考画像を選択</span>
          <span className="text-xs text-muted-foreground">(Prompt転写用・任意)</span>
        </FormLabel>
        <div className="text-center text-gray-500 text-sm">
          アップロードされた画像がありません。画像なしでもAI転写は利用できます。
        </div>
      </div>
    );
  }

  return (
    <div>
      <FormLabel className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium">参考画像を選択</span>
        <span className="text-xs text-muted-foreground">(Prompt転写用の画像を選択)</span>
      </FormLabel>
      <div className="grid grid-cols-8 gap-2 p-3 border rounded-lg bg-gray-50">
        {images.map((imagePath, index) => (
          <ReferenceImageSelector
            key={index}
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

// ==================== 标准格式部分（复杂度：1） ====================
interface StandardSectionProps {
  form: ReturnType<typeof useForm<RPDCreateFormData>>;
  selectedKey: string;
}

function StandardSection({ form, selectedKey }: StandardSectionProps): JSX.Element {
  const currentDescription = form.watch('user_instruction');

  return (
    <FormField
      control={form.control}
      name="user_instruction"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              AI用説明
            </div>
            <span className="text-xs text-muted-foreground">
              {currentDescription.length}/{LIMITS.MAX_DESCRIPTION_LENGTH}
            </span>
          </FormLabel>
          <FormControl>
            <TextArea
              placeholder="AIモデルが何をレビューし、どのように評価するかを理解するための詳細な指示を提供してください..."
              rows={6}
              {...field}
              required={selectedKey !== 'general_ng_review'}
            />
          </FormControl>
          <FormDescription>AIがレビュー時に何を探すべきかを明確に記述してください。</FormDescription>
          <FormMessage />
          {selectedKey !== 'general_ng_review' && typeof field.value === 'string' && !field.value.trim() && (
            <p className="text-sm text-red-600">AI用説明は必須です</p>
          )}
        </FormItem>
      )}
    />
  );
}

// ==================== 参考图像字段（复杂度：0） ====================
interface ReferenceImagesFieldProps {
  form: ReturnType<typeof useForm<RPDCreateFormData>>;
  onImagesChange: (hasImages: boolean) => void;
  onUploadedImagesChange?: (images: string[]) => void;
  projectId: string;
}

function ReferenceImagesField({
  form,
  onImagesChange,
  onUploadedImagesChange,
  projectId,
}: ReferenceImagesFieldProps): JSX.Element {
  return (
    <FormField
      control={form.control}
      name="reference_images"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            参照画像
            <span className="inline-flex items-center px-2 py-1 ml-2 text-xs font-medium text-blue-700 rounded-full bg-blue-50 ring-1 ring-inset ring-blue-700/10">
              任意
            </span>
          </FormLabel>
          <div className="p-4 border rounded-lg bg-card">
            <FormDescription className="mb-4">
              参照画像をアップロードして、AIがレビュー時に何を探すべきかを理解できるようにします。
              これらの画像は比較や検出の目的で使用されます。
            </FormDescription>
            <RPDReferenceImageUpload
              projectId={projectId}
              onImagesChange={(s3Paths: string[]) => {
                field.onChange(s3Paths);
                onImagesChange(s3Paths.length > 0);

                // 同时通知实际上传的图片信息
                if (onUploadedImagesChange) {
                  onUploadedImagesChange(s3Paths);
                }
              }}
              value={field.value || []}
            />
          </div>
        </FormItem>
      )}
    />
  );
}

// ==================== 激活字段（复杂度：0） ====================
function ActivationField({ form }: { form: ReturnType<typeof useForm<RPDCreateFormData>> }): JSX.Element {
  return (
    <FormField
      control={form.control}
      name="is_active"
      render={({ field }) => (
        <FormItem className="space-y-4">
          <FormLabel className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            アクティベーション設定
          </FormLabel>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="text-sm font-medium">
                {field.value ? '✨ RPDをアクティブ化' : '💤 RPDを非アクティブ化'}
              </div>
              <div className="text-sm text-muted-foreground">
                {field.value
                  ? 'このRPDは作成後すぐにAIレビューで利用可能になります'
                  : 'このRPDは作成されますが、アクティブ化されるまでAIレビューでは使用されません'}
              </div>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ==================== 底部组件（复杂度：1） ====================
interface ModalFooterProps {
  onCancel: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  canSubmit: boolean;
}

function ModalFooter({ onCancel, onSubmit, isLoading, canSubmit }: ModalFooterProps): JSX.Element {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel}>
        キャンセル
      </Button>
      <Button type="submit" disabled={isLoading || !canSubmit} onClick={onSubmit}>
        {isLoading ? (
          <>
            <div className="w-4 h-4 mr-2 border-2 rounded-full animate-spin border-b-transparent" />
            RPD作成中...
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" />
            RPDを作成
          </>
        )}
      </Button>
    </DialogFooter>
  );
}

// ==================== 辅助Hook（复杂度：1） ====================
function useKeyChangeEffect(
  selectedKey: string,
  state: ReturnType<typeof useRPDCreateState>,
  form: ReturnType<typeof useForm<RPDCreateFormData>>,
): void {
  const { setConfirmedGroups, setEngDescriptionGroups, setDescriptionFormat, setSelectedImageIndex } = state;
  const { setValue } = form;

  React.useEffect(() => {
    if (selectedKey !== 'general_ng_review') {
      setConfirmedGroups([]);
      setEngDescriptionGroups([]);
      setValue('ai_description_groups', []);
      setDescriptionFormat('traditional');
    }
    setSelectedImageIndex(null);
  }, [selectedKey, setConfirmedGroups, setEngDescriptionGroups, setValue, setDescriptionFormat, setSelectedImageIndex]);
}

function useModalOpenEffect(isOpen: boolean, resetAllState: () => void): void {
  const resetRef = React.useRef(resetAllState);

  React.useEffect(() => {
    resetRef.current = resetAllState;
  });

  React.useEffect(() => {
    if (isOpen) {
      resetRef.current();
    }
  }, [isOpen]); // 只依赖isOpen，避免resetAllState变化时触发
}

export default RPDCreateModal;
