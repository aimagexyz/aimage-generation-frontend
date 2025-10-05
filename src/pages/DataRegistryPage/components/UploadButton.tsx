import { Button } from '@/components/ui/Button';

interface UploadButtonProps {
  selectedFilesCount: number;
  uploading: boolean;
  onUpload: () => void;
}

export function UploadButton({ selectedFilesCount, uploading, onUpload }: UploadButtonProps) {
  if (selectedFilesCount === 0) {
    return null;
  }

  return (
    <Button
      onClick={onUpload}
      disabled={uploading || selectedFilesCount === 0}
      size="sm"
      className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white"
    >
      {uploading ? '処理中...' : `アップロード (${selectedFilesCount})`}
    </Button>
  );
}
