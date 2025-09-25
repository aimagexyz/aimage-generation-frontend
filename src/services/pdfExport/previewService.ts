import { pdf } from '@react-pdf/renderer';
import React from 'react';

import { PDFDocument } from './components';
import { PDFDataFetcher } from './dataFetcher';
import type { PDFExportOptions, PDFTaskData, SubtaskDetail } from './types';
import { VideoFrameService } from './videoFrameService';

/**
 * PDF Preview Service
 * SOLID: Single responsibility for PDF preview generation
 * KISS: Simple, focused API for preview functionality
 */
export class PDFPreviewService {
  /**
   * Generate PDF blob for preview
   * SOLID: Single responsibility - only generates preview blob
   */
  static async generatePreviewPDF(options: PDFExportOptions): Promise<Blob> {
    try {
      // 1. Validate task access (reuse existing validation)
      const canAccess = await PDFDataFetcher.validateTaskAccess(options.taskId);
      if (!canAccess) {
        throw new Error('タスクにアクセスできません。権限を確認してください。');
      }

      // 2. Fetch task data (DRY: reuse existing data fetcher)
      const taskData = await PDFDataFetcher.fetchTaskDataForPDF(options);

      // 3. Generate PDF blob
      const pdfBlob = await this.createPDFBlob(taskData);

      return pdfBlob;
    } catch (error) {
      console.error('PDF preview generation failed:', error);
      throw error instanceof Error ? error : new Error('PDF プレビューの生成に失敗しました。');
    }
  }

  /**
   * Generate PDF data URL for iframe display
   * KISS: Simple conversion from blob to data URL
   */
  static async generatePreviewDataURL(options: PDFExportOptions): Promise<string> {
    try {
      const blob = await this.generatePreviewPDF(options);
      const dataURL = URL.createObjectURL(blob);
      return dataURL;
    } catch (error) {
      console.error('PDF preview data URL generation failed:', error);
      throw error instanceof Error ? error : new Error('PDF プレビュー URL の生成に失敗しました。');
    }
  }

  /**
   * Validate preview generation prerequisites
   * SOLID: Single responsibility for validation
   */
  static async validatePreviewGeneration(taskId: string): Promise<boolean> {
    try {
      // Reuse existing validation logic (DRY principle)
      return await PDFDataFetcher.validateTaskAccess(taskId);
    } catch (error) {
      console.error(`Preview validation failed for task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Create PDF blob from task data
   * SOLID: Single responsibility for PDF blob creation
   * DRY: Reuse existing PDF document generation logic
   */
  private static async createPDFBlob(taskData: PDFTaskData): Promise<Blob> {
    try {
      // Reuse existing PDFDocument component (DRY principle)
      const pdfDocument = React.createElement(PDFDocument, { taskData });
      const pdfBlob = await pdf(pdfDocument as React.ReactElement).toBlob();
      return pdfBlob;
    } catch (error) {
      console.error('PDF blob creation failed:', error);
      throw new Error('PDF の生成に失敗しました。');
    }
  }

  /**
   * Clean up data URL to prevent memory leaks
   * KISS: Simple cleanup utility
   */
  static cleanupDataURL(dataURL: string): void {
    try {
      URL.revokeObjectURL(dataURL);
    } catch (error) {
      console.warn('Failed to cleanup PDF data URL:', error);
    }
  }

  /**
   * Estimate PDF generation time based on task complexity
   * SOLID: Single responsibility for estimation
   */
  static estimateGenerationTime(taskData: PDFTaskData): number {
    // Simple estimation based on subtask count and annotations
    const baseTime = 1000; // 1 second base
    const subtaskTime = taskData.subtasks.length * 200; // 200ms per subtask
    const annotationTime = Object.values(taskData.annotations).flat().length * 50; // 50ms per annotation

    return Math.min(baseTime + subtaskTime + annotationTime, 10000); // Max 10 seconds
  }

  /**
   * Generate PDF preview for video subtasks
   * DRY: Reuses existing PDF generation pipeline
   */
  static async generateVideoPreviewPDF(subtask: SubtaskDetail, options: PDFExportOptions): Promise<Blob> {
    try {
      // 1. Validate video format support
      if (!subtask.content?.s3_path || !VideoFrameService.isVideoFormatSupported(subtask.content.s3_path)) {
        throw new Error('サポートされていないビデオ形式です。');
      }

      // 2. Validate video access
      const canAccessVideo = await VideoFrameService.validateVideoAccess(subtask.content.s3_path);
      if (!canAccessVideo) {
        throw new Error('ビデオファイルにアクセスできません。');
      }

      // 3. Use existing task data fetching (DRY principle)
      const taskData = await PDFDataFetcher.fetchTaskDataForPDF(options);

      // 4. Generate PDF blob using existing logic
      const pdfBlob = await this.createPDFBlob(taskData);

      return pdfBlob;
    } catch (error) {
      console.error('Video PDF preview generation failed:', error);
      throw error instanceof Error ? error : new Error('ビデオ PDF プレビューの生成に失敗しました。');
    }
  }

  /**
   * Validate video annotation prerequisites
   * SOLID: Single responsibility for video validation
   */
  static async validateVideoAnnotationPreview(subtask: SubtaskDetail): Promise<boolean> {
    try {
      // Check if subtask has video content
      if (!subtask.content?.s3_path) {
        return false;
      }

      // Check if video format is supported
      if (!VideoFrameService.isVideoFormatSupported(subtask.content.s3_path)) {
        return false;
      }

      // Check if there are annotations with timestamps
      const hasTimestampAnnotations = subtask.annotations?.some(
        (ann) => ann.start_at !== undefined && ann.start_at !== null,
      );

      if (!hasTimestampAnnotations) {
        return false;
      }

      // Validate video access
      return await VideoFrameService.validateVideoAccess(subtask.content.s3_path);
    } catch (error) {
      console.error('Video annotation preview validation failed:', error);
      return false;
    }
  }

  /**
   * Estimate video PDF generation time
   * SOLID: Single responsibility for video-specific estimation
   */
  static estimateVideoGenerationTime(subtask: SubtaskDetail): number {
    if (!subtask.annotations) {
      return 1000; // Base time
    }

    // Count unique timestamps for frame extraction
    const timestamps = new Set(
      subtask.annotations
        .filter((ann) => ann.start_at !== undefined && ann.start_at !== null)
        .map((ann) => ann.start_at!),
    );

    const baseTime = 2000; // 2 seconds base for video processing
    const frameExtractionTime = timestamps.size * 500; // 500ms per frame
    const annotationTime = subtask.annotations.length * 50; // 50ms per annotation

    return Math.min(baseTime + frameExtractionTime + annotationTime, 15000); // Max 15 seconds
  }
}
