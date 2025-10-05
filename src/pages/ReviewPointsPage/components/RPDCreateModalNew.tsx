import { zodResolver } from '@hookform/resolvers/zod';
import { Check, RefreshCw, Undo2, Wand2, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { assetsService } from '@/api/assetsService';
import { reviewPointDefinitionsService } from '@/api/reviewPointDefinitionsService';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { toast } from '@/components/ui/use-toast';
import { NG_SUBCATEGORIES, NG_SUBCATEGORY_INFO, PREDEFINED_RPD_KEYS, type PredefinedRPDKey } from '@/constants/rpdKeys';
import type { AutofillSuggestion } from '@/types/autofill';
import type { RPDTestHistory } from '@/types/rpdTest';

import { useCreateRPD } from '../hooks/useCreateRPD';
import type { ReviewPointDefinitionCreate } from '../types/rpd-create-types';
import { AppellationFileUploadArea } from './shared/AppellationFileUploadArea';
import { generateSecureId, RPD_KEY_INFO } from './shared/constants';
import { ImageUploadArea } from './shared/ImageUploadArea';
import { RightPanelTabs } from './shared/RightPanelTabs';
import type { AppellationFileInfo, ChatMessage, ImageInfo, NGSubcategoryType, SpecialRule } from './shared/types';
import { SpecialRulesEditor } from './SpecialRulesEditor';

// フォームスキーマ
const rpdCreateSchema = z.object({
  key: z
    .string()
    .min(1, 'RPDキーが必要です。一つ選択してください。')
    .refine((val) => PREDEFINED_RPD_KEYS.includes(val as PredefinedRPDKey), {
      message: '無効または未定義のキーが選択されました。',
    }),
  title: z.string().min(1, 'タイトルは必須です').max(255),
  user_instruction: z.string().min(1, '内容は必須です').max(5000),
});

type FormData = z.infer<typeof rpdCreateSchema>;

interface RPDCreateModalNewProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export default function RPDCreateModalNew({ isOpen, onClose, projectId }: RPDCreateModalNewProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedKey, setSelectedKey] = useState<PredefinedRPDKey | null>(null);
  const [title, setTitle] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [uploadedImages, setUploadedImages] = useState<ImageInfo[]>([]);
  const [detailContent, setDetailContent] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagValue, setNewTagValue] = useState<string>('');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  // text_review专用状态
  const [appellationFile, setAppellationFile] = useState<AppellationFileInfo | null>(null);
  const [specialRules, setSpecialRules] = useState<SpecialRule[]>([]);

  // general_ng_review专用状态
  const [ngSubcategory, setNgSubcategory] = useState<NGSubcategoryType>(null);

  // RPD作成用のmutation
  const createRPDMutation = useCreateRPD();

  // Chatbot状态 - 提升到此层级以保持状态
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [chatIsDragOver, setChatIsDragOver] = useState(false);
  const [chatIsProcessing, setChatIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [testHistory, setTestHistory] = useState<RPDTestHistory[] | unknown[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 智能建议相关状态
  const [smartSuggestions, setSmartSuggestions] = useState<AutofillSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
  const [lastSuggestionInput, setLastSuggestionInput] = useState<string>('');
  const debounceTimeoutRef = useRef<number | null>(null);

  // AI转写相关状态
  const [originalDetailContent, setOriginalDetailContent] = useState<string>('');
  const [isRewriting, setIsRewriting] = useState<boolean>(false);
  const [hasRewritten, setHasRewritten] = useState<boolean>(false);

  // 生成会话ID
  useEffect(() => {
    if (isOpen && !sessionId) {
      const newSessionId = `rpd-${Date.now()}-${generateSecureId()}`;
      setSessionId(newSessionId);
    }
  }, [isOpen, sessionId]);

  // 获取智能建议的函数
  const fetchSmartSuggestions = useCallback(
    async (userInput: string, rpdType: string) => {
      if (!userInput.trim() || userInput.length < 4) {
        setSmartSuggestions([]);
        return;
      }

      // 如果与上次输入相同，不重复调用
      if (userInput === lastSuggestionInput) {
        return;
      }

      setIsLoadingSuggestions(true);
      setLastSuggestionInput(userInput);

      try {
        const response = await reviewPointDefinitionsService.autofillTitle({
          user_input: userInput,
          rpd_type: rpdType,
          context: `Project context for project ${projectId}`,
          max_suggestions: 4,
        });

        if (response.success && response.suggestions.length > 0) {
          // 按置信度排序
          const sortedSuggestions = [...response.suggestions].sort((a, b) => b.confidence - a.confidence);
          setSmartSuggestions(sortedSuggestions);
        } else {
          setSmartSuggestions([]);
        }
      } catch (error) {
        console.error('获取智能建议失败:', error);
        setSmartSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [projectId, lastSuggestionInput],
  );

  // 防抖处理标题输入
  const handleTitleInputWithDebounce = useCallback(
    (value: string) => {
      setTitle(value);

      // 清除之前的定时器
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // 设置新的定时器
      if (selectedKey && value.length >= 4) {
        debounceTimeoutRef.current = window.setTimeout(() => {
          void fetchSmartSuggestions(value, selectedKey);
        }, 800); // 800ms防抖延迟
      } else {
        setSmartSuggestions([]);
        setIsLoadingSuggestions(false);
      }
    },
    [selectedKey, fetchSmartSuggestions],
  );

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(rpdCreateSchema),
    defaultValues: {
      key: '',
      title: '',
      user_instruction: '',
    },
    mode: 'onChange',
  });

  // 处理单个图片的异步函数
  const processImageAsync = useCallback(
    async (imageInfo: ImageInfo) => {
      try {
        // 更新状态为生成中
        setUploadedImages((prev) =>
          prev.map((img) => (img.id === imageInfo.id ? { ...img, status: 'generating' } : img)),
        );

        // 调用API上传图片并生成描述
        const result = await assetsService.uploadTempAndGenerateDescription(
          imageInfo.file,
          sessionId,
          '画像の詳細分析', // context
          selectedKey || 'general_ng_review', // rpd_type
          title || '', // rpd_title
        );

        // 更新状态为完成
        setUploadedImages((prev) =>
          prev.map((img) =>
            img.id === imageInfo.id
              ? {
                  ...img,
                  status: 'completed',
                  s3Url: result.s3Url,
                  description: result.description,
                }
              : img,
          ),
        );
      } catch (error) {
        // 更新状态为错误
        const errorMessage = error instanceof Error ? error.message : '処理に失敗しました';
        setUploadedImages((prev) =>
          prev.map((img) => (img.id === imageInfo.id ? { ...img, status: 'error', error: errorMessage } : img)),
        );
        console.error(`Failed to process image ${imageInfo.id}:`, error);
      }
    },
    [sessionId, selectedKey, title],
  );

  const handleKeySelect = (key: PredefinedRPDKey) => {
    setSelectedKey(key);
    form.setValue('key', key, { shouldValidate: true });
  };

  const handleClose = () => {
    form.reset();
    setSelectedKey(null);
    setTitle('');
    setShowSuggestions(false);
    setCurrentStep(1);
    setUploadedImages([]);
    setDetailContent('');
    setTags([]);
    setNewTagValue('');
    setSelectedImageIndex(null);
    setSessionId('');

    // 清理智能建议相关状态
    setSmartSuggestions([]);
    setIsLoadingSuggestions(false);
    setLastSuggestionInput('');

    // 清理防抖定时器
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // 清理Chatbot状态
    setChatMessages([]);
    setChatInputText('');
    setChatIsDragOver(false);
    setChatIsProcessing(false);
    setShowHistory(false);
    setTestHistory([]);
    setIsLoadingHistory(false);

    // 清理AI转写状态
    setOriginalDetailContent('');
    setIsRewriting(false);
    setHasRewritten(false);

    // 清理text_review专用状态
    setAppellationFile(null);
    setSpecialRules([]);

    // 清理general_ng_review专用状态
    setNgSubcategory(null);

    onClose();
  };

  const handleNextStep = () => {
    if (selectedKey && form.getValues('key') === selectedKey) {
      setCurrentStep(2);
    }
  };

  const handleTitleFocus = () => {
    setShowSuggestions(true);
  };

  const handleTitleBlur = () => {
    // 延迟隐藏建议，以便用户可以点击建议
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setTitle(suggestion);
    setShowSuggestions(false);
  };

  // タグ管理の関数
  const handleAddTag = () => {
    if (newTagValue.trim() && !tags.includes(newTagValue.trim())) {
      setTags((prev) => [...prev, newTagValue.trim()]);
      setNewTagValue('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNewTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTagValue(e.target.value);
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
  };

  // 基本验证函数
  const validateBasicFields = (): boolean => {
    if (!selectedKey || !title.trim()) {
      toast({
        title: 'エラー',
        description: '必要な項目をすべて入力してください。',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  // 详细内容验证函数
  const validateDetailContent = (): boolean => {
    if (selectedKey !== 'text_review' && !detailContent.trim()) {
      toast({
        title: 'エラー',
        description: '詳細内容を入力してください。',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  // text_review专用验证函数
  const validateTextReview = (): boolean => {
    if (selectedKey !== 'text_review') {
      return true;
    }

    if (!appellationFile || appellationFile.status !== 'completed') {
      toast({
        title: 'エラー',
        description: 'テキスト監修には称呼表ファイルのアップロードが必要です。',
        variant: 'destructive',
      });
      return false;
    }

    if (specialRules.length > 0) {
      const invalidRule = specialRules.find(
        (rule) => !rule.speaker.trim() || !rule.target.trim() || !rule.alias.trim(),
      );
      if (invalidRule) {
        toast({
          title: 'エラー',
          description: '特殊ルールの必須項目（話し手、対象、特殊称呼）をすべて入力してください。',
          variant: 'destructive',
        });
        return false;
      }
    }
    return true;
  };

  // 构建创建数据
  const buildCreateData = (): ReviewPointDefinitionCreate => {
    const baseData: ReviewPointDefinitionCreate = {
      key: selectedKey!,
      title,
      user_instruction: detailContent, // 使用user_instruction而不是description_for_ai
      tag_list: tags,
      project_id: projectId,
      ai_description_groups: [], // 必需字段，默认为空数组
      is_active: true, // 必需字段，默认为true
      reference_images: [], // 必需字段，默认为空数组
    };

    // 处理参考图片
    const referenceImages = uploadedImages
      .filter((img) => img.status === 'completed')
      .map((img) => img.s3Url)
      .filter((url): url is string => !!url);

    if (referenceImages.length > 0) {
      baseData.reference_images = referenceImages;
    }

    // text_review专用数据
    if (selectedKey === 'text_review') {
      const referenceFiles =
        appellationFile && appellationFile.status === 'completed' && appellationFile.s3Url
          ? [appellationFile.s3Url]
          : [];

      baseData.reference_files = referenceFiles;
      if (specialRules.length > 0) {
        baseData.special_rules = specialRules;
      }
    }

    // general_ng_review专用数据
    if (selectedKey === 'general_ng_review' && ngSubcategory) {
      baseData.ng_subcategory = ngSubcategory;
    }

    return baseData;
  };

  const handleSubmit = async () => {
    // 执行所有验证
    if (!validateBasicFields() || !validateDetailContent() || !validateTextReview()) {
      return;
    }

    try {
      const createData = buildCreateData();

      await createRPDMutation.mutateAsync(createData);

      toast({
        title: '成功',
        description: 'RPDが正常に作成されました。',
      });

      handleClose();
    } catch (error) {
      console.error('RPD作成エラー:', error);
      toast({
        title: 'エラー',
        description: 'RPDの作成に失敗しました。',
        variant: 'destructive',
      });
    }
  };

  const onSubmitWrapper = () => {
    // 直接调用handleSubmit，绕过form validation，因为我们使用自定义状态管理
    void handleSubmit();
  };

  const handleNewTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTagValue.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Image upload handler
  const handleImageUpload = useCallback(
    (files: FileList | null) => {
      if (!files || !sessionId) {
        return;
      }

      // 创建图片信息对象
      const newImages = Array.from(files).map(
        (file): ImageInfo => ({
          id: `img-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
          file,
          preview: URL.createObjectURL(file),
          status: 'uploading', // 初始状态为上传中
        }),
      );

      // 添加到状态中
      setUploadedImages((prev) => [...prev, ...newImages]);

      // 为每个图片启动处理流程
      for (const imageInfo of newImages) {
        void processImageAsync(imageInfo);
      }
    },
    [sessionId, processImageAsync],
  );

  const handleRemoveImage = useCallback((index: number) => {
    setUploadedImages((prev) => {
      const imageToRemove = prev[index];
      // 释放blob URL内存
      if (imageToRemove && imageToRemove.preview && imageToRemove.preview.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // 图片点击处理
  const handleImageClick = useCallback(
    (event: React.MouseEvent, index: number) => {
      if (index === -1) {
        // 关闭气泡
        setSelectedImageIndex(null);
        setTooltipPosition(null);
        return;
      }

      if (selectedImageIndex === index) {
        // 如果点击同一个图片，关闭气泡
        setSelectedImageIndex(null);
        setTooltipPosition(null);
      } else {
        // 计算气泡位置
        const target = event.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();

        // 计算气泡显示位置（在图片右侧，如果空间不够则显示在左侧）
        const tooltipWidth = 320; // 20rem = 320px
        const viewportWidth = window.innerWidth;
        const spaceOnRight = viewportWidth - rect.right;
        const spaceOnLeft = rect.left;

        let x: number;
        const y = Math.max(16, Math.min(window.innerHeight - 200, rect.top));

        if (spaceOnRight >= tooltipWidth + 16) {
          // 右侧有足够空间
          x = rect.right + 12;
        } else if (spaceOnLeft >= tooltipWidth + 16) {
          // 左侧有足够空间
          x = rect.left - tooltipWidth - 12;
        } else {
          // 两侧都没有足够空间，居中显示
          x = Math.max(16, Math.min(viewportWidth - tooltipWidth - 16, rect.left + rect.width / 2 - tooltipWidth / 2));
        }

        setTooltipPosition({ x, y });
        setSelectedImageIndex(index);
      }
    },
    [selectedImageIndex],
  );

  // 获取图片描述
  const getImageDescription = useCallback(
    (imageId: string) => {
      const image = uploadedImages.find((img) => img.id === imageId);
      if (image) {
        if (image.status === 'generating' || image.status === 'uploading') {
          return '画像の詳細な説明を生成中です...';
        }
        if (image.status === 'error') {
          return image.error || '説明の生成に失敗しました';
        }
        if (image.status === 'completed') {
          if (image.description) {
            return image.description.detailed_description;
          }
        }
      }
      return '画像の詳細な説明を生成中です...';
    },
    [uploadedImages],
  );

  // Copy描述到剪贴板
  const handleCopyDescription = useCallback(async (description: string) => {
    try {
      await navigator.clipboard.writeText(description);
      toast({
        title: '成功',
        description: '説明がクリップボードにコピーされました。',
      });
    } catch (err) {
      console.error('Failed to copy description:', err);
      toast({
        title: 'エラー',
        description: 'コピーに失敗しました。',
        variant: 'destructive',
      });
    }
  }, []);

  // 重新生成描述
  const handleRegenerateDescription = useCallback(
    async (imageId: string) => {
      const image = uploadedImages.find((img) => img.id === imageId);
      if (!image) {
        return;
      }

      // 确定使用哪个URL进行描述生成
      const imageUrl = image.s3Url;
      if (!imageUrl) {
        return;
      }

      try {
        // 更新状态为生成中
        setUploadedImages((prev) => prev.map((img) => (img.id === imageId ? { ...img, status: 'generating' } : img)));

        // 重新调用API生成描述
        const result = await assetsService.generateImageDescription({
          image_url: imageUrl,
          context: '画像の詳細分析',
          rpd_type: selectedKey || 'general_ng_review',
          rpd_title: title || '',
        });

        // 更新状态为完成
        setUploadedImages((prev) =>
          prev.map((img) => (img.id === imageId ? { ...img, status: 'completed', description: result } : img)),
        );
      } catch (error) {
        // 更新状态为错误
        const errorMessage = error instanceof Error ? error.message : '再生成に失敗しました';
        setUploadedImages((prev) =>
          prev.map((img) => (img.id === imageId ? { ...img, status: 'error', error: errorMessage } : img)),
        );
        console.error(`Failed to regenerate description for image ${imageId}:`, error);
      }
    },
    [uploadedImages, selectedKey, title],
  );

  // AI转写相关函数
  const handleRewritePrompt = useCallback(async () => {
    if (!detailContent.trim() || !selectedKey || isRewriting) {
      return;
    }

    // 保存原始内容（如果还没保存过）
    if (!originalDetailContent) {
      setOriginalDetailContent(detailContent);
    }

    setIsRewriting(true);

    try {
      const rewriteRequest = {
        original_prompt: detailContent,
        rpd_type: selectedKey,
        context: `Project: ${projectId}, RPD Title: ${title}`,
        image_url: uploadedImages.find((img) => img.status === 'completed' && img.s3Url)?.s3Url,
      };

      const response = await reviewPointDefinitionsService.rewritePrompt(rewriteRequest);

      // 使用日文版本的转写结果
      setDetailContent(response.rewritten_prompt_jpn);
      setHasRewritten(true);
    } catch (error) {
      console.error('AI转写失败:', error);
      toast({
        title: 'エラー',
        description: 'AI転写に失敗しました。',
        variant: 'destructive',
      });
    } finally {
      setIsRewriting(false);
    }
  }, [detailContent, selectedKey, isRewriting, originalDetailContent, projectId, title, uploadedImages]);

  const handleRestoreOriginal = () => {
    if (originalDetailContent) {
      setDetailContent(originalDetailContent);
      setHasRewritten(false);
    }
  };

  // 称呼表文件上传处理
  const handleAppellationFileUpload = useCallback(
    async (file: File) => {
      if (!sessionId) {
        return;
      }

      // 验证文件类型
      const fileName = file.name.toLowerCase();
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      const isJson = fileName.endsWith('.json');

      if (!isExcel && !isJson) {
        toast({
          title: 'エラー',
          description: 'Excel (.xlsx, .xls) または JSON ファイルのみアップロード可能です。',
          variant: 'destructive',
        });
        return;
      }

      const fileInfo: AppellationFileInfo = {
        id: `appellation-${Date.now()}-${generateSecureId()}`,
        file,
        name: file.name,
        type: isExcel ? 'excel' : 'json',
        status: 'uploading',
      };

      setAppellationFile(fileInfo);

      try {
        // 调用API上传文件
        const response = await reviewPointDefinitionsService.uploadAppellationFile(file, projectId, sessionId);

        // 更新状态为完成
        setAppellationFile((prev) =>
          prev && prev.id === fileInfo.id
            ? {
                ...prev,
                status: 'completed',
                s3Url: response.s3_url,
              }
            : prev,
        );

        toast({
          title: '成功',
          description: '称呼表ファイルのアップロードが完了しました。',
        });
      } catch (error) {
        // 更新状态为错误
        const errorMessage = error instanceof Error ? error.message : 'ファイルのアップロードに失敗しました';
        setAppellationFile((prev) =>
          prev && prev.id === fileInfo.id
            ? {
                ...prev,
                status: 'error',
                error: errorMessage,
              }
            : prev,
        );
        console.error('Failed to upload appellation file:', error);
        toast({
          title: 'エラー',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
    [sessionId, projectId],
  );

  // 移除称呼表文件
  const handleRemoveAppellationFile = useCallback(() => {
    setAppellationFile(null);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-6xl max-h-[85vh] p-0 overflow-hidden border-0 shadow-2xl">
        <DialogHeader className="px-6 pt-4 pb-1 bg-gradient-to-r from-slate-50 to-gray-50 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-gray-900">新しいレビューポイント定義を作成</DialogTitle>
        </DialogHeader>

        <div className="flex h-[calc(85vh-4rem)] overflow-hidden">
          {/* 左側：編集エリア */}
          <div className="flex-1 border-r border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 overflow-y-auto">
            <div className="h-full flex flex-col min-h-0">
              {currentStep === 1 ? (
                /* Step 1: Key Selection + Title + NG Subcategory */
                <>
                  <div className="mb-4 flex-shrink-0">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">監修タイプを選んでください</h3>
                    <p className="text-sm text-gray-600">レビューの目的に合わせて最適なタイプを選択してください</p>
                  </div>

                  {/* RPDキー選択グリッド */}
                  <div className="mb-6">
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {PREDEFINED_RPD_KEYS.map((key) => (
                        <KeySelectionCard
                          key={key}
                          rpdKey={key}
                          isSelected={selectedKey === key}
                          onSelect={() => handleKeySelect(key)}
                        />
                      ))}
                    </div>

                    {/* NG监修子类选择 */}
                    {selectedKey === 'general_ng_review' && (
                      <div className="mb-4">
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                          <h4 className="text-sm font-semibold mb-2 text-gray-900">サブカテゴリ選択</h4>
                          <p className="text-xs text-gray-600 mb-3">NG監修の種類を選択してください</p>
                          <div className="grid grid-cols-2 gap-2">
                            {NG_SUBCATEGORIES.map((subcategory) => (
                              <NGSubcategoryCard
                                key={subcategory}
                                subcategory={subcategory}
                                isSelected={ngSubcategory === subcategory}
                                onSelect={() => setNgSubcategory(subcategory)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* RPDタイトル入力エリア */}
                    {selectedKey && (
                      <div className="mb-4">
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                          <h4 className="text-sm font-semibold mb-2 text-gray-900">RPDタイトル</h4>
                          <div className="relative">
                            <Input
                              value={title}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                handleTitleInputWithDebounce(e.target.value)
                              }
                              onFocus={handleTitleFocus}
                              onBlur={handleTitleBlur}
                              placeholder="RPDのタイトルを入力してください... (4文字以上でAI補完表示)"
                              className="w-full h-10 px-3 text-sm border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />

                            {/* 智能建议下拉框 */}
                            {showSuggestions && selectedKey && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                                {/* 加载状态 */}
                                {isLoadingSuggestions && (
                                  <div className="p-3 text-center text-gray-500 text-sm">
                                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                                    AI補完を取得中...
                                  </div>
                                )}

                                {/* AI智能建议 */}
                                {!isLoadingSuggestions && smartSuggestions.length > 0 && (
                                  <>
                                    {smartSuggestions.map((suggestion, index) => (
                                      <button
                                        key={`smart-${index}`}
                                        type="button"
                                        onClick={() => handleSuggestionClick(suggestion.text)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors border-b border-gray-50 last:border-b-0"
                                      >
                                        {suggestion.text}
                                      </button>
                                    ))}
                                  </>
                                )}

                                {/* 输入长度不足提示 */}
                                {!isLoadingSuggestions && title.length < 4 && (
                                  <div className="p-3 text-center text-gray-400 text-xs">
                                    あと{4 - title.length}文字入力するとAI補完が表示されます
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 確認ボタン */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleNextStep}
                      disabled={!selectedKey || !title.trim()}
                      className="h-10 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                    >
                      確認して次へ
                    </Button>
                  </div>
                </>
              ) : (
                /* Step 2: Content Creation */
                <>
                  <div className="mb-4 flex-shrink-0">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                            {RPD_KEY_INFO[selectedKey!]?.name || selectedKey}
                          </span>
                          <div className="text-sm font-medium text-blue-900">{title}</div>
                          {selectedKey === 'general_ng_review' && ngSubcategory && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              {ngSubcategory === 'concrete_shape' ? '具体的な形状' : '抽象的なタイプ'}
                            </span>
                          )}
                        </div>
                        <Button
                          onClick={handlePrevStep}
                          className="h-8 px-4 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        >
                          ← 戻る
                        </Button>
                      </div>
                      <p className="text-sm text-blue-600">{RPD_KEY_INFO[selectedKey!]?.description || ''}</p>
                    </div>
                  </div>

                  {/* 内容エリア - スクロール可能 */}
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
                    {selectedKey === 'text_review' ? (
                      /* text_review专用内容区域 */
                      <>
                        {/* 称呼表上传区域 */}
                        <div className="h-56 flex-shrink-0">
                          <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full overflow-hidden">
                            <AppellationFileUploadArea
                              appellationFile={appellationFile}
                              onFileUpload={(file) => {
                                void handleAppellationFileUpload(file);
                              }}
                              onRemoveFile={handleRemoveAppellationFile}
                            />
                          </div>
                        </div>

                        {/* 特殊规则填写区域 */}
                        <div className="h-48 flex-shrink-0">
                          <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full overflow-hidden">
                            <div className="p-3 h-full overflow-y-auto">
                              <SpecialRulesEditor rules={specialRules} onRulesChange={setSpecialRules} />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* 其他RPD类型的图片上传区域 */
                      <div className="h-56 flex-shrink-0">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full overflow-hidden">
                          <div className="h-full">
                            <ImageUploadArea
                              images={uploadedImages}
                              onImageUpload={handleImageUpload}
                              onRemoveImage={handleRemoveImage}
                              onImageClick={handleImageClick}
                              selectedImageIndex={selectedImageIndex}
                              tooltipPosition={tooltipPosition}
                              getImageDescription={getImageDescription}
                              onCopyDescription={handleCopyDescription}
                              onRegenerateDescription={(imageId: string) => {
                                handleRegenerateDescription(imageId).catch(console.error);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 中部：編集エリア - text_review以外のみ表示 */}
                    {selectedKey !== 'text_review' && (
                      <div className="h-48 flex-shrink-0">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full overflow-hidden">
                          <div className="relative p-3 h-full">
                            <TextArea
                              value={detailContent}
                              onChange={(e) => setDetailContent(e.target.value)}
                              placeholder="AIが理解できる明確な説明を記入してください（例：この画像には人物が写っているかを確認してください。顔が明確に判別できる場合は...）"
                              className="w-full h-full resize-none border-0 bg-transparent focus:ring-0 text-sm leading-relaxed pr-20"
                            />

                            {/* AI转写按钮区域 */}
                            <div className="absolute bottom-3 right-4 flex gap-1">
                              {hasRewritten && originalDetailContent && (
                                <button
                                  onClick={handleRestoreOriginal}
                                  disabled={isRewriting}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="元の内容に戻す"
                                >
                                  <Undo2 className="w-3 h-3" />
                                  元に戻す
                                </button>
                              )}

                              <button
                                onClick={() => void handleRewritePrompt()}
                                disabled={!detailContent.trim() || !selectedKey || isRewriting}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="AIでプロンプトを転写"
                              >
                                {isRewriting ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    改善提案中...
                                  </>
                                ) : (
                                  <>
                                    <Wand2 className="w-3 h-3" />
                                    AI改善提案
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 下部：タグつけエリア */}
                    <div className="h-16 flex-shrink-0">
                      <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full overflow-hidden">
                        <div className="p-1 h-full">
                          {selectedKey === 'general_ng_review' && (
                            <div className="text-xs text-blue-600 mb-1 font-medium">
                              NG監修時はタグの追加を推奨します
                            </div>
                          )}
                          <div className="flex items-center gap-2 h-10 overflow-x-auto">
                            {/* 既存のタグ */}
                            {tags.map((tag, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 px-3 py-1 rounded-full text-xs whitespace-nowrap border border-blue-100 shadow-sm"
                              >
                                <span className="font-medium">{tag}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(index)}
                                  className="text-blue-500 hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 transition-colors"
                                >
                                  <X className="w-2 h-2" />
                                </button>
                              </div>
                            ))}

                            {/* 新しいタグ入力 */}
                            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full text-xs hover:bg-gray-100 transition-colors">
                              <input
                                type="text"
                                value={newTagValue}
                                onChange={handleNewTagChange}
                                onKeyDown={handleNewTagKeyPress}
                                placeholder="新しいタグ"
                                style={{
                                  width: newTagValue ? `${Math.max(newTagValue.length * 8 + 20, 60)}px` : '60px',
                                }}
                                className="bg-transparent border-none outline-none text-xs placeholder-gray-400 min-w-0 overflow-visible"
                              />
                              {newTagValue.trim() && (
                                <button
                                  type="button"
                                  onClick={handleAddTag}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full p-0.5 transition-colors"
                                >
                                  <Check className="w-2 h-2" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 右側：タブエリア */}
          <RightPanelTabs
            selectedKey={selectedKey}
            title={title}
            tags={tags}
            detailContent={detailContent}
            currentStep={currentStep}
            onSubmit={onSubmitWrapper}
            projectId={projectId}
            uploadedImages={uploadedImages}
            appellationFile={appellationFile}
            specialRules={specialRules}
            ngSubcategory={ngSubcategory}
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
            chatInputText={chatInputText}
            setChatInputText={setChatInputText}
            chatIsDragOver={chatIsDragOver}
            setChatIsDragOver={setChatIsDragOver}
            chatIsProcessing={chatIsProcessing}
            setChatIsProcessing={setChatIsProcessing}
            showHistory={showHistory}
            setShowHistory={setShowHistory}
            testHistory={testHistory}
            setTestHistory={setTestHistory}
            isLoadingHistory={isLoadingHistory}
            setIsLoadingHistory={setIsLoadingHistory}
            isSubmitting={createRPDMutation.isPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Key Selection Card Component
interface KeySelectionCardProps {
  rpdKey: PredefinedRPDKey;
  isSelected: boolean;
  onSelect: () => void;
}

function KeySelectionCard({ rpdKey, isSelected, onSelect }: KeySelectionCardProps) {
  const keyInfo = RPD_KEY_INFO[rpdKey];

  return (
    <div
      className={`
        relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 transform hover:scale-[1.02] group
        ${
          isSelected
            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg shadow-blue-100'
            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg hover:shadow-gray-100'
        }
      `}
      onClick={onSelect}
    >
      <div className="text-center">
        <div
          className={`
          text-sm font-bold mb-1 transition-colors
          ${isSelected ? 'text-blue-900' : 'text-gray-900 group-hover:text-blue-800'}
        `}
        >
          {keyInfo.name}
        </div>
        <div
          className={`
          text-xs leading-relaxed
          ${isSelected ? 'text-blue-700' : 'text-gray-600 group-hover:text-gray-700'}
        `}
        >
          {keyInfo.description}
        </div>
      </div>

      {/* 選択インジケーター */}
      {isSelected && (
        <div className="absolute -top-1 -right-1">
          <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <Check className="text-white w-2 h-2" />
          </div>
        </div>
      )}

      {/* 未選択時のホバーエフェクト */}
      {!isSelected && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
      )}
    </div>
  );
}

// NG Subcategory Card Component
interface NGSubcategoryCardProps {
  subcategory: Exclude<NGSubcategoryType, null>;
  isSelected: boolean;
  onSelect: () => void;
}

function NGSubcategoryCard({ subcategory, isSelected, onSelect }: NGSubcategoryCardProps) {
  const subcategoryInfo = NG_SUBCATEGORY_INFO[subcategory];

  return (
    <div
      className={`
        relative cursor-pointer rounded-lg border-2 p-3 transition-all duration-200 transform hover:scale-[1.02] group
        ${
          isSelected
            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md shadow-blue-100'
            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md hover:shadow-gray-100'
        }
      `}
      onClick={onSelect}
    >
      <div className="text-center">
        <div
          className={`
          text-sm font-bold mb-1 transition-colors
          ${isSelected ? 'text-blue-900' : 'text-gray-900 group-hover:text-blue-800'}
        `}
        >
          {subcategoryInfo.name}
        </div>
        <div
          className={`
          text-xs leading-relaxed
          ${isSelected ? 'text-blue-700' : 'text-gray-600 group-hover:text-gray-700'}
        `}
        >
          {subcategoryInfo.description}
        </div>
      </div>

      {/* 選択インジケーター */}
      {isSelected && (
        <div className="absolute -top-1 -right-1">
          <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
            <Check className="text-white w-2 h-2" />
          </div>
        </div>
      )}

      {/* 未選択時のホバーエフェクト */}
      {!isSelected && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg opacity-0 group-hover:opacity-30 transition-opacity duration-200" />
      )}
    </div>
  );
}
