import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { assetsService } from '@/api/assetsService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { toast } from '@/components/ui/use-toast';
import { PREDEFINED_RPD_KEYS, type PredefinedRPDKey } from '@/constants/rpdKeys';
import { useAsset } from '@/hooks/useAsset';

import { reviewPointDefinitionsService } from '../../../api/reviewPointDefinitionsService';
import { useCreateRPD } from '../hooks/useCreateRPD';
import type { ReviewPointDefinitionCreate } from '../types/rpd-create-types';

// RPD Keyの日文名称和说明
const RPD_KEY_INFO: Record<PredefinedRPDKey, { name: string; description: string }> = {
  general_ng_review: {
    name: 'NG監修',
    description: 'NG項目の有無を確認',
  },
  visual_review: {
    name: 'ビジュアル監修',
    description: '視覚的要素の監修',
  },
  settings_review: {
    name: '設定監修',
    description: '設定の確認',
  },
  design_review: {
    name: 'デザイン監修',
    description: 'デザインの確認',
  },
  text_review: {
    name: 'テキスト監修',
    description: '文字内容の監修',
  },
  copyright_review: {
    name: 'コピーライト監修',
    description: 'コピーライトマークの確認',
  },
};

// 快速创建的表单数据结构
const fastCreateSchema = z.object({
  description: z.string().min(1, '監修内容を入力してください'),
  key: z.string().min(1, 'タイプを選択してください'),
  title: z.string().min(1, 'タイトルを入力してください'),
  user_instruction: z.string().min(1, 'AI用説明を入力してください'),
  reference_images: z.array(z.string()).optional().default([]),
  suggested_tags: z.array(z.string()).optional().default([]),
});

type FastCreateFormData = z.infer<typeof fastCreateSchema>;

// API响应类型定义
interface GenerateRPDResponse {
  title: string;
  description_for_ai: string;
  description_for_ai_jpn: string;
  suggested_tag: string;
}

interface RPDCreateModalFastProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

// 步骤枚举
enum Step {
  INPUT = 'input',
  RESULT = 'result',
}

