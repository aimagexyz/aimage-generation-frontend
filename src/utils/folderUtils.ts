// 文件类型检测
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/');
};

// PPTX文件类型检测
export const isPptxFile = (file: File): boolean => {
  return (
    file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    file.name.toLowerCase().endsWith('.pptx')
  );
};

// 文档文件类型检测（支持的文档类型）
export const isDocumentFile = (file: File): boolean => {
  const supportedMimeTypes = [
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/plain', // .txt
    'text/csv', // .csv
  ];

  const supportedExtensions = ['.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'];
  const fileName = file.name.toLowerCase();

  return supportedMimeTypes.includes(file.type) || supportedExtensions.some((ext) => fileName.endsWith(ext));
};

export const isMediaFile = (file: File): boolean => {
  return isImageFile(file) || isVideoFile(file);
};

// 检测文件是否为支持的类型
export const isSupportedFile = (file: File): boolean => {
  return isMediaFile(file) || isPptxFile(file) || isDocumentFile(file);
};

// 扩展File接口以包含webkitRelativePath属性
interface ExtendedFile extends Omit<File, 'webkitRelativePath'> {
  webkitRelativePath?: string;
}

// 文件夹结构定义
export interface MediaFile {
  file: File;
  relativePath: string;
  fileName: string;
}

export interface FolderGroup {
  folderName: string;
  folderPath: string;
  mediaFiles: MediaFile[];
  pptxFiles: MediaFile[];
  documentFiles: MediaFile[];
}

// 从文件路径中提取文件夹路径
const getFileDirectory = (relativePath: string): string => {
  const pathParts = relativePath.split('/');
  // 移除文件名，保留文件夹路径
  return pathParts.slice(0, -1).join('/');
};

// 从文件路径中提取完整的文件夹层级路径
const getFullFolderPath = (relativePath: string): string => {
  const pathParts = relativePath.split('/');
  // 移除文件名
  const folderParts = pathParts.slice(0, -1);
  // 返回完整的文件夹路径，用 '/' 连接各层级
  return folderParts.length > 0 ? folderParts.join('/') : 'Root';
};

// 解析文件夹结构，按包含支持文件的最深文件夹分组
export const parseFolderStructure = (files: FileList): FolderGroup[] => {
  const allFiles: MediaFile[] = [];

  // 首先筛选出所有支持的文件
  Array.from(files).forEach((file) => {
    if (isSupportedFile(file)) {
      const extendedFile = file as ExtendedFile;
      const relativePath = extendedFile.webkitRelativePath || file.name;
      const fileItem: MediaFile = {
        file,
        relativePath,
        fileName: file.name,
      };
      allFiles.push(fileItem);
    }
  });

  // 按文件夹路径分组
  const folderMap = new Map<
    string,
    {
      mediaFiles: MediaFile[];
      pptxFiles: MediaFile[];
      documentFiles: MediaFile[];
    }
  >();

  allFiles.forEach((fileItem) => {
    const folderPath = getFileDirectory(fileItem.relativePath);

    if (!folderMap.has(folderPath)) {
      folderMap.set(folderPath, {
        mediaFiles: [],
        pptxFiles: [],
        documentFiles: [],
      });
    }

    const folderFiles = folderMap.get(folderPath)!;

    // 根据文件类型分类
    if (isMediaFile(fileItem.file)) {
      folderFiles.mediaFiles.push(fileItem);
    } else if (isPptxFile(fileItem.file)) {
      folderFiles.pptxFiles.push(fileItem);
    } else if (isDocumentFile(fileItem.file)) {
      folderFiles.documentFiles.push(fileItem);
    }
  });

  // 转换为FolderGroup数组
  const folderGroups: FolderGroup[] = [];

  folderMap.forEach((files, folderPath) => {
    // 获取任意一个文件来生成文件夹名称
    const firstFile = files.mediaFiles[0] || files.pptxFiles[0] || files.documentFiles[0];
    if (firstFile) {
      const folderName = getFullFolderPath(firstFile.relativePath);
      folderGroups.push({
        folderName,
        folderPath,
        mediaFiles: files.mediaFiles,
        pptxFiles: files.pptxFiles,
        documentFiles: files.documentFiles,
      });
    }
  });

  // 按文件夹名排序
  folderGroups.sort((a, b) => a.folderName.localeCompare(b.folderName));

  return folderGroups;
};

// 生成Task名称
export const generateTaskName = (folderName: string): string => {
  return folderName;
};

// 生成Subtask名称
export const generateSubtaskName = (fileName: string): string => {
  // 移除文件扩展名
  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, '');
  return nameWithoutExtension;
};
