// PDF组件导出
// DRY: 统一的导出点，便于管理和重用

export { PDFAnnotation, PDFAnnotationList } from './PDFAnnotation';
export { PDFDocument } from './PDFDocument';
export { PDFHeader } from './PDFHeader';
export { PDFImage } from './PDFImage';
export { PDFTitlePage } from './PDFTitlePage';
export { pdfStyles } from './styles';
export { SubtaskPage } from './SubtaskPage';

// Video PDF Components (KISS: 简单的视频PDF组件)
export { VideoFramePage } from './VideoFramePage';
export { VideoFramePages } from './VideoFramePages';

// 字体相关导出
export { getJapaneseFont, isFontLoaded } from './fonts';
