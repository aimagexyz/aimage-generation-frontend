import clsx from 'clsx';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuCheck, LuImage, LuLoader, LuSearch, LuSend } from 'react-icons/lu';

import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { useAsset } from '@/hooks/useAsset';
import { useUploadImage } from '@/hooks/useUploadImage';

import { type Annotation, type Pos, useFrameAnnotation } from './useFrameAnnotation';

type Props = {
  scale: number;
  padding: { x: number; y: number };
  onAnnotationCreate: (annotation: Annotation) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  isSubmitting?: boolean;
  onSearchRequest?: (rect: { x: number; y: number; width: number; height: number }) => void;
  onSwitchToSearchPanel?: () => void;
};

// 对话框的默认尺寸
const DIALOG_SIZE = {
  width: 200,
  height: 150,
};

export function AnnotationInput(props: Props) {
  const { scale, padding, onAnnotationCreate, containerRef, isSubmitting, onSearchRequest, onSwitchToSearchPanel } =
    props;
  const {
    currentRect,
    isShowingAnnotationInput,
    resetImageAnnotation,
    currentText,
    setCurrentText,
    currentColor,
    currentTool,
    currentSubmitType,
    setCurrentSubmitType,
    setSearchContext,
  } = useFrameAnnotation();

  const [position, setPosition] = useState<Pos>({ x: 100, y: 100 });
  const [startPos, setStartPos] = useState<Pos>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // 图片来源信息
  const [imageSource, setImageSource] = useState<{
    type: 'upload' | 'reference';
    s3Path?: string; // 对于引用图片，存储S3路径
    filename?: string;
  }>({ type: 'upload' });

  // 添加对话框和容器的ref
  const dialogRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const { mutateAsync: uploadImage } = useUploadImage();

  // 对于引用图片，使用 useAsset 获取临时 URL
  const referenceS3Path = imageSource.type === 'reference' && imageSource.s3Path ? imageSource.s3Path : '';
  const { assetUrl: referenceImageUrl } = useAsset(referenceS3Path);

  // 计算对话框的位置
  const calculateDialogPosition = useCallback(() => {
    if (!currentRect || !containerRef.current) {
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const dialogWidth = DIALOG_SIZE.width;
    const dialogHeight = DIALOG_SIZE.height;

    // 计算标注框的中心点
    const centerX = currentRect.x + currentRect.width / 2;
    const centerY = currentRect.y + currentRect.height / 2;

    // 计算对话框的位置，确保不会超出容器边界
    const x = Math.min(Math.max(centerX - dialogWidth / 2, 0), containerRect.width - dialogWidth);
    const y = Math.min(Math.max(centerY - dialogHeight / 2, 0), containerRect.height - dialogHeight);

    setPosition({ x, y });
  }, [currentRect, containerRef]);

  useEffect(() => {
    if (isShowingAnnotationInput && currentRect) {
      calculateDialogPosition();
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 0);
    }
  }, [currentRect, isShowingAnnotationInput, calculateDialogPosition]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    void uploadImage(file)
      .then((response) => {
        setUploadedImageUrl(response.url);
      })
      .catch((error) => {
        console.error('Failed to upload image:', error);
      })
      .finally(() => {
        setIsUploading(false);
      });
  };

  const handleAnnotationSubmit = (type: 'annotation' | 'ai-annotation') => {
    if (!currentRect || !currentText.trim()) {
      return;
    }

    setCurrentSubmitType(type);

    // 确定要使用的图片URL
    let imageUrl = uploadedImageUrl;
    if (imageSource.type === 'reference' && imageSource.s3Path) {
      // 对于引用图片，直接传递S3路径，让AnnotationLayer的useAsset来处理
      imageUrl = imageSource.s3Path;
    }

    // 如果是引用图片，在文本中添加来源信息
    let annotationText = currentText;
    if (imageSource.type === 'reference' && imageSource.filename) {
      annotationText += `\n\n[参考画像: ${imageSource.filename}]`;
    }

    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      type,
      text: annotationText,
      timestamp: new Date().toLocaleString(),
      rect: {
        x: (currentRect.x - padding.x) / scale,
        y: (currentRect.y - padding.y) / scale,
        width: currentRect.width / scale,
        height: currentRect.height / scale,
      },
      color: currentColor,
      tool: (() => {
        if (currentTool === 'search') {
          return 'rect';
        }
        if (currentTool === 'color-picker') {
          return 'cursor';
        }
        return currentTool;
      })(),
      attachment_image_url: imageUrl,
    };

    onAnnotationCreate(newAnnotation);
    resetImageAnnotation();
    setUploadedImageUrl('');
    setImageSource({ type: 'upload' }); // 重置图片来源
  };

  const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    setIsDragging(true);
    setStartPos({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!isDragging) {
      return;
    }
    setPosition({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y,
    });
  };

  const handleMouseUp: React.MouseEventHandler<HTMLDivElement> = () => {
    setIsDragging(false);
  };

  const handleSearchSubmit = () => {
    if (!currentRect || !onSearchRequest) {
      return;
    }

    // 设置搜索上下文为注释模式
    setSearchContext({
      source: 'annotation',
      annotationRect: currentRect,
    });

    // 立即切换到搜索面板
    if (onSwitchToSearchPanel) {
      onSwitchToSearchPanel();
    }

    // 触发搜索请求，传递方框的坐标信息
    onSearchRequest({
      x: currentRect.x,
      y: currentRect.y,
      width: currentRect.width,
      height: currentRect.height,
    });

    // 不关闭对话框，保持注释功能完整
    // 用户仍然可以继续使用发送按钮进行注释
  };

  // 处理引用图片添加
  const handleReferenceImageAdd = useCallback((imageData: { s3Path: string; filename: string }) => {
    // 清空上传的URL，因为我们将使用S3路径
    setUploadedImageUrl('');
    setImageSource({
      type: 'reference',
      s3Path: imageData.s3Path,
      filename: imageData.filename,
    });
  }, []);

  // 监听引用图片添加事件
  useEffect(() => {
    const handleAddReferenceImage = (event: CustomEvent) => {
      const imageData = event.detail as { s3Path: string; filename: string };
      handleReferenceImageAdd(imageData);
    };

    window.addEventListener('addReferenceImage', handleAddReferenceImage as EventListener);

    return () => {
      window.removeEventListener('addReferenceImage', handleAddReferenceImage as EventListener);
    };
  }, [handleReferenceImageAdd]);

  const uploadStatusText = useMemo(() => {
    if (isUploading) {
      return <span className="text-xs text-muted-foreground">アップロード中...</span>;
    }

    // 检查是否有图片（上传的或引用的）
    const hasImage = uploadedImageUrl || (imageSource.type === 'reference' && referenceImageUrl);

    if (hasImage) {
      if (imageSource.type === 'reference') {
        return (
          <span className="flex items-center gap-0.5 text-blue-600 text-xs">
            <LuCheck className="w-3 h-3" />
            参考画像: {imageSource.filename}
          </span>
        );
      } else {
        return (
          <span className="flex items-center gap-0.5 text-green-600 text-xs">
            <LuCheck className="w-3 h-3" />
            アップロード完了
          </span>
        );
      }
    }
    return (
      <span className="flex items-center gap-1 text-xs text-primary">
        <LuImage className="w-3 h-3" />
        画像を選択
      </span>
    );
  }, [isUploading, uploadedImageUrl, imageSource.type, imageSource.filename, referenceImageUrl]);

  return (
    <div
      ref={dialogRef}
      className={clsx(
        'absolute bg-background shadow-md rounded-md p-2 border active:cursor-grabbing cursor-grab z-50',
        (!isShowingAnnotationInput || !currentRect) && 'hidden',
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${DIALOG_SIZE.width}px`,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <TextArea
        ref={textAreaRef}
        id="annotation-text"
        value={currentText}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onChange={(e) => setCurrentText(e.target.value)}
        placeholder="コメントを入力"
        className="z-50 h-16 mb-2 text-sm resize-none w-44"
        disabled={isSubmitting}
      />

      <div className="mb-2">
        <label
          className={clsx(
            'cursor-pointer',
            (isUploading || !!uploadedImageUrl || isSubmitting) && 'cursor-not-allowed opacity-60',
          )}
        >
          <div className="flex items-center justify-center w-full h-6 text-xs transition-colors border border-dashed rounded-md hover:bg-accent/50">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isUploading || !!uploadedImageUrl || isSubmitting}
            />
            {uploadStatusText}
          </div>
        </label>
      </div>

      <div className="flex items-center justify-between gap-1">
        <Button
          type="button"
          onClick={() => {
            resetImageAnnotation();
            setUploadedImageUrl('');
          }}
          variant="ghost"
          size="xs"
          className="px-2 hover:bg-destructive/10 hover:text-destructive"
          disabled={isSubmitting}
        >
          キャンセル
        </Button>
        <div className="flex items-center gap-1">
          <Button
            onClick={() => handleAnnotationSubmit('annotation')}
            size="xs"
            className="p-2"
            disabled={!currentText.trim() || isUploading || isSubmitting}
            title="通常送信"
          >
            {isSubmitting && currentSubmitType === 'annotation' ? (
              <LuLoader className="size-4 animate-spin" />
            ) : (
              <LuSend className="size-4" />
            )}
          </Button>
          <Button
            onClick={handleSearchSubmit}
            size="xs"
            className="p-2"
            disabled={!currentRect || isSubmitting}
            title="類似検索"
          >
            <LuSearch className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
