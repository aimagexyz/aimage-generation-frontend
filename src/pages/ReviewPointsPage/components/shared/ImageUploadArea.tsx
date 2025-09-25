import { Copy, Image as ImageIcon, RefreshCw, Upload, X } from 'lucide-react';
import React from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/Button';
import { useAsset } from '@/hooks/useAsset';

import type { ImageInfo } from './types';

// 画像アップロードエリアコンポーネントのプロップス
interface ImageUploadAreaProps {
  images: ImageInfo[];
  onImageUpload: (files: FileList | null) => void;
  onRemoveImage: (index: number) => void;
  onImageClick: (event: React.MouseEvent, index: number) => void;
  selectedImageIndex: number | null;
  tooltipPosition: { x: number; y: number } | null;
  getImageDescription: (imageId: string) => string;
  onCopyDescription: (description: string) => Promise<void>;
  onRegenerateDescription: (imageId: string) => void;
}

export function ImageUploadArea({
  images,
  onImageUpload,
  onRemoveImage,
  onImageClick,
  selectedImageIndex,
  tooltipPosition,
  getImageDescription,
  onCopyDescription,
  onRegenerateDescription,
}: ImageUploadAreaProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onImageUpload(e.target.files);
    // Reset input value to allow re-uploading the same file
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onImageUpload(files);
    }
  };

  const renderImageContent = (image: ImageInfo, index: number) => {
    if (image.preview) {
      return (
        <img
          src={image.preview}
          alt={`アップロード画像 ${index + 1}`}
          className="w-full h-full object-cover transition-all duration-200"
        />
      );
    } else if (image.s3Url) {
      return (
        <img
          src={image.s3Url}
          alt={`参考画像 ${index + 1}`}
          className="w-full h-full object-cover transition-all duration-200"
        />
      );
    } else {
      return (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-gray-50 to-gray-100">
          <ImageIcon className="w-5 h-5 mb-1 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
        </div>
      );
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg h-full overflow-hidden transition-all duration-200 ${
        isDragOver
          ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50'
          : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {images.length === 0 ? (
        // アップロード前の状態
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <div className="mb-4">
            <Upload
              className={`mx-auto h-10 w-10 transition-colors ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`}
            />
          </div>
          <div className="mb-4">
            <p className={`text-sm font-medium transition-colors ${isDragOver ? 'text-blue-700' : 'text-gray-700'}`}>
              {isDragOver ? '画像をドロップしてください' : '参考画像をドラッグ&ドロップ'}
            </p>
            <p className="text-xs text-gray-500 mt-1">またはクリックして画像を追加 (JPG, PNG, GIF)</p>
          </div>
          {!isDragOver && (
            <label className="cursor-pointer">
              <input type="file" multiple accept="image/*" onChange={handleFileInput} className="hidden" />
              <Button
                variant="outline"
                size="sm"
                className="pointer-events-none text-xs px-4 py-2 border-gray-300 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                <Upload className="w-3 h-3 mr-2" />
                ファイルを選択
              </Button>
            </label>
          )}
        </div>
      ) : (
        // アップロード後のギャラリー表示
        <div className="h-full flex flex-col">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-2 border-b bg-gray-50">
            <span className="text-xs font-medium text-gray-600">画像 ({images.length})</span>
            <label className="cursor-pointer">
              <input type="file" multiple accept="image/*" onChange={handleFileInput} className="hidden" />
              <Button variant="outline" size="sm" className="pointer-events-none text-xs px-2 py-1 h-6">
                <Upload className="w-3 h-3 mr-1" />
                追加
              </Button>
            </label>
          </div>

          {/* スクロール可能な画像グリッド */}
          <div className="flex-1 overflow-y-auto p-3 relative">
            <div className="grid grid-cols-3 gap-3">
              {images.map((image, index) => {
                const isSelected = selectedImageIndex === index;

                // 如果是现有图片，使用专门的组件
                if (image.isExisting && image.s3Path) {
                  return (
                    <ExistingImageItem
                      key={index}
                      s3Path={image.s3Path}
                      imageInfo={image}
                      index={index}
                      isSelected={isSelected}
                      onImageClick={onImageClick}
                      onRemoveImage={onRemoveImage}
                    />
                  );
                }

                // 新上传的图片使用原有逻辑
                return (
                  <div key={index} className="relative">
                    <div
                      className={`relative group border-2 rounded-xl overflow-hidden aspect-square bg-gradient-to-br from-gray-50 to-gray-100 hover:shadow-md transition-all duration-200 ${
                        image.status === 'uploading' || image.status === 'generating'
                          ? 'cursor-not-allowed pointer-events-none'
                          : 'cursor-pointer'
                      } ${isSelected ? 'border-blue-400 shadow-lg' : 'border-gray-200'}`}
                      onClick={(e) =>
                        image.status === 'completed' || image.status === 'error' ? onImageClick(e, index) : undefined
                      }
                    >
                      {/* 真实的画像表示 */}
                      <div className="relative w-full h-full overflow-hidden">
                        {renderImageContent(image, index)}

                        {/* 加载状态覆盖层 */}
                        {(image.status === 'uploading' || image.status === 'generating') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                            <div className="flex flex-col items-center space-y-2">
                              <RefreshCw className="w-6 h-6 text-white animate-spin" />
                              <span className="text-xs text-white font-medium bg-black bg-opacity-50 px-2 py-1 rounded">
                                {image.status === 'uploading' ? 'アップロード中...' : '説明生成中...'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 错误状态覆盖层 */}
                        {image.status === 'error' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-20">
                            <div className="flex flex-col items-center space-y-2">
                              <X className="w-6 h-6 text-red-500" />
                              <span className="text-xs text-red-600 font-medium bg-white bg-opacity-90 px-2 py-1 rounded">
                                エラー
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 图片编号覆盖层 */}
                        <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 rounded-md">
                          #{index + 1}
                        </div>
                      </div>
                      {/* 削除ボタン */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveImage(index);
                        }}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform hover:scale-110 z-10"
                      >
                        <X className="w-4 h-4 text-white hover:text-red-200 drop-shadow-lg" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ドラッグオーバー時のオーバーレイ */}
          {isDragOver && (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 bg-opacity-95 flex items-center justify-center border-2 border-dashed border-blue-400 rounded-lg backdrop-blur-sm">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-blue-500 mb-3 animate-bounce" />
                <p className="text-base text-blue-700 font-semibold">画像をドロップして追加</p>
                <p className="text-sm text-blue-600 mt-1">複数ファイルの同時アップロードに対応</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 气泡显示 - 使用 Portal 渲染到 body 顶层 */}
      {selectedImageIndex !== null &&
        images[selectedImageIndex] &&
        tooltipPosition &&
        createPortal(
          <>
            {/* 背景遮罩 - 点击关闭气泡 */}
            <div
              onClick={(e) => onImageClick(e, -1)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 2147483646,
                backgroundColor: 'transparent',
                pointerEvents: 'auto',
              }}
            />
            <div
              className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4"
              style={{
                position: 'fixed',
                top: `${tooltipPosition.y}px`,
                left: `${tooltipPosition.x}px`,
                width: '20rem',
                maxHeight: '24rem',
                zIndex: 2147483647,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                pointerEvents: 'auto',
                overflow: 'visible',
                userSelect: 'text',
                WebkitUserSelect: 'text',
                MozUserSelect: 'text',
                msUserSelect: 'text',
              }}
              onWheel={(e) => {
                e.stopPropagation();
              }}
            >
              {/* 关闭按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onImageClick(e, -1);
                }}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                style={{ userSelect: 'none' }}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-3">
                <div
                  className="text-sm text-gray-700 leading-relaxed overflow-y-scroll border border-gray-100 rounded p-2 bg-gray-50"
                  style={{
                    height: '8rem',
                    scrollbarWidth: 'auto',
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                    MozUserSelect: 'text',
                    msUserSelect: 'text',
                  }}
                  onWheel={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {getImageDescription(images[selectedImageIndex].id)}
                </div>

                {/* 根据状态显示不同的操作按钮 */}
                {images[selectedImageIndex].status === 'completed' && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => void onCopyDescription(getImageDescription(images[selectedImageIndex].id))}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                    <button
                      onClick={() => onRegenerateDescription(images[selectedImageIndex].id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      再生成
                    </button>
                  </div>
                )}

                {/* 错误状态显示重试按钮 */}
                {images[selectedImageIndex].status === 'error' && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => onRegenerateDescription(images[selectedImageIndex].id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      再試行
                    </button>
                  </div>
                )}

                {/* 生成中状态显示进度 */}
                {(images[selectedImageIndex].status === 'uploading' ||
                  images[selectedImageIndex].status === 'generating') && (
                  <div className="flex justify-center pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      {images[selectedImageIndex].status === 'uploading' ? 'アップロード中...' : '説明生成中...'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>,
          document.documentElement,
        )}
    </div>
  );
}

// 现有图片显示组件
interface ExistingImageItemProps {
  s3Path: string;
  imageInfo: ImageInfo;
  index: number;
  isSelected: boolean;
  onImageClick: (event: React.MouseEvent, index: number) => void;
  onRemoveImage: (index: number) => void;
}

function ExistingImageItem({
  s3Path,
  imageInfo,
  index,
  isSelected,
  onImageClick,
  onRemoveImage,
}: ExistingImageItemProps) {
  const { assetUrl, isAssetLoading } = useAsset(s3Path);

  const handleClick = (e: React.MouseEvent) => {
    if (imageInfo.status === 'completed' || imageInfo.status === 'error') {
      onImageClick(e, index);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveImage(index);
  };

  return (
    <div className="relative">
      <div
        className={`relative group border-2 rounded-xl overflow-hidden aspect-square bg-gradient-to-br from-gray-50 to-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer
          ${isSelected ? 'border-blue-400 shadow-lg' : 'border-gray-200'}`}
        onClick={handleClick}
      >
        {/* 图片内容 */}
        <div className="relative w-full h-full overflow-hidden">
          {(() => {
            if (isAssetLoading) {
              return (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              );
            }

            if (assetUrl) {
              return (
                <img
                  src={assetUrl}
                  alt={`参考画像 ${index + 1}`}
                  className="w-full h-full object-cover transition-all duration-200"
                />
              );
            }

            return (
              <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-gray-50 to-gray-100">
                <ImageIcon className="w-5 h-5 mb-1 text-gray-400" />
                <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
              </div>
            );
          })()}

          {/* 图片编号覆盖层 */}
          <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 rounded-md">
            #{index + 1}
          </div>
        </div>

        {/* 删除按钮 */}
        <button
          onClick={handleRemove}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform hover:scale-110 z-10"
        >
          <X className="w-4 h-4 text-white hover:text-red-200 drop-shadow-lg" />
        </button>
      </div>
    </div>
  );
}
