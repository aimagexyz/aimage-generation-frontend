import { Text, View } from '@react-pdf/renderer';

import { type TaskDetail } from '../types';
import { pdfStyles } from './styles';

interface PDFHeaderProps {
  task: TaskDetail;
  pageNumber: number;
  totalPages: number;
}

/**
 * PDF页面头部组件
 * DRY: 可重用的头部组件
 */
export function PDFHeader({ task, pageNumber, totalPages }: PDFHeaderProps) {
  return (
    <View style={pdfStyles.header}>
      <View style={pdfStyles.headerLeft}>
        <Text style={{ fontSize: 12, fontWeight: 'bold' }}>
          {task.tid} - {task.name}
        </Text>
      </View>
      <View style={pdfStyles.headerRight}>
        <Text>
          {pageNumber} / {totalPages}
        </Text>
      </View>
    </View>
  );
}
