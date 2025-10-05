import { Document, Page, Text, View } from '@react-pdf/renderer';

import { type PDFTaskData } from '../types';
import { PDFHeader } from './PDFHeader';
import { PDFTitlePage } from './PDFTitlePage';
import { pdfStyles } from './styles';
import { SubtaskPage } from './SubtaskPage';

interface PDFDocumentProps {
  taskData: PDFTaskData;
}

/**
 * 主PDF文档组件
 * SOLID: 单一职责 - 负责文档整体结构
 */
export function PDFDocument({ taskData }: PDFDocumentProps) {
  const { task, subtasks } = taskData;

  return (
    <Document
      title={`${task.tid} - ${task.name}`}
      author="AI Mage Supervision System"
      subject="Task Export"
      creator="AI Mage Supervision Frontend"
    >
      {/* 标题页 */}
      <PDFTitlePage task={task} />

      {/* 子任务页面 */}
      {subtasks.map((subtask, index) => (
        <SubtaskPage
          key={subtask.id}
          subtask={subtask}
          taskInfo={task}
          pageNumber={index + 2} // 标题页是第1页
          totalPages={subtasks.length + 1}
        />
      ))}

      {/* 如果没有子任务，显示空白页 */}
      {subtasks.length === 0 && (
        <Page size="A4" style={pdfStyles.page}>
          <PDFHeader task={task} pageNumber={2} totalPages={2} />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#666666' }}>このタスクには子タスクがありません</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
