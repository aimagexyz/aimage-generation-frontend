// 导入字体注册（自动执行注册）
import './components/fonts';

import { pdf } from '@react-pdf/renderer';
import React from 'react';

import { PDFDocument } from './components';
import { PDFDataFetcher } from './dataFetcher';
import type { PDFExportOptions, PDFTaskData } from './types';

/**
 * 主PDF导出服务
 * 单一职责: 协调PDF生成流程
 */
export class PDFExportService {
  /**
   * 导出任务为PDF
   * KISS: 简单的导出流程
   */
  static async exportTaskToPDF(options: PDFExportOptions): Promise<void> {
    try {
      // 1. 验证任务访问权限
      const canAccess = await PDFDataFetcher.validateTaskAccess(options.taskId);
      if (!canAccess) {
        throw new Error('タスクにアクセスできません。権限を確認してください。');
      }

      // 2. 获取任务数据
      const taskData = await PDFDataFetcher.fetchTaskDataForPDF(options);

      // 3. 生成PDF
      const pdfBlob = await this.generatePDF(taskData);

      // 4. 下载PDF
      this.downloadPDF(pdfBlob, `${taskData.task.tid}_${taskData.task.name}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      throw error;
    }
  }

  /**
   * 生成PDF文档
   */
  private static async generatePDF(taskData: PDFTaskData): Promise<Blob> {
    const pdfDocument = React.createElement(PDFDocument, { taskData });
    const pdfBlob = await pdf(pdfDocument as React.ReactElement).toBlob();
    return pdfBlob;
  }

  /**
   * 下载PDF文件
   */
  private static downloadPDF(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 获取默认导出选项
   * SOLID: 提供合理的默认值
   */
  static getDefaultOptions(taskId: string): PDFExportOptions {
    return {
      taskId,
      includeComments: true,
      includeSolvedAnnotations: false,
      imageQuality: 'medium',
    };
  }
}

// 便捷导出函数
export const exportTaskToPDF = PDFExportService.exportTaskToPDF.bind(PDFExportService);
export const getDefaultPDFOptions = PDFExportService.getDefaultOptions.bind(PDFExportService);

// 导出服务
export { PDFPreviewService } from './previewService';

// Video PDF Services (DRY: 扩展现有服务)
export { VideoFrameService } from './videoFrameService';

// 导出类型
export type { AnnotationDetail, PDFExportOptions, PDFTaskData, SubtaskDetail, TaskDetail } from './types';

// Video PDF Types
export type { VideoFrameData, VideoFrameExtractionResult, VideoPDFExportOptions, VideoValidationResult } from './types';
