import { Text, View } from '@react-pdf/renderer';

import { pdfStyles } from './styles';

interface PDFAnnotationProps {
  annotation: {
    id: string;
    text: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    type?: string;
    created_at?: string;
    user_name?: string;
  };
  index: number;
}

/**
 * PDF Annotation组件
 * SOLID: 单一职责 - 负责在PDF中渲染单个annotation
 */
export function PDFAnnotation({ annotation, index }: PDFAnnotationProps) {
  const formatCoordinates = (x: number, y: number, width?: number, height?: number): string => {
    const coords = [`(${x.toFixed(0)}, ${y.toFixed(0)})`];
    if (width && height) {
      coords.push(`${width.toFixed(0)}×${height.toFixed(0)}`);
    }
    return coords.join(' ');
  };

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) {
      return '';
    }
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.warn('Failed to format date:', error);
      return '';
    }
  };

  return (
    <View style={pdfStyles.annotationItem}>
      {/* Annotation标记 */}
      <View style={pdfStyles.annotationMarker}>
        <Text style={pdfStyles.annotationMarkerText}>{(index + 1).toString()}</Text>
      </View>

      {/* Annotation内容 */}
      <View style={pdfStyles.annotationContent}>
        <Text style={pdfStyles.annotationText}>{annotation.text}</Text>

        <View style={pdfStyles.flexRow}>
          <Text style={pdfStyles.annotationMeta}>
            座標: {formatCoordinates(annotation.x, annotation.y, annotation.width, annotation.height)}
          </Text>

          {annotation.type && (
            <Text style={[pdfStyles.annotationMeta, { marginLeft: 10 }]}>タイプ: {annotation.type}</Text>
          )}
        </View>

        {(annotation.created_at || annotation.user_name) && (
          <View style={pdfStyles.flexRow}>
            {annotation.user_name && <Text style={pdfStyles.annotationMeta}>作成者: {annotation.user_name}</Text>}
            {annotation.created_at && (
              <Text style={[pdfStyles.annotationMeta, { marginLeft: 10 }]}>
                作成日: {formatDateTime(annotation.created_at)}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

interface PDFAnnotationListProps {
  annotations: PDFAnnotationProps['annotation'][];
  title?: string;
}

/**
 * PDF Annotation一覧表示コンポーネント
 * DRY: 複数のannotationを統一的に表示
 */
export function PDFAnnotationList({ annotations, title = 'アノテーション' }: PDFAnnotationListProps) {
  if (!annotations || annotations.length === 0) {
    return null;
  }

  return (
    <View style={pdfStyles.annotationsSection}>
      <Text style={pdfStyles.annotationsTitle}>
        {title} ({annotations.length}件)
      </Text>

      {annotations.map((annotation, index) => (
        <PDFAnnotation key={annotation.id} annotation={annotation} index={index} />
      ))}
    </View>
  );
}
