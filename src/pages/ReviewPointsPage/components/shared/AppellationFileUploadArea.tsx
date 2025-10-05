import { Upload, X } from 'lucide-react';
import React from 'react';

import type { AppellationFileInfo } from './types';

// 称呼表文件上传组件的プロップス
interface AppellationFileUploadAreaProps {
  appellationFile: AppellationFileInfo | null;
  onFileUpload: (file: File) => void;
  onRemoveFile: () => void;
}

export function AppellationFileUploadArea({
  appellationFile,
  onFileUpload,
  onRemoveFile,
}: AppellationFileUploadAreaProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleAppellationFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
    // Reset input value to allow re-uploading the same file
    e.target.value = '';
  };

  const handleAppellationDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleAppellationDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
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
      onFileUpload(files[0]);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-900">称呼表ファイル</span>
        <span className="text-xs text-gray-500">必須</span>
      </div>

      {/* Format Instructions */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-xs font-semibold text-blue-900 mb-2">📋 ファイル形式について</h4>
        <div className="space-y-2 text-xs text-blue-800">
          <div>
            <strong>Excel形式 (.xlsx, .xls):</strong>
            <div className="mt-1 ml-2">
              • 第一行と第一列に角色名を記入
              <br />
              • 行＝話し手、列＝相手への称呼
              <br />• 対角線は第一人称（自分への呼び方）
            </div>
          </div>
          <div className="mt-2">
            <strong>JSON形式:</strong>
            <code className="block mt-1 p-2 bg-white rounded text-xs overflow-x-auto">
              {JSON.stringify({ A: { A: '私', B: 'Aさん' }, B: { A: 'Bさん', B: '僕' } }, null, 0)}
            </code>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      {!appellationFile ? (
        <div
          className={`flex-1 flex items-center justify-center border-2 border-dashed rounded-lg transition-colors ${
            isDragOver
              ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50'
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          }`}
          onDragOver={handleAppellationDragOver}
          onDragLeave={handleAppellationDragLeave}
          onDrop={handleDrop}
        >
          <label className="cursor-pointer block text-center">
            <input
              type="file"
              accept=".xlsx,.xls,.json"
              onChange={handleAppellationFileInputChange}
              className="hidden"
            />
            <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
            <div className={`text-sm font-medium mb-1 ${isDragOver ? 'text-blue-700' : 'text-gray-700'}`}>
              {isDragOver ? 'ファイルをドロップしてください' : 'ファイルを選択またはドラッグ&ドロップ'}
            </div>
            <div className="text-xs text-gray-500">Excel (.xlsx, .xls) または JSON ファイル</div>
          </label>
        </div>
      ) : (
        /* File info display */
        <div className="flex-1 flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-green-900">{appellationFile.name}</div>
              <div className="text-xs text-green-700">
                {appellationFile.status === 'uploading' && 'アップロード中...'}
                {appellationFile.status === 'completed' && 'アップロード完了'}
                {appellationFile.status === 'error' && `エラー: ${appellationFile.error}`}
              </div>
            </div>
          </div>
          <button
            onClick={onRemoveFile}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// 称呼表预览组件
interface AppellationPreviewProps {
  appellationFile: AppellationFileInfo;
}

export function AppellationPreview({ appellationFile }: AppellationPreviewProps) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
          <Upload className="w-4 h-4 text-green-600" />
        </div>
        <div>
          <div className="text-sm font-medium text-gray-800">{appellationFile.name}</div>
          <div className="text-xs text-gray-600">
            {appellationFile.type === 'excel' ? 'Excel形式' : 'JSON形式'} •
            {appellationFile.status === 'completed' ? 'アップロード完了' : appellationFile.status}
          </div>
        </div>
      </div>
      {appellationFile.status === 'error' && appellationFile.error && (
        <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded border border-red-200">
          エラー: {appellationFile.error}
        </div>
      )}
    </div>
  );
}
