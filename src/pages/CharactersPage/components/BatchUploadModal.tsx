import { FileImage } from 'lucide-react';
import { LuTrash2, LuUpload, LuX } from 'react-icons/lu';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Progress } from '@/components/ui/Progress';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { getFileDisplayName, isSpecialImageFile } from '@/utils/fileUtils';

interface BatchUploadModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: File[];
  onFilesChange: (files: File[]) => void;
  onUpload: () => void;
  onRemoveFile: (index: number) => void;
  isUploading: boolean;
  uploadProgress: number;
  uploadStatus: string;
  characterName?: string;
}

export function BatchUploadModal({
  isOpen,
  onOpenChange,
  selectedFiles,
  onFilesChange,
  onUpload,
  onRemoveFile,
  isUploading,
  uploadProgress,
  uploadStatus,
  characterName,
}: BatchUploadModalProps): JSX.Element {
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      onFilesChange([...selectedFiles, ...newFiles]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <LuUpload className="h-5 w-5" />
            複数画像アップロード
            {characterName && <span className="text-sm font-normal text-muted-foreground">- {characterName}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden">
          {/* File Selection Area */}
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center flex-shrink-0">
            <input
              type="file"
              multiple
              accept="image/*,.ai"
              onChange={handleFileSelect}
              className="hidden"
              id="batch-file-input"
              disabled={isUploading}
            />
            <label htmlFor="batch-file-input" className="cursor-pointer">
              <LuUpload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">追加でファイルを選択</p>
              <p className="text-sm text-muted-foreground">複数の画像ファイルを選択できます</p>
            </label>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">選択されたファイル ({selectedFiles.length}個)</h3>
                <div className="text-sm text-muted-foreground">
                  合計サイズ: {formatFileSize(selectedFiles.reduce((total, file) => total + file.size, 0))}
                </div>
              </div>

              <ScrollArea className="h-60 w-full">
                <div className="space-y-2 pr-4">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {(() => {
                          if (isSpecialImageFile(file)) {
                            return (
                              <div className="h-10 w-10 rounded border flex items-center justify-center bg-muted">
                                <FileImage className="h-6 w-6 text-muted-foreground" />
                              </div>
                            );
                          }
                          if (file.type.startsWith('image/')) {
                            return (
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="h-10 w-10 object-cover rounded border"
                                onLoad={() => URL.revokeObjectURL(URL.createObjectURL(file))}
                              />
                            );
                          }
                          return (
                            <div className="h-10 w-10 rounded border flex items-center justify-center bg-muted">
                              <FileImage className="h-6 w-6 text-muted-foreground" />
                            </div>
                          );
                        })()}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" title={file.name}>
                            {getFileDisplayName(file.name, 40)}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      {!isUploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveFile(index)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <LuTrash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">アップロード進行状況</span>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
              {uploadStatus && <p className="text-sm text-muted-foreground">{uploadStatus}</p>}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            <LuX className="h-4 w-4 mr-2" />
            キャンセル
          </Button>
          <Button onClick={onUpload} disabled={selectedFiles.length === 0 || isUploading} className="min-w-[120px]">
            {isUploading ? (
              <>
                <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                アップロード中...
              </>
            ) : (
              <>
                <LuUpload className="h-4 w-4 mr-2" />
                アップロード ({selectedFiles.length}個)
              </>
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground border-t pt-4 flex-shrink-0">
          <p>• 最大10個のファイルまで同時にアップロードできます</p>
          <p>• サポートされている形式: JPG, PNG, GIF, WebP</p>
          <p>• 各ファイルの最大サイズ: 10MB</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
