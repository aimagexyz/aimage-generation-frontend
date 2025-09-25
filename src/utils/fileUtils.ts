/**
 * Check if a file is an Adobe Illustrator file
 */
export const isAiFile = (file: File | { name: string }): boolean => {
  return file.name.toLowerCase().endsWith('.ai');
};

/**
 * Check if a file is a Photoshop file
 */
export const isPsdFile = (file: File | { name: string }): boolean => {
  return file.name.toLowerCase().endsWith('.psd');
};

/**
 * Check if a file is a special image format that can't be previewed in browser
 */
export const isSpecialImageFile = (file: File | { name: string }): boolean => {
  return isAiFile(file);
};

/**
 * Get the file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return '';
  }
  return filename.substring(lastDot + 1).toUpperCase();
};

/**
 * Get display name for file (truncate if too long)
 */
export const getFileDisplayName = (filename: string, maxLength: number = 20): string => {
  if (filename.length <= maxLength) {
    return filename;
  }

  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    // No extension, just truncate the name
    return filename.substring(0, maxLength - 3) + '...';
  }

  const extension = filename.substring(lastDotIndex); // includes the dot
  const nameWithoutExt = filename.substring(0, lastDotIndex);

  // Reserve space for extension and ellipsis with space
  const availableSpace = maxLength - extension.length - 4; // 3 for "..." and 1 for space

  if (availableSpace <= 0) {
    // If extension is too long, just show the extension
    return extension;
  }

  const truncatedName = nameWithoutExt.substring(0, availableSpace) + '...';

  return `${truncatedName} ${extension}`;
};
