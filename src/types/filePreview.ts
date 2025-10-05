// File preview types for unified upload confirmation system

export type FilePreviewType = 'image' | 'video' | 'document' | 'pptx';

export type FilePreviewStatus = 'pending' | 'confirmed' | 'uploading' | 'uploaded' | 'error';

export interface PreviewFile {
  id: string;
  file: File;
  type: FilePreviewType;
  previewUrl?: string; // For images/videos using URL.createObjectURL
  previewIcon?: string; // For documents, icon identifier
  status: FilePreviewStatus;
  uploadProgress?: number;
  error?: string;
  metadata?: {
    size: number;
    lastModified: number;
    formattedSize: string;
    extension: string;
  };
  // Folder upload support
  folderPath?: string; // Folder path like "folder1/subfolder"
  folderName?: string; // Display name for the folder
  relativePath?: string; // webkitRelativePath from File input
}

export interface FilePreviewGroup {
  type: FilePreviewType;
  files: PreviewFile[];
  displayName: string; // Japanese label for the file type group
}

// Folder-aware file grouping
export interface FolderFileGroup {
  folderPath: string;
  folderName: string;
  fileGroups: FilePreviewGroup[]; // File type groups within this folder
  totalFiles: number;
}

export interface UploadConfirmationResult {
  confirmedFiles: PreviewFile[];
  totalSize: number;
  totalCount: number;
  // Folder structure information for folder uploads
  folderStructure?: {
    [folderPath: string]: {
      mediaFiles: PreviewFile[];
      pptxFiles: PreviewFile[];
      documentFiles: PreviewFile[];
    };
  };
}

// File type detection utilities
export const FILE_TYPE_CONFIG = {
  image: {
    mimeTypes: ['image/'],
    extensions: ['.ai', '.psd'],
    displayName: '画像ファイル',
    maxSize: 100 * 1024 * 1024, // 100MB
    accept: 'image/*,.ai,.psd',
  },
  video: {
    mimeTypes: ['video/'],
    extensions: [],
    displayName: '動画ファイル',
    maxSize: 1000 * 1024 * 1024, // 1000MB
    accept: 'video/*',
  },
  pptx: {
    mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    extensions: ['.pptx'],
    displayName: 'PowerPoint ファイル',
    maxSize: 200 * 1024 * 1024, // 200MB
    accept: '.pptx',
  },
  document: {
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
    extensions: ['.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'],
    displayName: 'ドキュメントファイル',
    maxSize: 200 * 1024 * 1024, // 200MB
    accept: '.doc,.docx,.xls,.xlsx,.csv,.txt',
  },
} as const;
