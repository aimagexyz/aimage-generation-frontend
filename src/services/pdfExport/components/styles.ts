import './fonts'; // Initialize fonts

import { StyleSheet } from '@react-pdf/renderer';

/**
 * PDF样式定义
 * KISS: 简单清晰的样式定义
 */
export const pdfStyles = StyleSheet.create({
  // 页面样式
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20,
    fontSize: 10,
    fontFamily: 'BIZUDPGothic', // Use BIZ UDPGothic for Japanese text
  },

  // 标题页样式
  titlePage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666666',
  },

  // 头部样式
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
  },

  headerLeft: {
    flex: 1,
  },

  headerRight: {
    textAlign: 'right',
    fontSize: 8,
    color: '#666666',
  },

  // 任务信息样式
  taskInfo: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 4,
  },

  taskTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },

  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#666666',
    marginBottom: 5,
  },

  taskDescription: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#333333',
  },

  // 子任务样式
  subtaskContainer: {
    marginBottom: 20,
    pageBreakInside: false,
  },

  subtaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DDDDDD',
  },

  subtaskTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },

  subtaskMeta: {
    fontSize: 8,
    color: '#666666',
  },

  // 图片样式
  imageContainer: {
    marginBottom: 10,
    alignItems: 'center',
  },

  image: {
    maxWidth: '100%',
    maxHeight: 300,
    objectFit: 'contain',
  },

  imageCaption: {
    fontSize: 8,
    color: '#666666',
    marginTop: 5,
    textAlign: 'center',
  },

  // Annotation样式
  annotationsSection: {
    marginTop: 10,
  },

  annotationsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333333',
  },

  annotationItem: {
    flexDirection: 'row',
    marginBottom: 8,
    padding: 6,
    backgroundColor: '#FFF9E6',
    borderRadius: 3,
  },

  annotationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B6B',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  annotationMarkerText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  annotationContent: {
    flex: 1,
  },

  annotationText: {
    fontSize: 9,
    lineHeight: 1.3,
    marginBottom: 2,
  },

  annotationMeta: {
    fontSize: 7,
    color: '#666666',
  },

  // 页脚样式
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    textAlign: 'center',
    fontSize: 8,
    color: '#666666',
    borderTopWidth: 0.5,
    borderTopColor: '#CCCCCC',
    paddingTop: 5,
  },

  // 工具样式
  flexRow: {
    flexDirection: 'row',
  },

  flexColumn: {
    flexDirection: 'column',
  },

  textCenter: {
    textAlign: 'center',
  },

  textRight: {
    textAlign: 'right',
  },

  marginBottom: {
    marginBottom: 10,
  },

  // 状态样式
  statusBadge: {
    padding: 3,
    borderRadius: 2,
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 40,
  },

  statusCompleted: {
    backgroundColor: '#D4EDDA',
    color: '#155724',
  },

  statusPending: {
    backgroundColor: '#FFF3CD',
    color: '#856404',
  },

  statusInProgress: {
    backgroundColor: '#CCE5FF',
    color: '#004085',
  },
});
