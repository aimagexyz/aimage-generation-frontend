import { Image, Text, View } from '@react-pdf/renderer';

import { pdfStyles } from './styles';

interface PDFImageProps {
  src: string;
  maxWidth?: number;
  maxHeight?: number;
  caption?: string;
}

/**
 * PDF图片组件
 * SOLID: 单一职责 - 负责在PDF中渲染图片
 */
export function PDFImage({ src, maxWidth = 500, maxHeight = 400, caption }: PDFImageProps) {
  // 处理图片URL，确保是完整的URL
  const getImageSrc = (imageSrc: string): string => {
    // 如果已经是完整URL（包括signed URL），直接返回
    if (imageSrc.startsWith('http')) {
      return imageSrc;
    }
    // 对于s3路径，需要通过API获取signed URL
    // 在PDF生成时，这个URL应该已经被预先解析好了
    console.warn('PDFImage received non-HTTP URL:', imageSrc);
    return imageSrc;
  };

  return (
    <View style={pdfStyles.imageContainer}>
      <Image
        src={getImageSrc(src)}
        style={{
          ...pdfStyles.image,
          maxWidth,
          maxHeight,
        }}
      />
      {caption && (
        <View style={{ marginTop: 5 }}>
          <Text style={pdfStyles.imageCaption}>{caption}</Text>
        </View>
      )}
    </View>
  );
}
