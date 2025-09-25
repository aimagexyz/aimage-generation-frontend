import { Progress } from '@/components/ui/Progress';

interface UploadProgressProps {
  uploading: boolean;
  uploadStatus: string;
  uploadProgress: number;
  currentFileName: string;
}

export function UploadProgress({ uploading, uploadStatus, uploadProgress, currentFileName }: UploadProgressProps) {
  if (!uploading) {
    return null;
  }

  return (
    <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{uploadStatus}</p>
        </div>
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{uploadProgress}%</span>
      </div>
      <Progress value={uploadProgress} className="h-2 mb-2" />
      {currentFileName && (
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">処理中: {currentFileName}</p>
      )}
      {/* Show additional time estimation info when available */}
      {uploadStatus.includes('残り') && (
        <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
          ⏱️ 予想残り時間を表示中（30枚約10秒の実績データに基づく）
        </div>
      )}
    </div>
  );
}
