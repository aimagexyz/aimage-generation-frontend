import { Page, Text, View } from '@react-pdf/renderer';

import { type SubtaskDetail, type TaskDetail } from '../types';
import { PDFAnnotationList } from './PDFAnnotation';
import { PDFHeader } from './PDFHeader';
import { PDFImage } from './PDFImage';
import { pdfStyles } from './styles';
import { VideoFramePages } from './VideoFramePages';

interface SubtaskPageProps {
  subtask: SubtaskDetail;
  taskInfo: TaskDetail;
  pageNumber: number;
  totalPages: number;
}

/**
 * 子任务页面组件
 * SOLID: 单一职责 - 负责单个子任务的页面渲染
 */
export function SubtaskPage({ subtask, taskInfo, pageNumber, totalPages }: SubtaskPageProps) {
  const formatDate = (dateString: string): string => {
    if (!dateString) {
      return '-';
    }
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusText = (status: string | null) => {
    if (!status) {
      return '未設定';
    }
    switch (status) {
      case 'completed':
        return '完了';
      case 'in_progress':
        return '進行中';
      case 'pending':
        return '待機中';
      default:
        return status;
    }
  };

  const getStatusStyle = (status: string | null) => {
    if (!status) {
      return [pdfStyles.statusBadge, pdfStyles.statusPending];
    }
    switch (status) {
      case 'completed':
        return [pdfStyles.statusBadge, pdfStyles.statusCompleted];
      case 'in_progress':
        return [pdfStyles.statusBadge, pdfStyles.statusInProgress];
      case 'pending':
        return [pdfStyles.statusBadge, pdfStyles.statusPending];
      default:
        return [pdfStyles.statusBadge, pdfStyles.statusPending];
    }
  };

  return (
    <Page size="A4" style={pdfStyles.page}>
      {/* 页面头部 */}
      <PDFHeader task={taskInfo} pageNumber={pageNumber} totalPages={totalPages} />

      {/* 子任务信息 */}
      <View style={pdfStyles.subtaskContainer}>
        <View style={pdfStyles.subtaskHeader}>
          <Text style={pdfStyles.subtaskTitle}>子タスク: {subtask.name}</Text>
          <View style={getStatusStyle(subtask.status)}>
            <Text>{getStatusText(subtask.status)}</Text>
          </View>
        </View>

        <View style={pdfStyles.subtaskMeta}>
          <Text>ID: {subtask.id}</Text>
          <Text>作成日: {formatDate(subtask.created_at)}</Text>
          <Text>更新日: {formatDate(subtask.updated_at)}</Text>
        </View>

        {/* 子任务描述 */}
        {subtask.description && (
          <View style={pdfStyles.marginBottom}>
            <Text style={pdfStyles.taskDescription}>{subtask.description}</Text>
          </View>
        )}

        {/* 内容显示 - 根据任务类型显示图片或视频帧 (DRY: 复用现有逻辑) */}
        {subtask.task_type === 'picture' && subtask.content?.s3_path && (
          <View style={pdfStyles.marginBottom}>
            <PDFImage
              src={subtask.content.s3_path}
              caption={`子タスク画像: ${subtask.name}`}
              maxWidth={500}
              maxHeight={300}
            />
          </View>
        )}

        {/* Video content - 使用新的VideoFramePages组件 (KISS: 简单的条件渲染) */}
        {subtask.task_type === 'video' && subtask.content?.s3_path && (
          <VideoFramePages
            videoUrl={subtask.content.s3_path}
            annotations={subtask.annotations || []}
            subtaskInfo={subtask}
            taskInfo={taskInfo}
          />
        )}

        {/* 注释部分 - 仅对非视频任务显示 (视频任务的注释在frame中显示) */}
        {subtask.task_type !== 'video' && subtask.annotations && subtask.annotations.length > 0 && (
          <PDFAnnotationList
            annotations={subtask.annotations.map((annotation) => ({
              id: annotation.id,
              text: annotation.text,
              x: annotation.rect?.x || 0,
              y: annotation.rect?.y || 0,
              width: annotation.rect?.width,
              height: annotation.rect?.height,
              type: annotation.type || undefined,
              created_at: annotation.timestamp || undefined,
              user_name: annotation.author || undefined,
            }))}
            title="注釈"
          />
        )}

        {/* 如果没有注释，显示占位符 (DRY: 复用占位符逻辑) */}
        {subtask.task_type !== 'video' && (!subtask.annotations || subtask.annotations.length === 0) && (
          <View style={{ marginTop: 20, padding: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: '#999999' }}>この子タスクには注釈がありません</Text>
          </View>
        )}

        {/* Video任务特殊情况：没有带时间戳的注释 */}
        {subtask.task_type === 'video' &&
          subtask.content?.s3_path &&
          (!subtask.annotations ||
            subtask.annotations.length === 0 ||
            !subtask.annotations.some((ann) => ann.start_at !== undefined && ann.start_at !== null)) && (
            <View style={{ marginTop: 20, padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: '#999999' }}>このビデオ子タスクには時間ベースの注釈がありません</Text>
            </View>
          )}
      </View>

      {/* 页脚 */}
      <Text style={pdfStyles.footer}>
        AI Mage Supervision System - Generated on {new Date().toLocaleDateString('ja-JP')}
      </Text>
    </Page>
  );
}
