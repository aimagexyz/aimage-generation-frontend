import { Loader2 } from 'lucide-react';
import { LuUpload, LuX } from 'react-icons/lu';

import type { CharacterDetail } from '@/api/charactersService';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

interface UploadImageModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedFile: File | undefined;
  setSelectedFile: (file: File | undefined) => void;
  selectedCharacter: CharacterDetail | null;
  handleUploadImage: () => void;
  isUploading: boolean;
  dragActive: boolean;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileButtonClick: () => void;
}

export function UploadImageModal({
  isOpen,
  onOpenChange,
  selectedFile,
  setSelectedFile,
  selectedCharacter,
  handleUploadImage,
  isUploading,
  dragActive,
  handleDrag,
  handleDrop,
  handleFileButtonClick,
}: UploadImageModalProps): JSX.Element {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>画像をアップロード</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 overflow-hidden bg-gray-100 rounded-lg">
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="プレビュー"
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedFile(undefined)}>
                  <LuX className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <p className="text-sm text-blue-700">
                  この画像を
                  <span className="font-semibold"> {selectedCharacter?.name} </span>
                  の画像としてアップロードします。
                </p>
              </div>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <LuUpload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="mb-2 text-gray-600">画像をドラッグ&ドロップするか、クリックして選択してください</p>
              <Button variant="outline" onClick={handleFileButtonClick}>
                ファイルを選択
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            キャンセル
          </Button>
          <Button onClick={handleUploadImage} disabled={isUploading || !selectedFile}>
            {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isUploading ? 'アップロード中...' : 'アップロードする'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
