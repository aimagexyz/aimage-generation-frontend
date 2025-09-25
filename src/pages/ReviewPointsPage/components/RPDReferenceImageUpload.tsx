import { Eye, ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { LuEye, LuRotateCw, LuTrash2, LuUpload } from 'react-icons/lu';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Progress } from '@/components/ui/Progress';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useAsset } from '@/hooks/useAsset';

import { type UploadedRPDImage, useRPDFileManagement } from '../hooks/useRPDFileManagement';

interface RPDReferenceImageUploadProps {
  projectId: string;
  onImagesChange: (s3Paths: string[]) => void;
  value?: string[]; // Current reference image S3 paths
}

interface EyeButtonProps {
  image: UploadedRPDImage;
  onImageClick: (url: string) => void;
}

interface ImagePreviewProps {
  image: UploadedRPDImage;
  onImageClick: (url: string) => void;
}

function ImagePreview({ image, onImageClick }: ImagePreviewProps) {
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 对于已存在的S3图片，使用useAsset hook获取预签名URL
  const shouldUseAsset = image.isExisting && image.s3_path;
  const { assetUrl, isAssetLoading } = useAsset(shouldUseAsset ? (image.s3_path ?? '') : '');

  // 确定要使用的图片URL和loading状态
  let imageUrl = '';
  let isActuallyLoading = false;

  if (image.previewUrl) {
    // 新上传图片的本地预览URL - 立即可用，不需要loading
    imageUrl = image.previewUrl;
    // isActuallyLoading 保持默认值 false
  } else if (shouldUseAsset) {
    // 已存在的S3图片 - 需要等待useAsset
    imageUrl = assetUrl || '';
    isActuallyLoading = isAssetLoading;
  } else if (image.url) {
    // 已上传图片
    imageUrl = image.url;
    isActuallyLoading = imageUrl ? isLoading : false;
  }

  const altText = image.file?.name || image.displayName || 'Reference image';

  const handleImageLoad = () => {
    setIsLoading(false);
    setImageLoadError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setImageLoadError(true);
  };

  const handleClick = () => {
    if (imageUrl && !imageLoadError) {
      onImageClick(imageUrl);
    }
  };

  return (
    <div className="relative w-16 h-16 overflow-hidden border border-gray-200 rounded-lg cursor-pointer group bg-gray-100">
      {isActuallyLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isActuallyLoading && imageUrl && !imageLoadError && (
        <img
          src={imageUrl}
          alt={altText}
          className="w-full h-full object-cover cursor-pointer group-hover:opacity-80 transition-opacity"
          onClick={handleClick}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}

      {!isActuallyLoading && (!imageUrl || imageLoadError) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
      )}

      {/* Hover overlay with action indicators */}
      {imageUrl && !imageLoadError && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Eye className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
}

function EyeButton({ image, onImageClick }: EyeButtonProps) {
  // 对于已存在的S3图片，使用useAsset hook获取预签名URL
  const shouldUseAsset = image.isExisting && image.s3_path;
  const { assetUrl, isAssetLoading } = useAsset(shouldUseAsset ? (image.s3_path ?? '') : '');

  // 确定要使用的图片URL - 与ImagePreview保持一致
  let imageUrl = '';
  if (image.previewUrl) {
    // 新上传图片的本地预览URL
    imageUrl = image.previewUrl;
  } else if (shouldUseAsset) {
    // 已存在的S3图片
    imageUrl = assetUrl || '';
  } else if (image.url) {
    // 已上传图片
    imageUrl = image.url;
  }

  const handleClick = () => {
    if (imageUrl) {
      onImageClick(imageUrl);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={isAssetLoading || !imageUrl}
      className="text-blue-600 border-blue-200 hover:bg-blue-50"
    >
      <LuEye className="w-4 h-4" />
    </Button>
  );
}

export function RPDReferenceImageUpload({
  projectId,
  onImagesChange,
  value = [], // Current reference image S3 paths
}: RPDReferenceImageUploadProps): JSX.Element {
  const fileManagement = useRPDFileManagement(projectId, onImagesChange, value);

  return (
    <div className="space-y-4">
      {/* Enhanced Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          fileManagement.dragActive
            ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
        }`}
        onDragEnter={fileManagement.handleDrag}
        onDragLeave={fileManagement.handleDrag}
        onDragOver={fileManagement.handleDrag}
        onDrop={fileManagement.handleDrop}
      >
        <input
          ref={fileManagement.fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={fileManagement.handleFileSelect}
          className="hidden"
          id="rpd-image-upload"
        />

        <div className="cursor-pointer" onClick={fileManagement.handleFileButtonClick}>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl">
            <LuUpload className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Upload Reference Images</h3>
          <p className="text-gray-600 mb-2">Drag and drop images here, or click to select files</p>
          <p className="text-sm text-gray-500">
            These images will help the AI understand what to look for during review
          </p>
          <div className="mt-4">
            <Button type="button" variant="outline" size="sm" className="shadow-sm">
              <LuUpload className="w-4 h-4 mr-2" />
              Choose Files
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Actions Bar */}
      {fileManagement.hasPendingImages && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-700">
              <LuRotateCw className="w-5 h-5" />
              <span className="font-medium">
                {fileManagement.pendingCount} image{fileManagement.pendingCount > 1 ? 's' : ''} ready to upload
              </span>
            </div>
            <Button
              type="button"
              onClick={() => void fileManagement.uploadAllPending()}
              disabled={
                fileManagement.isUploading || fileManagement.isBatchUploadPending || fileManagement.isBatchUploading
              }
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {fileManagement.isBatchUploading ? (
                <>
                  <LuRotateCw className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>Upload All ({fileManagement.pendingCount})</>
              )}
            </Button>
          </div>

          {/* Batch Upload Progress */}
          {fileManagement.isBatchUploading && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-600 font-medium">{fileManagement.batchUploadStatus}</span>
                <span className="text-sm text-blue-600">{fileManagement.batchUploadProgress}%</span>
              </div>
              <Progress value={fileManagement.batchUploadProgress} className="h-2" />
            </div>
          )}
        </div>
      )}

      {/* Enhanced Image List */}
      {fileManagement.images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-800">Selected Images ({fileManagement.images.length})</h4>
            {fileManagement.hasUploadedImages && (
              <span className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full">
                {fileManagement.uploadedCount} uploaded
              </span>
            )}
          </div>

          <ScrollArea className="max-h-80">
            <div className="space-y-3">
              {fileManagement.images.map((image) => (
                <div
                  key={image.id}
                  className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Enhanced Image Preview with Error Handling */}
                  <ImagePreview image={image} onImageClick={fileManagement.handleImageClick} />

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {image.file?.name || image.displayName || 'Reference Image'}
                      </p>
                      {image.s3_path && (
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full font-medium">
                          {image.isExisting ? '✓ Current' : '✓ Uploaded'}
                        </span>
                      )}
                    </div>
                    {image.file && (
                      <p className="text-xs text-gray-500 mb-2">{fileManagement.formatFileSize(image.file.size)}</p>
                    )}

                    {/* Upload Progress */}
                    {image.isUploading && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-blue-600 font-medium">Uploading...</span>
                          <span className="text-xs text-blue-600">{image.uploadProgress || 0}%</span>
                        </div>
                        <Progress value={image.uploadProgress || 0} className="h-2" />
                      </div>
                    )}

                    {/* Error Message */}
                    {image.error && (
                      <div className="flex items-center gap-1 text-red-600">
                        <span className="text-xs font-medium">{image.error}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {image.s3_path && <EyeButton image={image} onImageClick={fileManagement.handleImageClick} />}

                    {!image.s3_path && image.error && image.file && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void fileManagement.uploadImage(image.id)}
                        disabled={fileManagement.isUploading || fileManagement.isBatchUploadPending}
                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                      >
                        <LuRotateCw className="w-4 h-4 mr-1" />
                        Retry
                      </Button>
                    )}

                    {!image.s3_path && !image.error && !image.isUploading && image.file && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void fileManagement.uploadImage(image.id)}
                        disabled={fileManagement.isUploading || fileManagement.isBatchUploadPending}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <LuUpload className="w-4 h-4 mr-1" />
                        Upload
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => fileManagement.removeImage(image.id)}
                      disabled={image.isUploading}
                      className="text-red-600 hover:bg-red-50"
                      title={image.isExisting ? 'Remove existing reference image' : 'Remove new image'}
                    >
                      <LuTrash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Success Summary */}
      {fileManagement.hasUploadedImages && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-2 text-green-700">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <p className="font-medium">{fileManagement.uploadedCount} image(s) ready for AI review!</p>
          </div>
          <p className="text-sm text-green-600 mt-1 ml-7">
            {(() => {
              if (fileManagement.existingCount > 0 && fileManagement.uploadedCount > fileManagement.existingCount) {
                return `${fileManagement.existingCount} existing + ${fileManagement.uploadedCount - fileManagement.existingCount} new images`;
              }
              if (fileManagement.existingCount > 0 && fileManagement.uploadedCount === fileManagement.existingCount) {
                return `${fileManagement.existingCount} existing images loaded`;
              }
              return 'New images uploaded successfully';
            })()}{' '}
            - these will be used for AI review when this RPD version is active.
          </p>
        </div>
      )}

      {/* Image Preview Modal */}
      <Dialog open={fileManagement.isImageModalOpen} onOpenChange={fileManagement.handleCloseImageModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl font-semibold">Reference Image Preview</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            {fileManagement.selectedImageUrl && (
              <div className="flex items-center justify-center h-[70vh] rounded-lg bg-gray-50">
                <img
                  src={fileManagement.selectedImageUrl}
                  alt="Reference image preview"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