export function RPDCreateModalFast({ isOpen, onClose, projectId }: RPDCreateModalFastProps): JSX.Element {
  const [currentStep, setCurrentStep] = useState<Step>(Step.INPUT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const form = useForm<FastCreateFormData>({
    resolver: zodResolver(fastCreateSchema),
    defaultValues: {
      description: '',
      key: PREDEFINED_RPD_KEYS[0],
      title: '',
      user_instruction: '',
      reference_images: [],
      suggested_tags: [],
    },
  });

  const createRPDMutation = useCreateRPD();

  // 生成AI内容
  const handleGenerate = async () => {
    const description = form.getValues('description');
    if (!description.trim()) {
      toast({
        title: 'エラー',
        description: '監修内容を入力してください。',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      // 调用新的完整RPD内容生成API
      let response: GenerateRPDResponse | undefined;
      try {
        response = await reviewPointDefinitionsService.generateRPDContent({
          user_input: description,
          image_url: uploadedImages[0], // 如果有上传图片，使用第一张
          context: `Project context for project ${projectId}`,
        });
      } catch (apiError) {
        console.error('API调用失败:', apiError);
        throw new Error('API调用失败');
      }

      // 验证响应数据
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response from API');
      }

      // 类型断言确保response有正确的类型
      const typedResponse = response;

      // 设置生成的所有内容
      form.setValue('key', 'general_ng_review'); // 设置默认值，因为后端没有返回recommended_key
      form.setValue('title', typedResponse.title || description.substring(0, 50));
      form.setValue('user_instruction', typedResponse.description_for_ai_jpn || '');
      form.setValue('suggested_tags', typedResponse.suggested_tag ? [typedResponse.suggested_tag] : []); // 将单个标签转换为数组
      form.setValue('reference_images', uploadedImages);

      // 切换到结果步骤
      setCurrentStep(Step.RESULT);
    } catch (error) {
      console.error('生成失败:', error);
      toast({
        title: 'エラー',
        description: '生成に失敗しました。もう一度お試しください。',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 确定并创建RPD
  const handleConfirm = async (data: FastCreateFormData) => {
    try {
      const createData: ReviewPointDefinitionCreate = {
        key: data.key,
        title: data.title,
        user_instruction: data.user_instruction, // 使用日文版本
        // eng_description_for_ai: Deprecated, using description_for_ai instead
        ai_description_groups: [], // 快速创建模式不使用分组
        tag_list: data.suggested_tags,
        reference_images: data.reference_images || [],
        is_active: true,
        project_id: projectId,
      };

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

  // 关闭modal并重置状态
  const handleClose = () => {
    setCurrentStep(Step.INPUT);
    setIsGenerating(false);
    setUploadedImages([]);
    form.reset();
    onClose();
  };

  // 返回第一步
  const handleBack = () => {
    setCurrentStep(Step.INPUT);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
              <Sparkles className="h-4 w-4" />
            </div>
            簡易モードでRPD作成
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {currentStep === Step.INPUT
              ? 'AIアシスタントでレビューポイントを作成します'
              : '生成された内容を確認・編集してください'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
            {currentStep === Step.INPUT ? (
              <InputStep
                form={form}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                onUploadedImagesChange={setUploadedImages}
                projectId={projectId}
              />
            ) : (
              <ResultStep
                form={form}
                onConfirm={async () => {
                  await form.handleSubmit(handleConfirm)();
                }}
                onBack={handleBack}
                isLoading={createRPDMutation.isPending}
              />
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// 第一步：输入步骤
interface InputStepProps {
  form: ReturnType<typeof useForm<FastCreateFormData>>;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
  onUploadedImagesChange: (images: string[]) => void;
  projectId: string;
}

// 简化的图片上传预览组件
interface SimpleImageUploadProps {
  onImageChange: (imagePath: string | null) => void;
  projectId: string;
}

function SimpleImageUpload({ onImageChange }: SimpleImageUploadProps): JSX.Element {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 使用useAsset获取预签名URL用于显示
  const { assetUrl } = useAsset(uploadedImage || '');

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setUploadError('画像ファイルを選択してください');
      return;
    }

    // 验证文件大小 (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('ファイルサイズは10MB以下にしてください');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      // 创建本地预览URL
      const localPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(localPreviewUrl);

      // 实际上传到S3
      const uploadResult = await assetsService.uploadImage(file, (progress) => {
        // 可以在这里显示上传进度
        console.log(`Upload progress: ${progress}%`);
      });

      // 设置实际的S3 URL
      setUploadedImage(uploadResult.url);
      onImageChange(uploadResult.url);

      toast({
        title: '成功',
        description: '画像のアップロードが完了しました。',
      });
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError('アップロードに失敗しました');
      // 清理预览URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      toast({
        title: 'エラー',
        description: '画像のアップロードに失敗しました。',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setUploadedImage(null);
    setPreviewUrl(null);
    setUploadError(null);
    onImageChange(null);

    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 决定显示哪个图片URL
  const displayImageUrl = previewUrl || assetUrl;

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => void handleFileSelect(e)}
        className="hidden"
      />

      {!displayImageUrl ? (
        // 精致的上传区域
        <div
          onClick={handleUploadClick}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer 
                     hover:border-blue-400 hover:bg-blue-50/50 transition-colors duration-200 bg-gray-50/30"
        >
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-lg">
            <Upload className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">参考画像をアップロード</p>
          <p className="text-xs text-gray-500">クリックして画像を選択</p>
        </div>
      ) : (
        // 精致的图片预览区域
        <div className="relative group">
          <div className="relative rounded-lg border border-gray-200 bg-white overflow-hidden">
            <img
              src={displayImageUrl}
              alt="アップロード済み画像"
              className="w-full h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity"
              onClick={handleUploadClick}
            />

            {/* 精致的悬停操作按钮 */}
            <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleUploadClick}
                className="text-xs bg-white/90 hover:bg-white"
              >
                <Upload className="w-3 h-3 mr-1" />
                変更
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage();
                }}
                className="text-xs"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                削除
              </Button>
            </div>

            {/* 上传进度指示器 */}
            {isUploading && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-600">アップロード中...</span>
                </div>
              </div>
            )}
          </div>

          {/* 提示文字 */}
          <p className="text-xs text-gray-500 text-center mt-2">クリックして画像を変更</p>
        </div>
      )}

      {/* 错误信息 */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-2">
          <p className="text-sm text-red-600 text-center">{uploadError}</p>
        </div>
      )}
    </div>
  );
}

function InputStep({ form, onGenerate, isGenerating, onUploadedImagesChange, projectId }: InputStepProps): JSX.Element {
  const handleImageChange = (imagePath: string | null) => {
    const images = imagePath ? [imagePath] : [];
    onUploadedImagesChange(images);
  };

  return (
    <div className="space-y-8">
      {/* 主要输入区域 - 去掉边框 */}
      <div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-medium text-gray-800">何を監修したいですか？</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例：キャラクターの髪の長さが設定資料と違う場合は指摘してください..."
                  className="text-base h-12 mt-3"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* 图片上传区域 - 去掉边框 */}
      <div>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-800">参考画像</label>
            <Badge variant="secondary" className="text-xs">
              任意
            </Badge>
          </div>
          <SimpleImageUpload onImageChange={handleImageChange} projectId={projectId} />
        </div>
      </div>

      {/* 生成按钮 */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={() => {
            onGenerate().catch(console.error);
          }}
          disabled={isGenerating || !form.watch('description')}
          className="px-8 py-3 text-base font-medium bg-blue-600 hover:bg-blue-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              AI生成中...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              AI生成開始
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// 第二步：结果步骤
interface ResultStepProps {
  form: ReturnType<typeof useForm<FastCreateFormData>>;
  onConfirm: () => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

function ResultStep({ form, onConfirm, onBack, isLoading }: ResultStepProps): JSX.Element {
  const [newTag, setNewTag] = useState('');
  const watchedTags = form.watch('suggested_tags') || [];

  const addTag = () => {
    if (newTag.trim() && !watchedTags.includes(newTag.trim())) {
      const updatedTags = [...watchedTags, newTag.trim()];
      form.setValue('suggested_tags', updatedTags);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = watchedTags.filter((tag) => tag !== tagToRemove);
    form.setValue('suggested_tags', updatedTags);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左侧列 - 去掉所有边框 */}
        <div className="space-y-6">
          <div>
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-800">RPDタイプ</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="タイプを選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PREDEFINED_RPD_KEYS.map((key) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex flex-col">
                            <span className="font-medium">{RPD_KEY_INFO[key].name}</span>
                            <span className="text-[10px] text-gray-400 leading-tight">
                              {RPD_KEY_INFO[key].description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-800">タイトル</FormLabel>
                  <FormControl>
                    <Input {...field} className="mt-2" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 标签编辑区域 - 去掉外层边框 */}
          <div>
            <FormLabel className="text-sm font-medium text-gray-800 block mb-3">推奨タグ</FormLabel>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-gray-50 mb-3">
              {watchedTags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X className="w-3 h-3 cursor-pointer hover:text-red-600" onClick={() => removeTag(tag)} />
                </Badge>
              ))}
              {watchedTags.length === 0 && <span className="text-gray-400 text-sm">タグなし</span>}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="新しいタグを入力"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1"
              />
              <Button type="button" onClick={addTag} variant="outline" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 右侧列 - 去掉所有边框 */}
        <div className="space-y-6">
          <div>
            <FormField
              control={form.control}
              name="user_instruction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-800">AI用説明（日本語）</FormLabel>
                  <FormControl>
                    <TextArea {...field} className="min-h-[280px] mt-2" placeholder="AIプロセシング用の日本語説明..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>

      {/* 底部按钮区域 - 只保留顶部分隔线 */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onBack}>
          戻る
        </Button>
        <Button
          onClick={() => {
            onConfirm().catch(console.error);
          }}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              作成中...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              RPD作成
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default RPDCreateModalFast;
