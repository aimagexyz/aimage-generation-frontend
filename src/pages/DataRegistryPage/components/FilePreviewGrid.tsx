import { FileImage, X } from 'lucide-react';

import { getFileDisplayName, isSpecialImageFile } from '@/utils/fileUtils';

interface UploadedFile extends File {
  preview: string;
}

interface FilePreviewGridProps {
  selectedFiles: UploadedFile[];
  onRemoveFile: (index: number) => void;
}

export function FilePreviewGrid({ selectedFiles, onRemoveFile }: FilePreviewGridProps) {
  if (selectedFiles.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 gap-2">
        {selectedFiles.map((file, index) => (
          <div key={index} className="relative group">
            <div className="aspect-square overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700">
              {isSpecialImageFile(file) ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 p-2">
                  <FileImage className="h-8 w-8 mb-2" />
                  <span className="text-xs font-medium text-center break-all">{getFileDisplayName(file.name, 15)}</span>
                </div>
              ) : (
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const container = target.parentElement;
                    if (container) {
                      container.innerHTML = `
                        <div class="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 p-2">
                          <svg class="h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span class="text-xs font-medium text-center break-all">${getFileDisplayName(file.name, 15)}</span>
                        </div>
                      `;
                    }
                  }}
                />
              )}
            </div>
            <button
              onClick={() => onRemoveFile(index)}
              className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-2 w-2" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
