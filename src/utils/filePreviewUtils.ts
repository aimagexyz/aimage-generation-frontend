import { FILE_TYPE_CONFIG, type FilePreviewGroup, type FilePreviewType, type PreviewFile } from '@/types/filePreview';
import type { FolderGroup } from '@/utils/folderUtils';

/**
 * Format file size to human readable string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Detect file type based on MIME type and extension
 */
export const detectFileType = (file: File): FilePreviewType => {
  const fileName = file.name.toLowerCase();

  // Check by MIME type first
  for (const [type, config] of Object.entries(FILE_TYPE_CONFIG)) {
    if (config.mimeTypes.some((mimeType) => file.type.startsWith(mimeType))) {
      return type as FilePreviewType;
    }
  }

  // Fallback to extension check
  for (const [type, config] of Object.entries(FILE_TYPE_CONFIG)) {
    if (config.extensions.some((ext) => fileName.endsWith(ext))) {
      return type as FilePreviewType;
    }
  }

  // Default to document if unknown
  return 'document';
};

/**
 * Validate file against type constraints
 */
export const validateFile = (file: File, type: FilePreviewType): { isValid: boolean; error?: string } => {
  const config = FILE_TYPE_CONFIG[type];

  // Check file size
  if (file.size > config.maxSize) {
    return {
      isValid: false,
      error: `ファイルサイズが大きすぎます。最大${formatFileSize(config.maxSize)}まで対応しています。`,
    };
  }

  // Check MIME type and extension
  const fileName = file.name.toLowerCase();
  const isMimeValid = config.mimeTypes.some((mimeType) => file.type.startsWith(mimeType));
  const isExtValid = config.extensions.length === 0 || config.extensions.some((ext) => fileName.endsWith(ext));

  if (!isMimeValid && !isExtValid) {
    return {
      isValid: false,
      error: `サポートされていないファイル形式です。${config.displayName}のみアップロード可能です。`,
    };
  }

  return { isValid: true };
};

/**
 * Create preview URL for supported file types
 */
export const createPreviewUrl = (file: File, type: FilePreviewType): string | undefined => {
  if (type === 'image' || type === 'video') {
    return URL.createObjectURL(file);
  }
  return undefined;
};

/**
 * Convert File to PreviewFile with validation
 */
export const createPreviewFile = (file: File): PreviewFile => {
  const type = detectFileType(file);
  const validation = validateFile(file, type);
  const previewUrl = createPreviewUrl(file, type);

  return {
    id: `${file.name}-${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0]}`,
    file,
    type,
    previewUrl,
    status: validation.isValid ? 'pending' : 'error',
    error: validation.error,
    metadata: {
      size: file.size,
      lastModified: file.lastModified,
      formattedSize: formatFileSize(file.size),
      extension: file.name.split('.').pop()?.toUpperCase() || '',
    },
  };
};

/**
 * Group preview files by type
 */
export const groupFilesByType = (files: PreviewFile[]): FilePreviewGroup[] => {
  const groups = new Map<FilePreviewType, PreviewFile[]>();

  files.forEach((file) => {
    const existing = groups.get(file.type) || [];
    groups.set(file.type, [...existing, file]);
  });

  return Array.from(groups.entries()).map(([type, files]) => ({
    type,
    files,
    displayName: FILE_TYPE_CONFIG[type].displayName,
  }));
};

/**
 * Calculate total size and count for confirmation
 */
export const calculateUploadSummary = (files: PreviewFile[]) => {
  const validFiles = files.filter((f) => f.status !== 'error');
  const totalSize = validFiles.reduce((sum, f) => sum + f.file.size, 0);

  return {
    totalCount: validFiles.length,
    totalSize,
    formattedTotalSize: formatFileSize(totalSize),
    hasErrors: files.some((f) => f.status === 'error'),
    errorCount: files.filter((f) => f.status === 'error').length,
  };
};

/**
 * Clean up preview URLs to prevent memory leaks
 */
export const cleanupPreviewUrls = (files: PreviewFile[]): void => {
  files.forEach((file) => {
    if (file.previewUrl) {
      URL.revokeObjectURL(file.previewUrl);
    }
  });
};

/**
 * Convert FolderGroup structure to PreviewFile array for unified preview system
 */
export const convertFolderGroupsToPreviewFiles = (folderGroups: FolderGroup[]): PreviewFile[] => {
  const previewFiles: PreviewFile[] = [];

  for (const folder of folderGroups) {
    // Process all file types in the folder
    const allMediaFiles = [...folder.mediaFiles, ...folder.pptxFiles, ...folder.documentFiles];

    for (const mediaFile of allMediaFiles) {
      const previewFile = createPreviewFile(mediaFile.file);
      // Add folder information
      previewFile.folderPath = folder.folderPath;
      previewFile.folderName = folder.folderName;
      previewFile.relativePath = mediaFile.relativePath;
      previewFiles.push(previewFile);
    }
  }

  return previewFiles;
};

/**
 * Group preview files by folder first, then by file type
 */
export const groupFilesByFolderAndType = (files: PreviewFile[]): import('@/types/filePreview').FolderFileGroup[] => {
  const folderMap = new Map<string, PreviewFile[]>();

  files.forEach((file) => {
    const key = file.folderPath || 'root';
    const existing = folderMap.get(key) || [];
    folderMap.set(key, [...existing, file]);
  });

  return Array.from(folderMap.entries()).map(([folderPath, folderFiles]) => ({
    folderPath,
    folderName: folderFiles[0]?.folderName || 'Root',
    fileGroups: groupFilesByType(folderFiles), // Reuse existing type grouping
    totalFiles: folderFiles.length,
  }));
};

/**
 * Extract folder structure information from preview files for upload confirmation
 */
export const extractFolderStructure = (
  files: PreviewFile[],
): Record<
  string,
  {
    mediaFiles: PreviewFile[];
    pptxFiles: PreviewFile[];
    documentFiles: PreviewFile[];
  }
> => {
  const structure: Record<
    string,
    {
      mediaFiles: PreviewFile[];
      pptxFiles: PreviewFile[];
      documentFiles: PreviewFile[];
    }
  > = {};

  files.forEach((file) => {
    const folderPath = file.folderPath || 'root';

    if (!structure[folderPath]) {
      structure[folderPath] = {
        mediaFiles: [],
        pptxFiles: [],
        documentFiles: [],
      };
    }

    // Categorize by file type
    if (file.type === 'image' || file.type === 'video') {
      structure[folderPath].mediaFiles.push(file);
    } else if (file.type === 'pptx') {
      structure[folderPath].pptxFiles.push(file);
    } else if (file.type === 'document') {
      structure[folderPath].documentFiles.push(file);
    }
  });

  return structure;
};
